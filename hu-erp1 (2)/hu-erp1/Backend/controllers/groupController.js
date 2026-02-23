import Group from "../models/Group.js";

const WEEKDAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import Course from "../models/Course.js";
import Student from "../models/Student.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const mapRoutineToObject = (routineMap) => {
  const result = {};
  if (!routineMap) return result;

  if (routineMap instanceof Map) {
    for (const [day, lectureMap] of routineMap.entries()) {
      result[day] = {};
      if (lectureMap instanceof Map) {
        for (const [lecNum, detail] of lectureMap.entries()) {
          result[day][lecNum] = detail;
        }
      } else if (lectureMap && typeof lectureMap === "object") {
        Object.assign(result[day], lectureMap);
      }
      if (Object.keys(result[day]).length === 0) delete result[day];
    }
    return result;
  }

  if (typeof routineMap === "object") return { ...routineMap };
  return result;
};

const mapScheduleToObject = (scheduleSlots) => {
  const result = {};
  if (!scheduleSlots) return result;

  if (scheduleSlots instanceof Map) {
    for (const [day, lectureMap] of scheduleSlots.entries()) {
      result[day] = {};
      if (lectureMap instanceof Map) {
        for (const [lecNum, courseId] of lectureMap.entries()) {
          result[day][lecNum] = String(courseId);
        }
      } else if (lectureMap && typeof lectureMap === "object") {
        Object.entries(lectureMap).forEach(([lecNum, courseId]) => {
          result[day][lecNum] = String(courseId);
        });
      }
      if (Object.keys(result[day]).length === 0) delete result[day];
    }
    return result;
  }

  if (typeof scheduleSlots === "object") {
    for (const [day, lectureMap] of Object.entries(scheduleSlots)) {
      if (!lectureMap || typeof lectureMap !== "object") continue;
      result[day] = {};
      Object.entries(lectureMap).forEach(([lecNum, courseId]) => {
        if (courseId) result[day][lecNum] = String(courseId);
      });
      if (Object.keys(result[day]).length === 0) delete result[day];
    }
  }

  return result;
};

const upsertCourseFacultyPair = (courseFaculty = [], courseId, facultyId) => {
  if (!courseId || !facultyId) return courseFaculty;
  const cId = String(courseId);
  const fId = String(facultyId);
  const exists = courseFaculty.some(
    (cf) => String(cf.course) === cId && String(cf.faculty) === fId
  );
  if (exists) return courseFaculty;
  return [...courseFaculty, { course: cId, faculty: fId }];
};

const collectCourseIdsFromSchedule = (scheduleSlots) => {
  const scheduleObj = mapScheduleToObject(scheduleSlots);
  const ids = new Set();

  Object.values(scheduleObj).forEach((lectures = {}) => {
    Object.values(lectures).forEach((courseId) => {
      if (courseId) ids.add(String(courseId));
    });
  });

  return ids;
};

const syncGroupCourseIdsFromSchedule = (group) => {
  // Keep courseIds aligned with current timetable entries.
  // This replaces stale IDs when a lecture course is edited.
  const fromSchedule = collectCourseIdsFromSchedule(group.scheduleSlots);
  group.courseIds = Array.from(fromSchedule);
};

const syncCourseFacultyIds = async (courseFaculty = []) => {
  if (!Array.isArray(courseFaculty) || courseFaculty.length === 0) return;
  const updateOps = courseFaculty.map((cf) =>
    Course.findByIdAndUpdate(cf.course, {
      $addToSet: { facultyIds: cf.faculty },
    })
  );
  await Promise.all(updateOps);
};

