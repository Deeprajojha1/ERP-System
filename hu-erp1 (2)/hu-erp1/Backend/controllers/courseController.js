import Course from "../models/Course.js";
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import Group from "../models/Group.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const clearTimetableCacheForCourseChange = async (courseId) => {
  await redisClient.del("admin:timetable:groups");
  await redisClient.del("admin:timetable:groups:v2");

  if (!courseId) return;
  const linkedGroups = await Group.find({
    courseIds: courseId,
    isDeleted: { $ne: true },
  }).select("_id");

    await Promise.all(
      linkedGroups.map((group) =>
        Promise.all([
          redisClient.del(`admin:timetable:group:${group._id}`),
          redisClient.del(`admin:timetable:group:v2:${group._id}`),
        ])
      )
    );
};

/* ================= GET ALL COURSES ================= */

export const getAllCourses = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:courses:all";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getAllCourses cache read failed:", err.message || err);
      }
    }

    const courses = await Course.find({ isDeleted: { $ne: true } })
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    const courseIds = courses.map((course) => course._id);
    const groupsWithCourseFaculty = courseIds.length
      ? await Group.find({
          isDeleted: { $ne: true },
          "courseFaculty.course": { $in: courseIds },
        })
          .select("courseFaculty")
          .populate({
            path: "courseFaculty.faculty",
            select: "user employeeId",
            populate: { path: "user", select: "name email" },
          })
      : [];

    const courseFacultyFromGroups = new Map();
    groupsWithCourseFaculty.forEach((group) => {
      (group.courseFaculty || []).forEach((cf) => {
        const courseId = cf?.course ? String(cf.course) : "";
        const facultyDoc = cf?.faculty;
        if (!courseId || !facultyDoc) return;

        const facultyId = String(facultyDoc._id || "");
        const facultyName = facultyDoc?.user?.name || facultyDoc?.employeeId || "Unknown";
        if (!facultyId) return;

        if (!courseFacultyFromGroups.has(courseId)) {
          courseFacultyFromGroups.set(courseId, new Map());
        }

        const facultyMap = courseFacultyFromGroups.get(courseId);
        if (!facultyMap.has(facultyId)) {
          facultyMap.set(facultyId, { _id: facultyDoc._id, name: facultyName });
        }
      });
    });

    const studentCounts = await Student.aggregate([
      {
        $group: {
          _id: "$department",
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

    const simplifiedCourses = courses.map((course) => {
      const deptId = course.department?._id?.toString();
      const studentsInDepartment = deptId
        ? studentCountMap[deptId] || 0
        : 0;
      const facultyById = new Map();
      (course.facultyIds || []).forEach((facultyDoc) => {
        const facultyId = String(facultyDoc?._id || "");
        if (!facultyId) return;
        facultyById.set(facultyId, {
          _id: facultyDoc._id,
          name: facultyDoc?.user?.name || facultyDoc?.employeeId || "Unknown",
        });
      });

      const mappedFromGroups = courseFacultyFromGroups.get(String(course._id));
      if (mappedFromGroups) {
        mappedFromGroups.forEach((faculty, facultyId) => {
          if (!facultyById.has(facultyId)) {
            facultyById.set(facultyId, faculty);
          }
        });
      }

      const facultyMembers = Array.from(facultyById.values());

      const coordinator =
        facultyMembers.length > 0
          ? facultyMembers[0]
          : null;

      const coordinatorName = coordinator?.name || null;

      return {
        id: course._id,
        code: course.code,
        courseName: course.courseName,
        department: course.department?.name || null,
        departmentId: course.department?._id || null,
        semester: course.semester ?? null,
        credit: course.credit,
        branch: course.branch || null,
        studentsInDepartment,
        coordinatorId: coordinator?._id || null,
        coordinatorName,
        facultyMembers,
      };
    });
    const responsePayload = {
      message: "Courses fetched successfully",
      count: simplifiedCourses.length,
      courses: simplifiedCourses,
    };

    if (!noCache) {
      try {
        // Cache using global TTL
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllCourses cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET COURSE BY ID ================= */

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      message: "Course fetched successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD COURSE ================= */

export const addCourse = async (req, res) => {
  try {
    const { code, courseName, department, semester, branch, credit, facultyIds } = req.body;

    /* Check if course code already exists */
    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({ message: "Course code already exists" });
    }

    const course = await Course.create({
      code,
      courseName,
      department,
      semester,
      branch,
      credit,
      facultyIds: facultyIds || [],
    });

    const populatedCourse = await Course.findById(course._id)
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    const responsePayload = {
      message: "Course added successfully",
      course: populatedCourse,
    };

    try {
      await redisClient.del("admin:courses:all");
      await clearTimetableCacheForCourseChange();
    } catch (err) {
      console.error("[Redis] addCourse cache clear failed:", err.message || err);
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE COURSE ================= */

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const course = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const responsePayload = {
      message: "Course updated successfully",
      course,
    };

    try {
      await redisClient.del("admin:courses:all");
      await clearTimetableCacheForCourseChange(course._id);
    } catch (err) {
      console.error("[Redis] updateCourse cache clear failed:", err.message || err);
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE COURSE ================= */

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    try {
      await redisClient.del("admin:courses:all");
      await clearTimetableCacheForCourseChange(course._id);
    } catch (err) {
      console.error("[Redis] deleteCourse cache clear failed:", err.message || err);
    }

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= HARD DELETE COURSE ================= */

export const hardDeleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    try {
      await redisClient.del("admin:courses:all");
      await clearTimetableCacheForCourseChange(course._id);
    } catch (err) {
      console.error("[Redis] hardDeleteCourse cache clear failed:", err.message || err);
    }

    res.json({ message: "Course permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
