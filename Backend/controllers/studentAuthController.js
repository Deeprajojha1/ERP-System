import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import AttendanceSession from "../models/AttendanceSession.js";
import Course from "../models/Course.js";
import Group from "../models/Group.js";
import Section from "../models/Section.js";
import SectionCourse from "../models/SectionCourse.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";

const { isEmail } = validator;

const normalizeDisciplineStatus = (status) =>
  String(status || "clear").trim().toLowerCase();

const formatDisciplineDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const resolveStudentDisciplineForLogin = async (studentDetails) => {
  if (!studentDetails) return { allowed: true, studentDetails };

  const discipline = studentDetails.disciplineStatus || {};
  const normalizedStatus = normalizeDisciplineStatus(discipline.currentStatus);

  if (!["suspended", "detained"].includes(normalizedStatus)) {
    return { allowed: true, studentDetails };
  }

  const endDate = discipline.endDate ? new Date(discipline.endDate) : null;
  const endDateValid = endDate && !Number.isNaN(endDate.getTime());
  const now = new Date();

  if (endDateValid && endDate <= now) {
    const cleared = await Student.findByIdAndUpdate(
      studentDetails._id,
      {
        disciplineStatus: {
          currentStatus: "clear",
          reason: "",
          startDate: null,
          endDate: null,
          updatedBy: null,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate("department", "name code")
      .populate({
        path: "group",
        select: "name roomNo department courseIds",
        populate: {
          path: "courseIds",
          select: "code courseName department semester branch credit",
          populate: {
            path: "department",
            select: "name code",
          },
        },
      });

    return { allowed: true, studentDetails: cleared || studentDetails };
  }

  const endDateLabel = endDateValid ? formatDisciplineDate(endDate) : null;
  const message = endDateLabel
    ? `Access blocked. Student is ${normalizedStatus} until ${endDateLabel}.`
    : `Access blocked. Student is currently ${normalizedStatus}.`;

  return { allowed: false, message };
};

const verifyPasswordForLogin = async (passwordInput, passwordHash) => {
  const rawPassword = String(passwordInput ?? "");
  const hash = String(passwordHash ?? "");

  if (!rawPassword || !hash) return false;

  try {
    if (await bcrypt.compare(rawPassword, hash)) {
      return true;
    }
  } catch (_) {
    // Continue to fallback below.
  }

  const trimmedPassword = rawPassword.trim();
  if (trimmedPassword && trimmedPassword !== rawPassword) {
    try {
      return await bcrypt.compare(trimmedPassword, hash);
    } catch (_) {
      return false;
    }
  }

  return false;
};

const resolveStudentUserByLoginEmail = async (normalizedEmail) => {
  const directUser = await User.findOne({ email: normalizedEmail });
  if (directUser) return directUser;

  const studentByCollegeEmail = await Student.findOne({
    collegeEmail: normalizedEmail,
  }).select("user");

  if (!studentByCollegeEmail?.user) return null;
  return User.findById(studentByCollegeEmail.user);
};

/* ================= STUDENT LOGIN ================= */

export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email & Password required",
      });
    }

    if (!isEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    /* Find user */
    const user = await resolveStudentUserByLoginEmail(normalizedEmail);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!String(user.passwordHash || "").trim()) {
      return res.status(401).json({
        message:
          "Password is not set for this account. Please contact admin to reset your password.",
      });
    }

    /* Check role */
    if (user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Not a student account.",
      });
    }

    /* Compare password */
    const isMatch = await verifyPasswordForLogin(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* Generate JWT */
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* Store cookie */
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    /* Fetch student details */
    let studentDetails = await Student.findOne({ user: user._id })
      .populate("department", "name code")
      .populate({
        path: "group",
        select: "name roomNo department courseIds",
        populate: {
          path: "courseIds",
          select: "code courseName department semester branch credit",
          populate: {
            path: "department",
            select: "name code"
          }
        }
      });

    if (!studentDetails) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    const disciplineGate = await resolveStudentDisciplineForLogin(studentDetails);
    if (!disciplineGate.allowed) {
      return res.status(403).json({
        message: disciplineGate.message,
      });
    }
    studentDetails = disciplineGate.studentDetails || studentDetails;

    /* Fetch enrolled courses from group or enrollment collection */
    let enrolledCourses = [];
    
    // First, try to get courses from the group
    if (studentDetails.group && studentDetails.group.courseIds) {
      enrolledCourses = studentDetails.group.courseIds;
    }
    
    // If no courses from group, check Enrollment collection
    if (enrolledCourses.length === 0) {
      const enrollments = await Enrollment.find({ 
        student: studentDetails._id,
        status: "active"
      }).populate({
        path: "course",
        select: "code courseName department semester branch credit",
        populate: {
          path: "department",
          select: "name code"
        }
      });
      enrolledCourses = enrollments.map(enrollment => enrollment.course);
    }

    /* Fetch attendance data for all enrolled courses */
    const attendanceData = await Promise.all(
      enrolledCourses.map(async (course) => {
        const courseId = course._id;
        
        /* Get all attendance sessions for this student's group and course */
        const sessions = await AttendanceSession.find({
          group: studentDetails.group?._id,
          course: courseId,
        }).sort({ date: -1 });

        /* Calculate attendance stats */
        let presentCount = 0;
        let absentCount = 0;

        sessions.forEach((session) => {
          const studentRecord = session.records.find(
            (record) => record.student.toString() === studentDetails._id.toString()
          );

          if (studentRecord) {
            if (studentRecord.status === "present") {
              presentCount++;
            } else if (studentRecord.status === "absent") {
              absentCount++;
            }
          }
        });

        const totalSessions = presentCount + absentCount;
        const attendancePercentage = totalSessions > 0
          ? ((presentCount / totalSessions) * 100).toFixed(2)
          : 0;

        return {
          course: {
            _id: course._id,
            code: course.code,
            courseName: course.courseName,
          },
          totalSessions,
          presentCount,
          absentCount,
          attendancePercentage: parseFloat(attendancePercentage),
          recentSessions: sessions.slice(0, 5).map((session) => {
            const studentRecord = session.records.find(
              (record) => record.student.toString() === studentDetails._id.toString()
            );
            return {
              date: session.date,
              status: studentRecord ? studentRecord.status : "not-marked",
            };
          }),
        };
      })
    );

    /* Calculate overall attendance */
    const totalAllSessions = attendanceData.reduce((sum, data) => sum + data.totalSessions, 0);
    const totalPresentCount = attendanceData.reduce((sum, data) => sum + data.presentCount, 0);
    const overallAttendancePercentage = totalAllSessions > 0
      ? ((totalPresentCount / totalAllSessions) * 100).toFixed(2)
      : 0;

    /* Get today's schedule from group */
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = dayNames[new Date().getDay()];
    const todaySchedule = [];

    if (studentDetails.group) {
      const groupDetails = await Group.findById(studentDetails.group._id);
      const todayMap = groupDetails?.scheduleSlots?.get(today);

      if (todayMap) {
        for (const [lectureNumber, courseId] of todayMap.entries()) {
          const courseDoc = await Course.findById(courseId);
          if (courseDoc) {
            todaySchedule.push({
              lectureNumber: Number(lectureNumber),
              course: {
                _id: courseDoc._id,
                code: courseDoc.code,
                courseName: courseDoc.courseName,
              },
            });
          }
        }
      }

      todaySchedule.sort((a, b) => a.lectureNumber - b.lectureNumber);
    }

    res.json({
      message: "Student login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        role: user.role,
        status: user.status,
      },
      studentDetails: {
        _id: studentDetails._id,
        enrollmentNumber: studentDetails.enrollmentNumber,
        department: studentDetails.department,
        program: studentDetails.program,
        semester: studentDetails.semester,
        academicYear: studentDetails.academicYear,
        fatherName: studentDetails.fatherName,
        fatherPhoneNumber: studentDetails.fatherPhoneNumber,
        collegeEmail: studentDetails.collegeEmail,
        group: studentDetails.group,
        disciplineStatus: studentDetails.disciplineStatus,
      },
      enrolledCourses,
      attendanceData,
      overallAttendance: {
        totalSessions: totalAllSessions,
        presentCount: totalPresentCount,
        absentCount: totalAllSessions - totalPresentCount,
        percentage: parseFloat(overallAttendancePercentage),
      },
      today,
      todaySchedule,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= GET STUDENT PROFILE ================= */

export const getStudentProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Not a student account.",
      });
    }

    const studentDetails = await Student.findOne({ user: user._id })
      .populate("department", "name code")
      .populate({
        path: "group",
        select: "name roomNo department courseIds",
        populate: {
          path: "courseIds",
          select: "code courseName department semester branch credit",
          populate: {
            path: "department",
            select: "name code"
          }
        }
      });

    if (!studentDetails) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    /* Fetch enrolled courses from group or enrollment collection */
    let enrolledCourses = [];
    
    // First, try to get courses from the group
    if (studentDetails.group && studentDetails.group.courseIds) {
      enrolledCourses = studentDetails.group.courseIds;
    }
    
    // If no courses from group, check Enrollment collection
    if (enrolledCourses.length === 0) {
      const enrollments = await Enrollment.find({ 
        student: studentDetails._id,
        status: "active"
      }).populate({
        path: "course",
        select: "code courseName department semester branch credit",
        populate: {
          path: "department",
          select: "name code"
        }
      });
      enrolledCourses = enrollments.map(enrollment => enrollment.course);
    }

    /* Fetch attendance data for all enrolled courses */
    const attendanceData = await Promise.all(
      enrolledCourses.map(async (course) => {
        const courseId = course._id;
        
        const sessions = await AttendanceSession.find({
          group: studentDetails.group?._id,
          course: courseId,
        }).sort({ date: -1 });

        let presentCount = 0;
        let absentCount = 0;

        sessions.forEach((session) => {
          const studentRecord = session.records.find(
            (record) => record.student.toString() === studentDetails._id.toString()
          );

          if (studentRecord) {
            if (studentRecord.status === "present") {
              presentCount++;
            } else if (studentRecord.status === "absent") {
              absentCount++;
            }
          }
        });

        const totalSessions = presentCount + absentCount;
        const attendancePercentage = totalSessions > 0
          ? ((presentCount / totalSessions) * 100).toFixed(2)
          : 0;

        return {
          course: {
            _id: course._id,
            code: course.code,
            courseName: course.courseName,
          },
          totalSessions,
          presentCount,
          absentCount,
          attendancePercentage: parseFloat(attendancePercentage),
          recentSessions: sessions.slice(0, 5).map((session) => {
            const studentRecord = session.records.find(
              (record) => record.student.toString() === studentDetails._id.toString()
            );
            return {
              date: session.date,
              status: studentRecord ? studentRecord.status : "not-marked",
            };
          }),
        };
      })
    );

    const totalAllSessions = attendanceData.reduce((sum, data) => sum + data.totalSessions, 0);
    const totalPresentCount = attendanceData.reduce((sum, data) => sum + data.presentCount, 0);
    const overallAttendancePercentage = totalAllSessions > 0
      ? ((totalPresentCount / totalAllSessions) * 100).toFixed(2)
      : 0;

    /* Get today's schedule */
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = dayNames[new Date().getDay()];
    const todaySchedule = [];

    if (studentDetails.group) {
      const groupDetails = await Group.findById(studentDetails.group._id);
      const todayMap = groupDetails?.scheduleSlots?.get(today);

      if (todayMap) {
        for (const [lectureNumber, courseId] of todayMap.entries()) {
          const courseDoc = await Course.findById(courseId);
          if (courseDoc) {
            todaySchedule.push({
              lectureNumber: Number(lectureNumber),
              course: {
                _id: courseDoc._id,
                code: courseDoc.code,
                courseName: courseDoc.courseName,
              },
            });
          }
        }
      }

      todaySchedule.sort((a, b) => a.lectureNumber - b.lectureNumber);
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        role: user.role,
        status: user.status,
      },
      studentDetails: {
        _id: studentDetails._id,
        enrollmentNumber: studentDetails.enrollmentNumber,
        department: studentDetails.department,
        program: studentDetails.program,
        semester: studentDetails.semester,
        academicYear: studentDetails.academicYear,
        fatherName: studentDetails.fatherName,
        fatherPhoneNumber: studentDetails.fatherPhoneNumber,
        collegeEmail: studentDetails.collegeEmail,
        group: studentDetails.group,
        disciplineStatus: studentDetails.disciplineStatus,
      },
      enrolledCourses,
      attendanceData,
      overallAttendance: {
        totalSessions: totalAllSessions,
        presentCount: totalPresentCount,
        absentCount: totalAllSessions - totalPresentCount,
        percentage: parseFloat(overallAttendancePercentage),
      },
      today,
      todaySchedule,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= GET STUDENT COURSES ================= */