const syncFacultyRoutineFromGroup = async (group) => {
  if (!group?.department) return;

  const deptFaculties = await Faculty.find({ department: group.department });
  const scheduleObj = mapScheduleToObject(group.scheduleSlots);
  const courseToFaculty = {};

  (group.courseFaculty || []).forEach((cf) => {
    if (!cf?.course || !cf?.faculty) return;
    courseToFaculty[String(cf.course)] = String(cf.faculty);
  });

  for (const fac of deptFaculties) {
    const facultyId = String(fac._id);
    const existingRoutine = mapRoutineToObject(fac.routine);

    // Remove existing routine entries for this group first.
    for (const day of Object.keys(existingRoutine)) {
      const dayLectures = existingRoutine[day] || {};
      for (const [lectureNumber, detail] of Object.entries(dayLectures)) {
        if (String(detail?.group) === String(group._id)) {
          delete existingRoutine[day][lectureNumber];
        }
      }
      if (Object.keys(existingRoutine[day]).length === 0) delete existingRoutine[day];
    }

    // Add this group's timetable entries for this faculty.
    for (const [day, lectures] of Object.entries(scheduleObj)) {
      for (const [lectureNumber, courseId] of Object.entries(lectures)) {
        if (!courseId) continue;
        if (courseToFaculty[String(courseId)] !== facultyId) continue;
        if (!existingRoutine[day]) existingRoutine[day] = {};
        existingRoutine[day][lectureNumber] = {
          course: String(courseId),
          group: group._id,
        };
      }
    }

    const ordered = {};
    for (const day of WEEKDAY_ORDER) {
      if (existingRoutine[day] && Object.keys(existingRoutine[day]).length > 0) {
        ordered[day] = existingRoutine[day];
      }
    }

    fac.routine = ordered;
    await fac.save();
  }
};

const clearTimetableCache = async (groupId) => {
  await redisClient.del("admin:timetable:groups");
  await redisClient.del("admin:timetable:groups:v2");
  await redisClient.del(`admin:timetable:group:${groupId}`);
  await redisClient.del(`admin:timetable:group:v2:${groupId}`);
  await redisClient.del("admin:faculty:all");
};

/* ================= GET ALL GROUPS ================= */

