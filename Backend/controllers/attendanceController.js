import AttendanceSession from "../models/AttendanceSession.js";
import Group from "../models/Group.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/userModel.js";

const normalizeId = (value) => String(value || "").trim();

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseLocalDateBoundary = (value, boundary = "start") => {
  const [yy, mm, dd] = String(value || "").split("-").map(Number);
  if (!yy || !mm || !dd) return null;

  const date = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const isSameCalendarDay = (left, right) => {
  return toDateKey(left) === toDateKey(right);
};

const normalizeLectureNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.trunc(parsed);
};

const buildSessionDateByLecture = (value, lectureNumber = 1) => {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  const minuteOffset = Math.max(0, normalizeLectureNumber(lectureNumber) - 1);
  date.setMinutes(minuteOffset);
  return date;
};

const resolveGroupStudentIdsForCourse = async ({ group, courseId }) => {
  const groupStudentIds = Array.isArray(group?.studentIds)
    ? group.studentIds.map((id) => normalizeId(id)).filter(Boolean)
    : [];

  const courseIdValue = normalizeId(courseId);
  if (!courseIdValue) return groupStudentIds;

  const enrollmentRows = await Enrollment.find({
    course: courseIdValue,
    status: "active",
    student: { $in: groupStudentIds },
  })
    .select("student")
    .lean();

  const enrolledStudentIds = enrollmentRows
    .map((row) => normalizeId(row?.student))
    .filter(Boolean);

  if (enrolledStudentIds.length > 0) {
    return [...new Set(enrolledStudentIds)];
  }

  const groupCourseIds = Array.isArray(group?.courseIds)
    ? group.courseIds.map((id) => normalizeId(id)).filter(Boolean)
    : [];

  if (groupCourseIds.includes(courseIdValue)) {
    return groupStudentIds;
  }

  return groupStudentIds;
};

/* ================================================================
   1. GET GROUP ATTENDANCE PAGE  (Faculty)
   GET  /api/faculty/attendance/:groupId?courseId=...&date=...
   Returns student list with name, enrollmentNumber, phoneNumber,
   fatherName, and today's attendance status (if already marked).
   ================================================================ */
