import AttendanceSession from "../models/AttendanceSession.js";
import Group from "../models/Group.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Course from "../models/Course.js";
import User from "../models/userModel.js";

/* ================================================================
   1. GET GROUP ATTENDANCE PAGE  (Faculty)
   GET  /api/faculty/attendance/:groupId?courseId=...&date=...
   Returns student list with name, enrollmentNumber, phoneNumber,
   fatherName, and today's attendance status (if already marked).
   ================================================================ */
export const getGroupAttendancePage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { courseId, date } = req.query;

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

    /* Fetch all students in the group with required fields */
    const students = await Student.find({ _id: { $in: group.studentIds } })
      .populate("user", "name phoneNumber")
      .select("enrollmentNumber fatherName user");

    /* Check if attendance was already marked today for this group + course */
    const targetDate = new Date(date || new Date());
    targetDate.setHours(0, 0, 0, 0);

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
   2. MARK / SUBMIT ATTENDANCE FOR A GROUP  (Faculty)
   POST  /api/faculty/attendance/:groupId
   body: { courseId, date?, records: [{ student, status }] }
   ================================================================ */
export const markGroupAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { courseId, date, records } = req.body;

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
    const sessionDate = new Date(date || new Date());
    sessionDate.setHours(0, 0, 0, 0);

    /* Upsert — create if new, overwrite if re-submitted */
    const session = await AttendanceSession.findOneAndUpdate(
      { date: sessionDate, group: groupId, course: courseId },
      { date: sessionDate, group: groupId, course: courseId, records },
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
    const { groupId, courseId, date, records } = req.body;

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
    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    /* Upsert — create if new, overwrite records if faculty re-submits */
    const session = await AttendanceSession.findOneAndUpdate(
      { date: sessionDate, group: groupId, course: courseId },
      { date: sessionDate, group: groupId, course: courseId, records },
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
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const students = await Student.find({ _id: { $in: group.studentIds } })
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

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
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