export const getAllGroups = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:groups:all";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getAllGroups cache read failed:", err.message || err);
      }
    }

    const groups = await Group.find({ isDeleted: { $ne: true } })
      .populate("department")
      .populate({
        path: "coordinator",
        populate: { path: "user", select: "name email" },
      })
      .populate("courseIds")
      .populate({
        path: "studentIds",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "courseFaculty.course",
      })
      .populate({
        path: "courseFaculty.faculty",
        populate: { path: "user", select: "name email" },
      });

    const responsePayload = {
      message: "Groups fetched successfully",
      count: groups.length,
      groups,
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllGroups cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN TIMETABLE: GROUP CARDS ================= */

// GET /api/admin/timetable/group
// Returns minimal info needed to render group cards for timetable selection.
export const getTimetableGroups = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:timetable:groups:v2";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getTimetableGroups cache read failed:", err.message || err);
      }
    }

    const groups = await Group.find({ isDeleted: { $ne: true } })
      .select("name roomNo courseIds department")
      .populate({ path: "courseIds", select: "semester department code courseName branch credit facultyIds" })
      .populate({ path: "department", select: "name" });

    // Pre-compute number of students assigned to each group
    const studentCounts = await Student.aggregate([
      {
        $group: {
          _id: "$group",
          count: { $sum: 1 },
        },
      },
    ]);

    const studentCountMap = studentCounts.reduce((acc, doc) => {
      if (doc._id) {
        acc[doc._id.toString()] = doc.count;
      }
      return acc;
    }, {});

    const cards = await Promise.all(groups.map(async (group) => {
      let semester = null;
      if (group.courseIds && group.courseIds.length > 0) {
        const counts = {};
        group.courseIds.forEach((course) => {
          if (typeof course.semester === "number") {
            counts[course.semester] = (counts[course.semester] || 0) + 1;
          }
        });
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (entries.length > 0) {
          semester = Number(entries[0][0]);
        }
      }
      const studentCount = studentCountMap[group._id.toString()] || 0;
      // Get department id
      const departmentId = group.department?._id || group.department;
      let courses = [];
      if (departmentId) {
        const courseDocs = await Course.find({ department: departmentId, isDeleted: { $ne: true } });
        courses = courseDocs.map((c) => ({
          id: c._id,
          code: c.code,
          courseName: c.courseName,
        }));
      }
      let faculties = [];
      if (departmentId) {
        faculties = await Faculty.find({ department: departmentId, isDeleted: { $ne: true } });
      }
      return {
        id: group._id,
        groupCode: group.name,
        semester,
        roomNo: group.roomNo || null,
        studentCount,
        departmentId,
        departmentName: group.department?.name || null,
        courses,
        faculties,
      };
    }));

    const responsePayload = {
      message: "Timetable groups fetched successfully",
      count: cards.length,
      groups: cards,
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getTimetableGroups cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN TIMETABLE: GROUP WEEK VIEW ================= */

// GET /api/admin/timetable/group/:groupId
// Returns full week timetable for the given group with
// day -> lectures (lectureNumber, courseCode, courseName, facultyName).
export const getGroupTimetable = async (req, res) => {
  try {
    const { groupId } = req.params;
    const noCache = req.query.noCache === "true";
    const cacheKey = `admin:timetable:group:v2:${groupId}`;

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getGroupTimetable cache read failed:", err.message || err);
      }
    }

    const group = await Group.findById(groupId)
      .populate({
        path: "courseFaculty.course",
        select: "code courseName",
      })
      .populate({
        path: "courseFaculty.faculty",
        populate: { path: "user", select: "name" },
      });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const scheduleCourseIds = Array.from(collectCourseIdsFromSchedule(group.scheduleSlots));
    const scheduleCourses = scheduleCourseIds.length
      ? await Course.find({
          _id: { $in: scheduleCourseIds },
          isDeleted: { $ne: true },
        }).select("code courseName semester")
      : [];

    const courseMap = {};
    scheduleCourses.forEach((course) => {
      courseMap[course._id.toString()] = course;
    });

    const courseFacultyMap = {};
    const facultyNameMap = {};

    if (group.courseFaculty && group.courseFaculty.length > 0) {
      group.courseFaculty.forEach((cf) => {
        const courseId = cf.course?._id ? cf.course._id.toString() : cf.course.toString();
        const facultyId = cf.faculty?._id ? cf.faculty._id.toString() : cf.faculty.toString();

        courseFacultyMap[courseId] = facultyId;

        if (cf.faculty && cf.faculty.user) {
          facultyNameMap[facultyId] = cf.faculty.user.name;
        }
      });
    }

    const timetable = [];

    const schedule = group.scheduleSlots || new Map();

    WEEKDAY_ORDER.forEach((day) => {
      let daySlots = null;

      if (schedule instanceof Map) {
        daySlots = schedule.get(day) || null;
      } else if (typeof schedule === "object" && schedule !== null) {
        daySlots = schedule[day] || null;
      }

      if (!daySlots) {
        timetable.push({ day, lectures: [] });
        return;
      }

      const entries = [];

      if (daySlots instanceof Map) {
        for (const [lectureNumber, courseId] of daySlots.entries()) {
          entries.push([lectureNumber, courseId]);
        }
      } else if (typeof daySlots === "object" && daySlots !== null) {
        for (const [lectureNumber, courseId] of Object.entries(daySlots)) {
          entries.push([lectureNumber, courseId]);
        }
      }

      entries.sort((a, b) => Number(a[0]) - Number(b[0]));

      const lectures = entries.map(([lectureNumber, courseId]) => {
        const idStr = courseId.toString();
        const course =
          courseMap[idStr] ||
          group.courseFaculty?.find((cf) => {
            const cfCourseId = cf.course?._id ? cf.course._id.toString() : cf.course.toString();
            return cfCourseId === idStr;
          })?.course || null;

        const facultyId = courseFacultyMap[idStr];
        const facultyName = facultyId ? facultyNameMap[facultyId] || null : null;

        return {
          lectureNumber: Number(lectureNumber),
          courseCode: course?.code || null,
          courseName: course?.courseName || null,
          facultyName,
        };
      });

      timetable.push({ day, lectures });
    });

    let semester = null;
    if (scheduleCourses.length > 0) {
      const counts = {};
      scheduleCourses.forEach((course) => {
        if (typeof course.semester === "number") {
          counts[course.semester] = (counts[course.semester] || 0) + 1;
        }
      });

      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (entries.length > 0) {
        semester = Number(entries[0][0]);
      }
    }

    // Build courses list for edit dropdowns from the group's department.
    let courses = [];
    if (group.department) {
      const departmentCourses = await Course.find({
        department: group.department,
        isDeleted: { $ne: true },
      }).select("code courseName");

      courses = departmentCourses.map((c) => ({
        id: c._id,
        code: c.code,
        courseName: c.courseName,
      }));
    }

    // Fetch all faculty in this group's department
    let departmentFaculty = [];
    if (group.department) {
      const deptFaculties = await Faculty.find({ department: group.department })
        .populate({ path: "user", select: "name" });
      departmentFaculty = deptFaculties.map((f) => ({
        id: f._id,
        name: f.user?.name || "Unknown",
      }));
    }

    const responsePayload = {
      message: "Group timetable fetched successfully",
      group: {
        id: group._id,
        groupCode: group.name,
        semester,
        roomNo: group.roomNo || null,
        timetable,
        courses,
        departmentFaculty,
      },
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getGroupTimetable cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/timetable/group/:groupId
// Create/replace full timetable payload for a group.
export const createGroupTimetable = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { scheduleSlots, courseFaculty = [] } = req.body;

    if (!scheduleSlots || typeof scheduleSlots !== "object") {
      return res.status(400).json({
        message: "scheduleSlots is required and must be an object",
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    group.scheduleSlots = mapScheduleToObject(scheduleSlots);
    if (Array.isArray(courseFaculty) && courseFaculty.length > 0) {
      group.courseFaculty = courseFaculty;
    }
    syncGroupCourseIdsFromSchedule(group);
    await group.save();

    await syncCourseFacultyIds(group.courseFaculty || []);
    await syncFacultyRoutineFromGroup(group);

    try {
      await clearTimetableCache(groupId);
      await redisClient.del("admin:groups:all");
    } catch (err) {
      console.error("[Redis] createGroupTimetable cache clear failed:", err.message || err);
    }

    return res.status(201).json({
      message: "Group timetable created successfully",
      groupId: group._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/timetable/group/:groupId
// Update timetable either by full payload or a single slot.
export const updateGroupTimetable = async (req, res) => {
  try {
    const { groupId } = req.params;
    const {
      scheduleSlots,
      courseFaculty,
      day,
      lectureNumber,
      courseId,
      facultyId,
    } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (scheduleSlots && typeof scheduleSlots === "object") {
      group.scheduleSlots = mapScheduleToObject(scheduleSlots);
    } else if (day && lectureNumber) {
      const dayKey = String(day).toLowerCase();
      if (!WEEKDAY_ORDER.includes(dayKey)) {
        return res.status(400).json({ message: "Invalid day value" });
      }

      const nextSchedule = mapScheduleToObject(group.scheduleSlots);
      if (!nextSchedule[dayKey]) nextSchedule[dayKey] = {};
      if (courseId) {
        nextSchedule[dayKey][String(lectureNumber)] = String(courseId);
      } else {
        delete nextSchedule[dayKey][String(lectureNumber)];
      }
      if (Object.keys(nextSchedule[dayKey]).length === 0) {
        delete nextSchedule[dayKey];
      }
      group.scheduleSlots = nextSchedule;

      if (courseId && facultyId) {
        group.courseFaculty = upsertCourseFacultyPair(
          group.courseFaculty || [],
          courseId,
          facultyId
        );
      }
    } else {
      return res.status(400).json({
        message:
          "Provide either scheduleSlots or (day + lectureNumber + courseId/facultyId)",
      });
    }

    if (Array.isArray(courseFaculty)) {
      group.courseFaculty = courseFaculty;
    }

    syncGroupCourseIdsFromSchedule(group);
    await group.save();
    await syncCourseFacultyIds(group.courseFaculty || []);
    await syncFacultyRoutineFromGroup(group);

    try {
      await clearTimetableCache(groupId);
      await redisClient.del("admin:groups:all");
    } catch (err) {
      console.error("[Redis] updateGroupTimetable cache clear failed:", err.message || err);
    }

    return res.json({
      message: "Group timetable updated successfully",
      groupId: group._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= GET GROUP BY ID ================= */

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("department")
      .populate({
        path: "coordinator",
        populate: { path: "user", select: "name email" },
      })
      .populate("courseIds")
      .populate({
        path: "studentIds",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "courseFaculty.course",
      })
      .populate({
        path: "courseFaculty.faculty",
        populate: { path: "user", select: "name email" },
      });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({
      message: "Group fetched successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD GROUP ================= */

export const addGroup = async (req, res) => {
  try {
    const {
      name,
      studentIds,
      department,
      coordinator,
      courseIds,
      roomNo,
      scheduleSlots,
      courseFaculty,
    } = req.body;

    const group = await Group.create({
      name,
      studentIds: studentIds || [],
      department,
      coordinator,
      courseIds: courseIds || [],
      roomNo,
      scheduleSlots: scheduleSlots || new Map(),
      courseFaculty: courseFaculty || [],
    });

    /* Sync facultyIds into each Course document */
    if (courseFaculty && courseFaculty.length > 0) {
      const updateOps = courseFaculty.map((cf) =>
        Course.findByIdAndUpdate(cf.course, {
          $addToSet: { facultyIds: cf.faculty },
        })
      );
      await Promise.all(updateOps);
    }

    /* Sync routine into each Faculty document from scheduleSlots + courseFaculty */
    if (courseFaculty && courseFaculty.length > 0 && scheduleSlots) {
      /* Build a map: courseId -> facultyId for quick lookup */
      const courseToFaculty = {};
      for (const cf of courseFaculty) {
        courseToFaculty[cf.course.toString()] = cf.faculty.toString();
      }

      /* Get all unique faculty IDs involved */
      const facultyIds = [...new Set(courseFaculty.map(cf => cf.faculty.toString()))];

      for (const facultyId of facultyIds) {
        const fac = await Faculty.findById(facultyId);
        if (!fac) continue;

        /* Convert existing routine Map to plain object */
        const existingRoutine = {};
        if (fac.routine && fac.routine instanceof Map && fac.routine.size > 0) {
          for (const [day, lectureMap] of fac.routine.entries()) {
            existingRoutine[day] = {};
            if (lectureMap instanceof Map) {
              for (const [lecNum, detail] of lectureMap.entries()) {
                existingRoutine[day][lecNum] = {
                  course: detail.course,
                  group: detail.group,
                };
              }
            }
          }
        }

        /* Add new routine entries from scheduleSlots for this faculty */
        for (const [day, lectures] of Object.entries(scheduleSlots)) {
          for (const [lectureNumber, courseId] of Object.entries(lectures)) {
            const courseStr = courseId.toString();
            /* Only add if this course is taught by this faculty */
            if (courseToFaculty[courseStr] === facultyId) {
              if (!existingRoutine[day]) {
                existingRoutine[day] = {};
              }
              existingRoutine[day][lectureNumber] = {
                course: courseStr,
                group: group._id,
              };
            }
          }
        }

        /* Rebuild in weekday order */
        const ordered = {};
        for (const day of WEEKDAY_ORDER) {
          if (existingRoutine[day] && Object.keys(existingRoutine[day]).length > 0) {
            ordered[day] = existingRoutine[day];
          }
        }

        /* Update faculty routine */
        fac.routine = ordered;
        await fac.save();
      }
    }

    const populatedGroup = await Group.findById(group._id)
      .populate("department")
      .populate({
        path: "coordinator",
        populate: { path: "user", select: "name email" },
      })
      .populate("courseIds")
      .populate({
        path: "studentIds",
        populate: { path: "user", select: "name email" },
      });

    const responsePayload = {
      message: "Group created successfully",
      group: populatedGroup,
    };

    try {
      await redisClient.del("admin:timetable:groups");
      await redisClient.del("admin:groups:all");
    } catch (err) {
      console.error("[Redis] addGroup cache clear failed:", err.message || err);
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE GROUP ================= */

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const group = await Group.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("department")
      .populate({
        path: "coordinator",
        populate: { path: "user", select: "name email" },
      })
      .populate("courseIds")
      .populate({
        path: "studentIds",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "courseFaculty.course",
      })
      .populate({
        path: "courseFaculty.faculty",
        populate: { path: "user", select: "name email" },
      });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    /* Sync facultyIds into each Course document on update */
    if (updateData.courseFaculty && updateData.courseFaculty.length > 0) {
      const updateOps = updateData.courseFaculty.map((cf) =>
        Course.findByIdAndUpdate(cf.course, {
          $addToSet: { facultyIds: cf.faculty },
        })
      );
      await Promise.all(updateOps);
    }

    /* Sync routine into each Faculty document on update */
    if (updateData.courseFaculty && updateData.courseFaculty.length > 0 && updateData.scheduleSlots) {
      /* Build a map: courseId -> facultyId */
      const courseToFaculty = {};
      for (const cf of updateData.courseFaculty) {
        courseToFaculty[cf.course.toString()] = cf.faculty.toString();
      }

      /* Get all unique faculty IDs involved */
      const facultyIds = [...new Set(updateData.courseFaculty.map(cf => cf.faculty.toString()))];

      for (const facultyId of facultyIds) {
        const fac = await Faculty.findById(facultyId);
        if (!fac) continue;

        /* Convert existing routine Map to plain object */
        const existingRoutine = {};
        if (fac.routine && fac.routine instanceof Map && fac.routine.size > 0) {
          for (const [day, lectureMap] of fac.routine.entries()) {
            existingRoutine[day] = {};
            if (lectureMap instanceof Map) {
              for (const [lecNum, detail] of lectureMap.entries()) {
                /* Skip entries for this group (we'll replace them) */
                if (detail.group.toString() !== group._id.toString()) {
                  existingRoutine[day][lecNum] = {
                    course: detail.course,
                    group: detail.group,
                  };
                }
              }
            }
            /* Remove empty days */
            if (Object.keys(existingRoutine[day]).length === 0) {
              delete existingRoutine[day];
            }
          }
        }

        /* Add new routine entries from scheduleSlots for this faculty */
        for (const [day, lectures] of Object.entries(updateData.scheduleSlots)) {
          for (const [lectureNumber, courseId] of Object.entries(lectures)) {
            const courseStr = courseId.toString();
            /* Only add if this course is taught by this faculty */
            if (courseToFaculty[courseStr] === facultyId) {
              if (!existingRoutine[day]) {
                existingRoutine[day] = {};
              }
              existingRoutine[day][lectureNumber] = {
                course: courseStr,
                group: group._id,
              };
            }
          }
        }

        /* Rebuild in weekday order */
        const ordered = {};
        for (const day of WEEKDAY_ORDER) {
          if (existingRoutine[day] && Object.keys(existingRoutine[day]).length > 0) {
            ordered[day] = existingRoutine[day];
          }
        }

        /* Update faculty routine */
        fac.routine = ordered;
        await fac.save();
      }
    }

    const responsePayload = {
      message: "Group updated successfully",
      group,
    };

    try {
      await redisClient.del("admin:timetable:groups");
      await redisClient.del(`admin:timetable:group:${id}`);
      await redisClient.del(`admin:timetable:group:v2:${id}`);
      await redisClient.del("admin:groups:all");
    } catch (err) {
      console.error("[Redis] updateGroup cache clear failed:", err.message || err);
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE GROUP ================= */

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    try {
      await redisClient.del("admin:timetable:groups");
      await redisClient.del(`admin:timetable:group:${id}`);
      await redisClient.del(`admin:timetable:group:v2:${id}`);
      await redisClient.del("admin:groups:all");
    } catch (err) {
      console.error("[Redis] deleteGroup cache clear failed:", err.message || err);
    }

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= HARD DELETE GROUP ================= */

export const hardDeleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findByIdAndDelete(id);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    try {
      await redisClient.del("admin:timetable:groups");
      await redisClient.del(`admin:timetable:group:${id}`);
      await redisClient.del(`admin:timetable:group:v2:${id}`);
      await redisClient.del("admin:groups:all");
    } catch (err) {
      console.error("[Redis] hardDeleteGroup cache clear failed:", err.message || err);
    }

    res.json({ message: "Group permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