export const getGroupAttendancePage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { courseId, date, lectureNumber } = req.query;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    /* Verify faculty is assigned to this group (if not admin) */
    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId });
      if (!facultyDoc) return res.status(404).json({ message: "Faculty profile not found" });

      const isAssigned = group.courseFaculty.some(
        (cf) => cf.faculty.toString() === facultyDoc._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: "You are not assigned to this group" });
      }
    }

    const studentIds = await resolveGroupStudentIdsForCourse({ group, courseId });

    /* Fetch students in the group (filtered by course when possible) */
    const students = await Student.find({ _id: { $in: studentIds } })
      .populate("user", "name phoneNumber")
      .select("enrollmentNumber fatherName user");

    /* Check if attendance was already marked today for this group + course */
    const lectureNo = normalizeLectureNumber(lectureNumber);
    const targetDate = buildSessionDateByLecture(date, lectureNo);
    if (!targetDate) {
      return res.status(400).json({ message: "Invalid attendance date" });
    }

    let existingSession = null;
    if (courseId) {
      existingSession = await AttendanceSession.findOne({
        date: targetDate,
        group: groupId,
        course: courseId,
      });
    }

    /* Build response: merge student info with existing status */
    const studentList = students.map((s) => {
      const existing = existingSession?.records.find(
        (r) => r.student.toString() === s._id.toString()
      );
      return {
        studentId: s._id,
        name: s.user?.name || "",
        enrollmentNumber: s.enrollmentNumber,
        phoneNumber: s.user?.phoneNumber || "",
        fatherName: s.fatherName || "",
        status: existing ? existing.status : null, // null = not yet marked
      };
    });

    res.json({
      message: "Group attendance page",
      group: { _id: group._id, name: group.name, roomNo: group.roomNo },
      date: targetDate,
      lectureNumber: lectureNo,
      courseId: courseId || null,
      alreadyMarked: !!existingSession,
      sessionId: existingSession?._id || null,
      students: studentList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   X. GET STUDENT LIST FOR A COURSE (Faculty/Admin helper)
   GET  /api/faculty/courses/:courseId/students
   Returns all students enrolled in this course for groups assigned to the faculty.
   Falls back to group student list if Enrollment is not configured.
   ================================================================ */
export const getCourseStudentsForFaculty = async (req, res) => {
  try {
    const courseId = normalizeId(req.params.courseId);
    if (!courseId) return res.status(400).json({ message: "courseId is required" });

    const courseExists = await Course.exists({ _id: courseId });
    if (!courseExists) return res.status(404).json({ message: "Course not found" });

    let groups = [];
    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId }).select("_id");
      if (!facultyDoc) return res.status(404).json({ message: "Faculty profile not found" });

      groups = await Group.find({
        courseFaculty: { $elemMatch: { course: courseId, faculty: facultyDoc._id } },
      })
        .select("studentIds courseIds")
        .lean();
    } else {
      groups = await Group.find({ courseIds: courseId }).select("studentIds courseIds").lean();
    }

    const groupStudentIds = [
      ...new Set(
        groups
          .flatMap((g) => (Array.isArray(g?.studentIds) ? g.studentIds : []))
          .map((id) => normalizeId(id))
          .filter(Boolean)
      ),
    ];

    if (groupStudentIds.length === 0) {
      return res.json({ message: "Students fetched", count: 0, students: [] });
    }

    const enrollmentRows = await Enrollment.find({
      course: courseId,
      status: "active",
      student: { $in: groupStudentIds },
    })
      .select("student")
      .lean();

    const enrolledStudentIds = enrollmentRows
      .map((row) => normalizeId(row?.student))
      .filter(Boolean);

    const useIds = enrolledStudentIds.length > 0 ? enrolledStudentIds : groupStudentIds;

    const students = await Student.find({ _id: { $in: useIds } })
      .populate("user", "name email")
      .select("enrollmentNumber user")
      .lean();

    const mapped = students
      .map((row) => ({
        id: normalizeId(row?.user?._id),
        studentId: normalizeId(row?._id),
        name: row?.user?.name || "",
        email: row?.user?.email || "",
        enrollmentNumber: row?.enrollmentNumber || "",
      }))
      .filter((row) => row.id);

    mapped.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      message: "Students fetched",
      count: mapped.length,
      students: mapped,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   X. GET GROUPS FOR A COURSE (Faculty/Admin helper)
   GET  /api/faculty/courses/:courseId/groups
   Returns groups that the faculty teaches for this course.
   ================================================================ */
export const getCourseGroupsForFaculty = async (req, res) => {
  try {
    const courseId = normalizeId(req.params.courseId);
    if (!courseId) return res.status(400).json({ message: "courseId is required" });

    const courseExists = await Course.exists({ _id: courseId });
    if (!courseExists) return res.status(404).json({ message: "Course not found" });

    let groups = [];
    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId }).select("_id");
      if (!facultyDoc) return res.status(404).json({ message: "Faculty profile not found" });

      groups = await Group.find({
        courseFaculty: { $elemMatch: { course: courseId, faculty: facultyDoc._id } },
      })
        .select("_id name studentIds")
        .populate({
          path: "studentIds",
          select: "_id user",
        })
        .lean();
    } else {
      groups = await Group.find({ courseIds: courseId })
        .select("_id name studentIds")
        .populate({
          path: "studentIds",
          select: "_id user",
        })
        .lean();
    }

    const mapped = groups.map((g) => {
      const studentModelIds = [];
      const userIds = [];
      
      if (Array.isArray(g.studentIds)) {
        g.studentIds.forEach((student) => {
          const studentId = normalizeId(student?._id);
          const userId = normalizeId(student?.user);
          if (studentId) studentModelIds.push(studentId);
          if (userId) userIds.push(userId);
        });
      }
      
      return {
        id: normalizeId(g._id),
        name: g.name || "Group",
        studentCount: studentModelIds.length,
        studentIds: studentModelIds,
        userIds: userIds,
      };
    });

    mapped.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      message: "Groups fetched",
      count: mapped.length,
      groups: mapped,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   2. MARK / SUBMIT ATTENDANCE FOR A GROUP  (Faculty)
   POST  /api/faculty/attendance/:groupId
   body: { courseId, date?, records: [{ student, status }] }
   ================================================================ */
