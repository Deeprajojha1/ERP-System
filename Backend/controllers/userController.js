import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import AttendanceSession from "../models/AttendanceSession.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import sendEmail from "../config/sendMail.js";

const { isEmail } = validator;

/* ---- Helper: populate course & group details inside the routine Map ---- */
const buildPopulatedRoutine = async (routineMap) => {
  if (!routineMap || routineMap.size === 0) return {};

  const populated = {};

  for (const [day, lectureMap] of routineMap.entries()) {
    populated[day] = {};
    for (const [lectureNum, detail] of lectureMap.entries()) {
      const [courseDoc, groupDoc] = await Promise.all([
        Course.findById(detail.course)
          .select("code courseName department semester branch credit")
          .populate("department", "name"),
        Group.findById(detail.group)
          .select("name roomNo department")
          .populate("department", "name"),
      ]);

      populated[day][lectureNum] = {
        course: courseDoc || { _id: detail.course },
        group: groupDoc || { _id: detail.group },
      };
    }
  }

  return populated;
};

const getRoleDetails = async (user) => {
  if (!user?.role) return null;

  if (user.role === "student") {
    return Student.findOne({ user: user._id })
      .populate("department")
      .populate("group");
  }

  if (user.role === "faculty") {
    return Faculty.findOne({ user: user._id })
      .populate("department");
  }

  return null;
};

/* ================= LOGIN ================= */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    /* Field check */
    if (!email || !password) {
      return res.status(400).json({
        message: "Email & Password required",
      });
    }

    /* Email validation */
    if (!isEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    /* Find user */
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    /* Compare password */
    const isMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* Generate JWT */
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    /* Store cookie */
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // required for SameSite "none" on HTTPS
      sameSite: isProduction ? "none" : "lax", // allow cross-site cookies in production
      maxAge: 24 * 60 * 60 * 1000,
    };

    console.log("[LOGIN] Setting auth cookie", {
      origin: req.headers.origin,
      isProduction,
      cookieOptions,
    });

    res.cookie("token", token, cookieOptions);