export const getStudentCourses = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Not a student account.",
      });
    }

    const studentDetails = await Student.findOne({ user: user._id })
      .populate({
        path: "group",
        select: "courseIds",
        populate: {
          path: "courseIds",
          select: "code courseName department semester branch credit",
          populate: {
            path: "department",
            select: "name code"
          }
        }
      });

    if (!studentDetails) {
      return res.status(200).json({
        message: "Student profile not found. Returning empty courses.",
        count: 0,
        academic: {
          semester: null,
          academicYear: null,
        },
        courses: [],
      });
    }

    /* Get courses from group or enrollment */
    let courses = [];
    
    if (studentDetails.group && studentDetails.group.courseIds) {
      courses = studentDetails.group.courseIds;
    }
    
    if (courses.length === 0) {
      const enrollments = await Enrollment.find({ 
        student: studentDetails._id,
        status: "active"
      }).populate({
        path: "course",
        select: "code courseName department semester branch credit",
        populate: {
          path: "department",
          select: "name code"
        }
      });
      courses = enrollments.map(enrollment => enrollment.course);
    }

    // Final fallback: infer courses from attendance history
    if (courses.length === 0) {
      const attendanceCourseIds = await AttendanceSession.distinct("course", {
        "records.student": studentDetails._id,
      });

      if (attendanceCourseIds.length > 0) {
        courses = await Course.find({ _id: { $in: attendanceCourseIds } })
          .select("code courseName department semester branch credit")
          .populate("department", "name code");
      }
    }

    // Fallback: section-course mappings by department + semester (+ optional section name match)
    if (courses.length === 0) {
      const sectionQuery = {
        department: studentDetails.department,
        semester: studentDetails.semester,
        isActive: true,
      };

      let sections = [];
      if (studentDetails.group?.name) {
        const sectionByName = await Section.findOne({
          ...sectionQuery,
          name: studentDetails.group.name,
        }).select("_id name");
        if (sectionByName) sections = [sectionByName];
      }

      if (sections.length === 0) {
        sections = await Section.find(sectionQuery).select("_id name");
      }

      if (sections.length > 0) {
        const sectionIds = sections.map((section) => section._id);
        const sectionCourseRows = await SectionCourse.find({
          section: { $in: sectionIds },
          isActive: true,
        }).populate({
          path: "course",
          select: "code courseName department semester branch credit",
          populate: { path: "department", select: "name code" },
        });

        const uniqueCourseMap = new Map();
        sectionCourseRows.forEach((row) => {
          const courseDoc = row?.course;
          if (!courseDoc?._id) return;
          uniqueCourseMap.set(String(courseDoc._id), courseDoc);
        });
        courses = Array.from(uniqueCourseMap.values());
      }
    }

    // Final fallback: all courses of student's department + semester
    if (courses.length === 0) {
      const deptSemesterCourses = await Course.find({
        department: studentDetails.department,
        semester: studentDetails.semester,
        isDeleted: { $ne: true },
      })
        .select("code courseName department semester branch credit")
        .populate("department", "name code");

      if (studentDetails.program) {
        const programLower = String(studentDetails.program).toLowerCase();
        const branchMatched = deptSemesterCourses.filter((courseDoc) => {
          if (!courseDoc?.branch) return true;
          const branchLower = String(courseDoc.branch).toLowerCase();
          return (
            branchLower.includes(programLower) || programLower.includes(branchLower)
          );
        });
        courses = branchMatched.length > 0 ? branchMatched : deptSemesterCourses;
      } else {
        courses = deptSemesterCourses;
      }
    }

    res.json({
      message: "Courses fetched successfully",
      count: courses.length,
      academic: {
        semester: studentDetails.semester || null,
        academicYear: studentDetails.academicYear || null,
      },
      courses,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= GET STUDENT ATTENDANCE SUMMARY ================= */

export const getStudentAttendanceSummary = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || user.role !== "student") {
      return res.status(403).json({
        message: "Access denied. Not a student account.",
      });
    }

    const studentDetails = await Student.findOne({ user: user._id })
      .populate({
        path: "group",
        select: "name courseIds",
        populate: {
          path: "courseIds",
          select: "code courseName"
        }
      });

    if (!studentDetails) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }

    /* Get courses from group or enrollment */
    let courses = [];
    
    if (studentDetails.group && studentDetails.group.courseIds) {
      courses = studentDetails.group.courseIds;
    }
    
    if (courses.length === 0) {
      const enrollments = await Enrollment.find({ 
        student: studentDetails._id,
        status: "active"
      }).populate("course", "code courseName");
      courses = enrollments.map(enrollment => enrollment.course);
    }

    const attendanceData = await Promise.all(
      courses.map(async (course) => {
        const courseId = course._id;
        
        const sessions = await AttendanceSession.find({
          group: studentDetails.group?._id,
          course: courseId,
        }).sort({ date: -1 });

        let presentCount = 0;
        let absentCount = 0;

        const sessionDetails = sessions.map((session) => {
          const studentRecord = session.records.find(
            (record) => record.student.toString() === studentDetails._id.toString()
          );

          if (studentRecord) {
            if (studentRecord.status === "present") {
              presentCount++;
            } else if (studentRecord.status === "absent") {
              absentCount++;
            }
          }

          return {
            _id: session._id,
            date: session.date,
            status: studentRecord ? studentRecord.status : "not-marked",
          };
        });

        const totalSessions = presentCount + absentCount;
        const attendancePercentage = totalSessions > 0
          ? ((presentCount / totalSessions) * 100).toFixed(2)
          : 0;

        return {
          course,
          totalSessions,
          presentCount,
          absentCount,
          attendancePercentage: parseFloat(attendancePercentage),
          sessions: sessionDetails,
        };
      })
    );

    res.json({
      message: "Attendance summary fetched successfully",
      group: studentDetails.group,
      attendanceData,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