export const markGroupAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { courseId, date, records, lectureNumber } = req.body;

    if (!courseId || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "courseId & records[] are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    /* Verify faculty is assigned to this course in this group */
    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId });
      if (!facultyDoc) return res.status(404).json({ message: "Faculty profile not found" });

      const isAssigned = group.courseFaculty.some(
        (cf) =>
          cf.faculty.toString() === facultyDoc._id.toString() &&
          cf.course.toString() === courseId
      );
      if (!isAssigned) {
        return res.status(403).json({ message: "You are not assigned to this course in this group" });
      }
    }

    /* Normalise date to start-of-day */
    const lectureNo = normalizeLectureNumber(lectureNumber);
    const sessionDate = buildSessionDateByLecture(date || new Date(), lectureNo);
    if (!sessionDate) {
      return res.status(400).json({ message: "Invalid attendance date" });
    }

    if (req.role === "faculty" && !isSameCalendarDay(sessionDate, new Date())) {
      return res.status(403).json({
        message: "Faculty can mark attendance only for today.",
      });
    }

    /* Upsert — create if new, overwrite if re-submitted */
    const session = await AttendanceSession.findOneAndUpdate(
      { date: sessionDate, group: groupId, course: courseId },
      { date: sessionDate, group: groupId, course: courseId, lectureNumber: lectureNo, records },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      message: "Attendance marked successfully",
      session,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Attendance session already exists for this date/group/course" });
    }
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   3. CREATE / MARK ATTENDANCE  (Admin — generic)
   POST body: { groupId, courseId, date, records: [{ student, status }] }
   ================================================================ */
export const markAttendance = async (req, res) => {
  try {
    const { groupId, courseId, date, records, lectureNumber } = req.body;

    if (!groupId || !courseId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "groupId, courseId, date & records[] are required" });
    }

    /* Validate group & course exist */
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    /* If called by a faculty, verify the faculty actually teaches this course in this group */
    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId });
      if (!facultyDoc) return res.status(404).json({ message: "Faculty profile not found" });

      const isAssigned = group.courseFaculty.some(
        (cf) =>
          cf.faculty.toString() === facultyDoc._id.toString() &&
          cf.course.toString() === courseId
      );
      if (!isAssigned) {
        return res.status(403).json({ message: "You are not assigned to this course in this group" });
      }
    }

    /* Normalise the date to start-of-day so the unique index works correctly */
    const lectureNo = normalizeLectureNumber(lectureNumber);
    const sessionDate = buildSessionDateByLecture(date, lectureNo);
    if (!sessionDate) {
      return res.status(400).json({ message: "Invalid attendance date" });
    }

    /* Upsert — create if new, overwrite records if faculty re-submits */
    const session = await AttendanceSession.findOneAndUpdate(
      { date: sessionDate, group: groupId, course: courseId },
      { date: sessionDate, group: groupId, course: courseId, lectureNumber: lectureNo, records },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      message: "Attendance marked successfully",
      session,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Attendance session already exists for this date/group/course" });
    }
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   2. UPDATE ATTENDANCE  (Faculty / Admin)
   PUT  /attendance/:sessionId
   body: { records: [{ student, status }] }
   ================================================================ */