/* Fetch role-specific details */
    let roleDetails = null;
    let additionalData = {};

    if (user.role === "student") {
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

      if (studentDetails) {
        roleDetails = {
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
        };

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

        additionalData = {
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
        };
      }
    } else if (user.role === "faculty") {
      const facultyDoc = await Faculty.findOne({ user: user._id })
        .populate("department");

      if (facultyDoc) {
        roleDetails = {
          _id: facultyDoc._id,
          employeeId: facultyDoc.employeeId,
          designation: facultyDoc.designation,
          department: facultyDoc.department,
          qualification: facultyDoc.qualification,
          joiningDate: facultyDoc.joiningDate,
          routine: await buildPopulatedRoutine(facultyDoc.routine),
        };
      }
    }

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      roleDetails,
      ...additionalData,
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= REGISTER ================= */

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    /* Email validation */
    if (!isEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
    });

    res.json({
      message: "User registered",
      user,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* ================= SEND OTP ================= */

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    /* Email validation */
    if (!isEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email });
    }

    const otp = Math.floor(
      Math.random() * 9000 + 1000
    ).toString();

    user.resetOtp = otp;
    user.otpExpires =
      Date.now() + 5 * 60 * 1000;
    user.isOtpVerifed = false;

    await user.save({
      validateBeforeSave: false,
    });

    const isEmailSent = await sendEmail(
      email,
      otp
    );

    if (!isEmailSent) {
      return res.status(500).json({
        message:
          "OTP saved but email not sent",
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log(
      "Send OTP Error:",
      error.message
    );

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

/* ================= VERIFY OTP ================= */

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    /* Email validation */
    if (!isEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (
      !user ||
      !user.resetOtp ||
      !user.otpExpires
    ) {
      return res.status(401).json({
        message: "Invalid email or OTP",
      });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({
        message: "OTP Expired",
      });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    user.isOtpVerifed = true;
    user.resetOtp = undefined;
    user.otpExpires = undefined;

    await user.save({
      validateBeforeSave: false,
    });

    return res.status(200).json({
      message: "OTP Verified Successfully",
    });
  } catch (error) {
    console.log(
      "Verify OTP Error:",
      error.message
    );

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

/* ================= RESET PASSWORD ================= */

export const resetPassword = async (
  req,
  res
) => {
  try {
    const {
      email,
      newPassword,
      confirmPassword,
    } = req.body;

    /* Email validation */
    if (!isEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (
      !email ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message:
          "Passwords do not match",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email",
      });
    }

    if (!user.isOtpVerifed) {
      return res.status(400).json({
        message:
          "Please verify OTP first",
      });
    }

    const hashedPassword =
      await bcrypt.hash(newPassword, 10);

    /* FIXED FIELD */
    user.passwordHash = hashedPassword;

    user.resetOtp = null;
    user.otpExpires = null;
    user.isOtpVerifed = false;

    await user.save({
      validateBeforeSave: false,
    });

    return res.status(200).json({
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.log(
      "Reset Password Error:",
      error.message
    );

    return res.status(500).json({
      message: "Server Error",
    });
  }
};

/* ================= LOGOUT ================= */

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// get current user
export const getUser = async (req, res) => {
    try {
        console.log("getUser called with userId:", req.userId);
        const user = await User.findById(req.userId).select(
          "-passwordHash -resetOtp -otpExpires"
        );

        if (!user) {
            console.log("User not found in database");
            return res.status(404).json({
                message: "User not found",
            });
        }

        let roleDetails = await getRoleDetails(user);
        let additionalData = {};

        if (user.role === "student") {
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
                  select: "name code",
                },
              },
            });

          if (studentDetails) {
            roleDetails = {
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
            };

            let enrolledCourses = [];

            if (studentDetails.group && studentDetails.group.courseIds) {
              enrolledCourses = studentDetails.group.courseIds;
            }

            if (enrolledCourses.length === 0) {
              const enrollments = await Enrollment.find({
                student: studentDetails._id,
                status: "active",
              }).populate({
                path: "course",
                select: "code courseName department semester branch credit",
                populate: {
                  path: "department",
                  select: "name code",
                },
              });
              enrolledCourses = enrollments.map((enrollment) => enrollment.course);
            }

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
                    (record) =>
                      record.student.toString() === studentDetails._id.toString()
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
                const attendancePercentage =
                  totalSessions > 0
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
                      (record) =>
                        record.student.toString() === studentDetails._id.toString()
                    );
                    return {
                      date: session.date,
                      status: studentRecord ? studentRecord.status : "not-marked",
                    };
                  }),
                };
              })
            );

            const totalAllSessions = attendanceData.reduce(
              (sum, data) => sum + data.totalSessions,
              0
            );
            const totalPresentCount = attendanceData.reduce(
              (sum, data) => sum + data.presentCount,
              0
            );
            const overallAttendancePercentage =
              totalAllSessions > 0
                ? ((totalPresentCount / totalAllSessions) * 100).toFixed(2)
                : 0;

            const dayNames = [
              "sunday",
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
            ];
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

            additionalData = {
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
            };
          }
        } else if (user.role === "faculty") {
          const facultyDoc = await Faculty.findOne({ user: user._id }).populate(
            "department"
          );

          if (facultyDoc) {
            roleDetails = {
              _id: facultyDoc._id,
              employeeId: facultyDoc.employeeId,
              designation: facultyDoc.designation,
              department: facultyDoc.department,
              qualification: facultyDoc.qualification,
              joiningDate: facultyDoc.joiningDate,
              routine: await buildPopulatedRoutine(facultyDoc.routine),
            };
          }
        }

        console.log("User found:", user);
        return res.status(200).json({
            message: "User fetched successfully ",
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              aadharNumber: user.aadharNumber,
              phoneNumber: user.phoneNumber,
              DOB: user.DOB,
              role: user.role,
              status: user.status,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            },
            roleDetails,
            ...additionalData,
        });
    } catch (error) {
        console.log("getUser error:", error);
        return res.status(500).json({
            message: "Internal Server Error",
        });
    }
};
