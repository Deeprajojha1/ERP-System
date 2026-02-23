import AttendanceSession from "../models/AttendanceSession.js";
import Group from "../models/Group.js";

/**
 * Get subject-wise attendance report for all courses in a group
 * @route GET /api/admin/attendance/subject-wise-report
 * @query groupId - Group ID (required)
 * @query semester - Semester filter (optional)
 * @query fromDate - Start date (optional)
 * @query toDate - End date (optional)
 */
export const getSubjectWiseAttendanceReport = async (req, res) => {
  try {
    const { groupId, semester, fromDate, toDate } = req.query;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
      });
    }

    // Get group with students and courses
    const group = await Group.findById(groupId)
      .populate({
        path: "studentIds",
        populate: { path: "user", select: "name phoneNumber" },
      })
      .populate({
        path: "courseIds",
        match: semester ? { semester: parseInt(semester) } : {},
      })
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    if (!group.studentIds || group.studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No students found in this group",
        subjects: [],
        students: [],
      });
    }

    if (!group.courseIds || group.courseIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No courses found for this group",
        subjects: [],
        students: [],
      });
    }

    // Build date filter
    const dateFilter = {};
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate);
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    // Get subjects info
    const subjects = group.courseIds.map((course) => ({
      courseId: course._id.toString(),
      courseName: course.courseName || course.code,
      courseCode: course.code,
    }));

    // Fetch attendance for all courses
    const attendancePromises = subjects.map(async (subject) => {
      const query = {
        group: groupId,
        course: subject.courseId,
        isDeleted: false,
      };

      if (Object.keys(dateFilter).length > 0) {
        query.date = dateFilter;
      }

      const sessions = await AttendanceSession.find(query).lean();
      return {
        courseId: subject.courseId,
        sessions,
      };
    });

    const attendanceResults = await Promise.all(attendancePromises);

    // Build attendance map: courseId -> sessions
    const attendanceMap = new Map();
    attendanceResults.forEach((result) => {
      attendanceMap.set(result.courseId, result.sessions);
    });

    // Build student attendance data
    const studentsData = group.studentIds.map((student) => {
      const studentId = student._id.toString();
      const subjectAttendance = [];
      let totalPresent = 0;
      let totalClasses = 0;

      subjects.forEach((subject) => {
        const sessions = attendanceMap.get(subject.courseId) || [];
        let present = 0;
        let total = 0;

        sessions.forEach((session) => {
          const record = session.records.find(
            (att) => att.student.toString() === studentId
          );

          if (record) {
            total++;
            if (record.status === "present") {
              present++;
            }
          }
        });

        subjectAttendance.push({
          courseId: subject.courseId,
          present,
          total,
        });

        totalPresent += present;
        totalClasses += total;
      });

      return {
        _id: student._id,
        name: student.user?.name || "Unknown",
        fatherName: student.fatherName || "N/A",
        enrollmentNo: student.enrollmentNumber || "N/A",
        phone: student.user?.phoneNumber || student.phoneNumber || "N/A",
        subjectAttendance,
        totalPresent,
        totalClasses,
      };
    });

    // Sort by name
    studentsData.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      subjects,
      students: studentsData,
    });
  } catch (error) {
    console.error("Get subject-wise attendance report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance report",
      error: error.message,
    });
  }
};

/**
 * Get subject-wise attendance report for a single course
 * @route GET /api/admin/attendance/subject-report
 * @query groupId - Group ID (required)
 * @query courseId - Course ID (required)
 * @query fromDate - Start date (optional)
 * @query toDate - End date (optional)
 */
export const getSubjectAttendanceReport = async (req, res) => {
  try {
    const { groupId, courseId, fromDate, toDate } = req.query;

    if (!groupId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Group ID and Course ID are required",
      });
    }

    // Build date filter
    const dateFilter = {};
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate);
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = endDate;
    }

    // Get attendance sessions
    const query = {
      group: groupId,
      course: courseId,
      isDeleted: false,
    };

    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    const sessions = await AttendanceSession.find(query)
      .sort({ date: 1 })
      .lean();

    if (sessions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No attendance records found",
        dates: [],
        students: [],
      });
    }

    // Get all students in the group
    const group = await Group.findById(groupId)
      .populate({
        path: "studentIds",
        populate: { path: "user", select: "name phoneNumber" },
      })
      .lean();

    if (!group || !group.studentIds || group.studentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No students found in this group",
        dates: [],
        students: [],
      });
    }

    // Extract dates from sessions
    const dates = sessions.map((session) => {
      const date = new Date(session.date);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    });

    // Build student attendance data
    const studentsData = group.studentIds.map((student) => {
      const studentId = student._id.toString();
      const attendance = [];
      let totalPresent = 0;
      let totalClasses = 0;

      sessions.forEach((session) => {
        const record = session.records.find(
          (att) => att.student.toString() === studentId
        );

        if (record) {
          const status = record.status === "present" ? "P" : "A";
          attendance.push(status);
          if (status === "P") totalPresent++;
          totalClasses++;
        } else {
          attendance.push("-");
        }
      });

      return {
        _id: student._id,
        name: student.user?.name || "Unknown",
        fatherName: student.fatherName || "N/A",
        enrollmentNo: student.enrollmentNumber || "N/A",
        phone: student.user?.phoneNumber || student.phoneNumber || "N/A",
        attendance,
        totalPresent,
        totalClasses,
      };
    });

    // Sort by name
    studentsData.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      dates,
      students: studentsData,
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error("Get subject attendance report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance report",
      error: error.message,
    });
  }
};