export const updateAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ message: "records[] is required" });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Attendance session not found" });

    if (req.role === "faculty" && isSameCalendarDay(session.date, new Date())) {
      return res.status(403).json({
        message: "Faculty cannot update attendance on the same day once submitted.",
      });
    }

    /* Faculty authorisation check */
    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId });
      const group = await Group.findById(session.group);
      const isAssigned = group?.courseFaculty.some(
        (cf) =>
          cf.faculty.toString() === facultyDoc._id.toString() &&
          cf.course.toString() === session.course.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: "You are not assigned to this course in this group" });
      }
    }

    session.records = records;
    await session.save();

    res.json({ message: "Attendance updated successfully", session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   3. GET ATTENDANCE BY SESSION ID  (Admin / Faculty)
   GET  /attendance/:sessionId
   ================================================================ */
export const getAttendanceById = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.sessionId)
      .populate("group", "name roomNo")
      .populate("course", "code courseName")
      .populate("records.student", "enrollmentNumber user");

    if (!session) return res.status(404).json({ message: "Session not found" });

    /* Deep-populate user inside student */
    await Student.populate(session.records.map((r) => r.student), {
      path: "user",
      select: "name email",
    });

    res.json({ message: "Attendance fetched successfully", session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   4. GET ALL SESSIONS FOR A GROUP + COURSE  (Admin / Faculty)
   GET  /attendance/group/:groupId/course/:courseId
   Optional query: ?from=2026-01-01&to=2026-01-31
   ================================================================ */
export const getAttendanceByGroupAndCourse = async (req, res) => {
  try {
    const { groupId, courseId } = req.params;
    const { from, to } = req.query;

    const filter = { group: groupId, course: courseId };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const sessions = await AttendanceSession.find(filter)
      .sort({ date: -1 })
      .populate("group", "name roomNo")
      .populate("course", "code courseName")
      .populate("records.student", "enrollmentNumber user");

    /* Deep-populate user name inside each student */
    for (const session of sessions) {
      await Student.populate(session.records.map((r) => r.student), {
        path: "user",
        select: "name email",
      });
    }

    res.json({
      message: "Attendance sessions fetched",
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   5. DELETE AN ATTENDANCE SESSION  (Admin only)
   DELETE  /attendance/:sessionId
   ================================================================ */
export const deleteAttendance = async (req, res) => {
  try {
    const session = await AttendanceSession.findByIdAndUpdate(
      req.params.sessionId,
      { isDeleted: true },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: "Session not found" });

    res.json({ message: "Attendance session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   5b. HARD DELETE AN ATTENDANCE SESSION  (Admin only)
   DELETE  /attendance/:sessionId
   ================================================================ */
export const hardDeleteAttendance = async (req, res) => {
  try {
    const session = await AttendanceSession.findByIdAndDelete(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    res.json({ message: "Attendance session permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   6. GET STUDENT LIST FOR A GROUP  (helper for frontend)
   GET  /attendance/group/:groupId/students
   Returns all students in a group so the faculty can mark attendance.
   ================================================================ */
export const getStudentsByGroup = async (req, res) => {
  try {
    const courseId = normalizeId(req.query?.courseId);
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (req.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: req.userId }).select("_id");
      if (!facultyDoc) return res.status(404).json({ message: "Faculty profile not found" });

      const isAssigned = group.courseFaculty.some(
        (cf) => cf.faculty.toString() === facultyDoc._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: "You are not assigned to this group" });
      }
    }

    const studentIds = await resolveGroupStudentIdsForCourse({ group, courseId });

    const students = await Student.find({ _id: { $in: studentIds } })
      .populate("user", "name email")
      .select("enrollmentNumber user");

    res.json({
      message: "Students fetched",
      count: students.length,
      students,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   7. STUDENT ATTENDANCE REPORT  —  per student per course
   GET  /attendance/student/:studentId/course/:courseId
   Optional query: ?from=...&to=...
   Returns: totalClasses, present, absent, percentage, sessions[]
   ================================================================ */
export const getStudentAttendanceReport = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const { from, to } = req.query;

    const filter = { course: courseId, "records.student": studentId };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const sessions = await AttendanceSession.find(filter)
      .sort({ date: 1 })
      .populate("course", "code courseName")
      .populate("group", "name");

    let present = 0;
    let absent = 0;
    const details = [];

    for (const session of sessions) {
      const record = session.records.find((r) => r.student.toString() === studentId);
      if (record) {
        if (record.status === "present") present++;
        else absent++;
        details.push({
          date: session.date,
          status: record.status,
          group: session.group,
        });
      }
    }

    const totalClasses = present + absent;
    const percentage = totalClasses > 0 ? ((present / totalClasses) * 100).toFixed(2) : "0.00";

    res.json({
      message: "Student attendance report",
      studentId,
      courseId,
      totalClasses,
      present,
      absent,
      percentage: Number(percentage),
      details,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   8. STUDENT OVERALL ATTENDANCE  — all courses
   GET  /attendance/student/:studentId
   Returns per-course breakdown
   ================================================================ */
export const getStudentOverallAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const sessions = await AttendanceSession.find({ "records.student": studentId })
      .populate("course", "code courseName");

    /* Group by course */
    const courseMap = {};

    for (const session of sessions) {
      // Guard against orphaned sessions whose course was deleted or missing.
      const courseDoc = session.course;
      const cId = courseDoc?._id ? courseDoc._id.toString() : null;
      if (!cId) continue;

      if (!courseMap[cId]) {
        courseMap[cId] = {
          course: courseDoc,
          present: 0,
          absent: 0,
        };
      }
      const record = session.records.find((r) => r.student.toString() === studentId);
      if (record) {
        if (record.status === "present") courseMap[cId].present++;
        else courseMap[cId].absent++;
      }
    }

    const report = Object.values(courseMap).map((c) => {
      const total = c.present + c.absent;
      return {
        course: c.course,
        totalClasses: total,
        present: c.present,
        absent: c.absent,
        percentage: total > 0 ? Number(((c.present / total) * 100).toFixed(2)) : 0,
      };
    });

    res.json({
      message: "Overall attendance report",
      studentId,
      courses: report,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   9. DAILY ATTENDANCE SUMMARY  (Admin)
   GET  /attendance/daily?date=2026-02-08
   Returns all sessions on a given date with stats.
   ================================================================ */
export const getDailyAttendanceSummary = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date query param is required" });

    const [yy, mm, dd] = String(date).split("-").map(Number);
    if (!yy || !mm || !dd) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const dayStart = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    if (Number.isNaN(dayStart.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const sessions = await AttendanceSession.find({
      date: { $gte: dayStart, $lte: dayEnd },
    })
      .populate("group", "name roomNo")
      .populate("course", "code courseName");

    const summary = sessions.map((s) => {
      const present = s.records.filter((r) => r.status === "present").length;
      const absent = s.records.filter((r) => r.status === "absent").length;
      return {
        sessionId: s._id,
        group: s.group,
        course: s.course,
        date: s.date,
        totalStudents: s.records.length,
        present,
        absent,
        percentage: s.records.length > 0 ? Number(((present / s.records.length) * 100).toFixed(2)) : 0,
      };
    });

    res.json({
      message: "Daily attendance summary",
      date,
      totalSessions: summary.length,
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAttendanceExportReport = async (req, res) => {
  try {
    const todayKey = toDateKey(new Date());
    const fromDateInput = String(req.query?.fromDate || req.query?.date || todayKey).trim();
    const toDateInput = String(req.query?.toDate || fromDateInput).trim();
    const departmentFilter = String(req.query?.department || "").trim().toLowerCase();
    const groupFilter = String(req.query?.group || "").trim();
    const semesterFilter = String(req.query?.semester || "").trim();

    let dayStart = parseLocalDateBoundary(fromDateInput, "start");
    let dayEnd = parseLocalDateBoundary(toDateInput, "end");

    if (!dayStart || !dayEnd) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    if (dayStart > dayEnd) {
      [dayStart, dayEnd] = [
        parseLocalDateBoundary(toDateInput, "start"),
        parseLocalDateBoundary(fromDateInput, "end"),
      ];
    }

    const groupQuery = {};
    if (groupFilter && groupFilter.toLowerCase() !== "all groups") {
      groupQuery.name = new RegExp(`^${escapeRegex(groupFilter)}$`, "i");
    }

    const groups = await Group.find(groupQuery)
      .select("name department roomNo studentIds courseFaculty")
      .lean();

    if (!groups.length) {
      return res.json({
        message: "Attendance export rows fetched successfully",
        totalRows: 0,
        rows: [],
      });
    }

    const groupIds = groups.map((group) => group._id);
    const rosterStudentIds = groups.flatMap((group) =>
      Array.isArray(group?.studentIds) ? group.studentIds : []
    );

    const students = await Student.find({
      $or: [{ group: { $in: groupIds } }, { _id: { $in: rosterStudentIds } }],
    })
      .populate("user", "name")
      .populate("department", "name")
      .select("enrollmentNumber user department program semester group")
      .lean();

    const filteredStudents = students.filter((student) => {
      const departmentName = String(student?.department?.name || "").trim().toLowerCase();
      if (departmentFilter && departmentFilter !== "all departments" && departmentName !== departmentFilter) {
        return false;
      }

      if (semesterFilter && semesterFilter !== "All Semesters" && String(student?.semester || "") !== semesterFilter) {
        return false;
      }

      return true;
    });

    const studentsById = new Map();
    const studentsByUserId = new Map();
    const studentsByGroupId = new Map();

    filteredStudents.forEach((student) => {
      const studentId = normalizeId(student?._id);
      const userId = normalizeId(student?.user?._id);
      const groupId = normalizeId(student?.group?._id || student?.group);

      if (studentId) studentsById.set(studentId, student);
      if (userId) studentsByUserId.set(userId, student);

      if (groupId) {
        if (!studentsByGroupId.has(groupId)) studentsByGroupId.set(groupId, []);
        studentsByGroupId.get(groupId).push(student);
      }
    });

    groups.forEach((group) => {
      const groupId = normalizeId(group?._id);
      if (!groupId) return;

      const existing = studentsByGroupId.get(groupId) || [];
      const existingIds = new Set(existing.map((student) => normalizeId(student?._id)));
      const rosterMatches = (group?.studentIds || [])
        .map((studentId) => studentsById.get(normalizeId(studentId)))
        .filter(Boolean)
        .filter((student) => !existingIds.has(normalizeId(student?._id)));

      if (rosterMatches.length) {
        studentsByGroupId.set(groupId, [...existing, ...rosterMatches]);
      }
    });

    const facultyIds = groups.flatMap((group) =>
      Array.isArray(group?.courseFaculty)
        ? group.courseFaculty.map((entry) => entry?.faculty).filter(Boolean)
        : []
    );

    const faculties = await Faculty.find({ _id: { $in: facultyIds } })
      .populate("user", "name")
      .select("user employeeId")
      .lean();

    const facultyById = new Map(
      faculties.map((faculty) => [
        normalizeId(faculty?._id),
        faculty?.user?.name || faculty?.employeeId || "-",
      ])
    );

    const groupCourseFacultyMap = new Map();
    groups.forEach((group) => {
      const groupId = normalizeId(group?._id);
      (group?.courseFaculty || []).forEach((entry) => {
        const courseId = normalizeId(entry?.course);
        const facultyId = normalizeId(entry?.faculty);
        if (!groupId || !courseId) return;
        groupCourseFacultyMap.set(
          `${groupId}:${courseId}`,
          facultyById.get(facultyId) || "-"
        );
      });
    });

    const sessions = await AttendanceSession.find({
      group: { $in: groupIds },
      date: { $gte: dayStart, $lte: dayEnd },
    })
      .populate("course", "code courseName")
      .select("date group course records")
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const sessionsByGroupDate = new Map();
    sessions.forEach((session) => {
      const groupId = normalizeId(session?.group);
      const dateKey = toDateKey(session?.date);
      if (!groupId || !dateKey) return;

      const compoundKey = `${groupId}:${dateKey}`;
      if (!sessionsByGroupDate.has(compoundKey)) sessionsByGroupDate.set(compoundKey, []);
      sessionsByGroupDate.get(compoundKey).push(session);
    });

    const groupById = new Map(groups.map((group) => [normalizeId(group?._id), group]));
    const rows = [];

    sessionsByGroupDate.forEach((groupSessions, compoundKey) => {
      const [groupId, dateKey] = compoundKey.split(":");
      const group = groupById.get(groupId);
      const roster = studentsByGroupId.get(groupId) || [];

      if (!group || !roster.length) return;

      roster.forEach((student) => {
        const studentId = normalizeId(student?._id);
        const userId = normalizeId(student?.user?._id);

        const presentCount = groupSessions.filter((session) => {
          const record = (session?.records || []).find((entry) => {
            const recordId = normalizeId(entry?.student);
            return recordId === studentId || (userId && recordId === userId);
          });
          return record?.status === "present";
        }).length;

        const dailyPercentage = groupSessions.length
          ? Number(((presentCount / groupSessions.length) * 100).toFixed(2))
          : 0;

        groupSessions.forEach((session) => {
          const record = (session?.records || []).find((entry) => {
            const recordId = normalizeId(entry?.student);
            return recordId === studentId || (userId && recordId === userId);
          });

          const courseCode = session?.course?.code || "-";
          const courseName = session?.course?.courseName || "-";

          rows.push({
            "Student Name": student?.user?.name || "Unknown",
            Program: student?.program || "-",
            Department: student?.department?.name || "-",
            Semester: student?.semester ?? "-",
            Group: group?.name || "-",
            "Student Code": student?.enrollmentNumber || "-",
            "Subject / Period":
              courseCode !== "-" || courseName !== "-"
                ? `${courseCode}${courseName !== "-" ? ` - ${courseName}` : ""}`
                : "-",
            "Faculty Name":
              groupCourseFacultyMap.get(`${groupId}:${normalizeId(session?.course?._id)}`) || "-",
            Date: dateKey,
            "Attendance Status":
              record?.status === "present"
                ? "Present"
                : record?.status === "absent"
                ? "Absent"
                : "Not Marked",
            "Attendance Percentage": dailyPercentage,
          });
        });
      });
    });

    return res.json({
      message: "Attendance export rows fetched successfully",
      totalRows: rows.length,
      rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch attendance export" });
  }
};

/* ================================================================
   10. GROUP STUDENT ATTENDANCE BY DATE  (Admin)
   GET /attendance/group/:groupId/date/:date
   Returns all students in a group with their attendance entries
   for the specified date (across all courses/sessions of that day).
   ================================================================ */
export const getGroupStudentAttendanceByDate = async (req, res) => {
  try {
    const { groupId, date } = req.params;

    if (!groupId || !date) {
      return res.status(400).json({ message: "groupId and date are required" });
    }

    const [yy, mm, dd] = String(date).split("-").map(Number);
    if (!yy || !mm || !dd) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    // Parse as local date (not UTC string parsing) to align with how sessions are saved.
    const dayStart = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    if (Number.isNaN(dayStart.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const group = await Group.findById(groupId).select("name roomNo studentIds");
    if (!group) return res.status(404).json({ message: "Group not found" });

    let students = await Student.find({ _id: { $in: group.studentIds } })
      .populate("user", "name")
      .select("enrollmentNumber user");

    // Fallback: some datasets only maintain Student.group, not Group.studentIds.
    if (students.length === 0) {
      students = await Student.find({ group: groupId })
        .populate("user", "name")
        .select("enrollmentNumber user");
    }

    const sessions = await AttendanceSession.find({
      group: groupId,
      date: { $gte: dayStart, $lte: dayEnd },
    })
      .populate("course", "code courseName")
      .sort({ date: 1, createdAt: 1 });

    const responseStudents = students.map((student) => {
      const attendanceEntries = sessions.map((session) => {
        const studentObjectId = String(student._id);
        const userObjectId = String(student.user?._id || "");
        const record = session.records.find((r) => {
          const recId = String(r.student);
          return recId === studentObjectId || (userObjectId && recId === userObjectId);
        });

        return {
          sessionId: session._id,
          course: session.course
            ? {
                _id: session.course._id,
                code: session.course.code,
                courseName: session.course.courseName,
              }
            : null,
          status: record ? record.status : "not-marked",
        };
      });

      const presentCount = attendanceEntries.filter((e) => e.status === "present").length;
      const absentCount = attendanceEntries.filter((e) => e.status === "absent").length;
      const notMarkedCount = attendanceEntries.filter((e) => e.status === "not-marked").length;

      return {
        studentId: student._id,
        name: student.user?.name || "Unknown",
        enrollmentNumber: student.enrollmentNumber || "",
        attendanceEntries,
        summary: {
          totalSessions: attendanceEntries.length,
          presentCount,
          absentCount,
          notMarkedCount,
        },
      };
    });

    return res.json({
      message: "Group student attendance fetched successfully",
      date,
      group: {
        _id: group._id,
        name: group.name,
        roomNo: group.roomNo || null,
      },
      totalSessions: sessions.length,
      students: responseStudents,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================================================================
   11. GROUP STUDENT ATTENDANCE BY DATE RANGE  (Admin)
   GET /attendance/group/:groupId/date-range?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
   Returns all students in a group with aggregated attendance summary
   for the selected date range (across all courses/sessions).
   ================================================================ */
export const getGroupStudentAttendanceByDateRange = async (req, res) => {
  try {
    const { groupId } = req.params;
    const fromDateInput = String(req.query?.fromDate || "").trim();
    const toDateInput = String(req.query?.toDate || fromDateInput).trim();

    if (!groupId || !fromDateInput || !toDateInput) {
      return res.status(400).json({ message: "groupId, fromDate and toDate are required" });
    }

    let dayStart = parseLocalDateBoundary(fromDateInput, "start");
    let dayEnd = parseLocalDateBoundary(toDateInput, "end");

    if (!dayStart || !dayEnd) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    if (dayStart > dayEnd) {
      [dayStart, dayEnd] = [
        parseLocalDateBoundary(toDateInput, "start"),
        parseLocalDateBoundary(fromDateInput, "end"),
      ];
    }

    const group = await Group.findById(groupId).select("name roomNo studentIds");
    if (!group) return res.status(404).json({ message: "Group not found" });

    let students = await Student.find({ _id: { $in: group.studentIds } })
      .populate("user", "name")
      .select("enrollmentNumber user");

    // Fallback: some datasets only maintain Student.group, not Group.studentIds.
    if (students.length === 0) {
      students = await Student.find({ group: groupId })
        .populate("user", "name")
        .select("enrollmentNumber user");
    }

    const sessions = await AttendanceSession.find({
      group: groupId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).sort({ date: 1, createdAt: 1 });

    const responseStudents = students.map((student) => {
      const studentObjectId = String(student._id);
      const userObjectId = String(student.user?._id || "");

      let presentCount = 0;
      let absentCount = 0;
      let notMarkedCount = 0;

      sessions.forEach((session) => {
        const record = session.records.find((r) => {
          const recId = String(r.student);
          return recId === studentObjectId || (userObjectId && recId === userObjectId);
        });

        if (record?.status === "present") {
          presentCount += 1;
          return;
        }

        if (record?.status === "absent") {
          absentCount += 1;
          return;
        }

        notMarkedCount += 1;
      });

      return {
        studentId: student._id,
        name: student.user?.name || "Unknown",
        enrollmentNumber: student.enrollmentNumber || "",
        summary: {
          totalSessions: sessions.length,
          presentCount,
          absentCount,
          notMarkedCount,
        },
      };
    });

    return res.json({
      message: "Group student attendance range fetched successfully",
      fromDate: toDateKey(dayStart),
      toDate: toDateKey(dayEnd),
      group: {
        _id: group._id,
        name: group.name,
        roomNo: group.roomNo || null,
      },
      totalSessions: sessions.length,
      students: responseStudents,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
