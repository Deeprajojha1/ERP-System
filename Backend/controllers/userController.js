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
import { uploadImageToCloudinary } from "../config/cloudinaryUpload.js";
import {
  getPermissionsFromPermissionRoles,
  resolvePermissionsForUser,
} from "../utils/rolePermissions.js";

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

const resolveUserByLoginEmail = async (normalizedEmail) => {
  const directUser = await User.findOne({ email: normalizedEmail });
  if (directUser) return directUser;

  // Allow students to login with their college email when it differs from user.email.
  const studentByCollegeEmail = await Student.findOne({
    collegeEmail: normalizedEmail,
  }).select("user");

  if (!studentByCollegeEmail?.user) return null;
  return User.findById(studentByCollegeEmail.user);
};

const isLikelyBcryptHash = (value = "") =>
  /^\$2[aby]\$\d{2}\$/.test(String(value || "").trim());

const comparePlainPassword = (passwordInput, storedSecret) => {
  const rawPassword = String(passwordInput ?? "");
  const rawStoredSecret = String(storedSecret ?? "");
  if (!rawPassword || !rawStoredSecret) return false;
  if (rawPassword === rawStoredSecret) return true;
  const trimmedPassword = rawPassword.trim();
  return Boolean(trimmedPassword) && trimmedPassword === rawStoredSecret;
};

const verifyPasswordForLogin = async (passwordInput, passwordHash) => {
  const rawPassword = String(passwordInput ?? "");
  const hash = String(passwordHash ?? "");

  if (!rawPassword || !hash) return false;

  if (isLikelyBcryptHash(hash)) {
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
  }

  // Backward compatibility for legacy plain-text stored passwords.
  return comparePlainPassword(rawPassword, hash);
};

/* ================= LOGIN ================= */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    /* Field check */
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email & Password required",
      });
    }

    /* Email validation */
    if (!isEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    /* Find user */
    const user = await resolveUserByLoginEmail(normalizedEmail);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Accept legacy password storage (`password` or non-bcrypt `passwordHash`)
    // and migrate it to bcrypt hash after successful login.
    const legacyDoc = await User.collection.findOne(
      { _id: user._id },
      { projection: { passwordHash: 1, password: 1 } }
    );
    const passwordCandidates = [
      String(user.passwordHash || "").trim(),
      String(legacyDoc?.passwordHash || "").trim(),
      String(legacyDoc?.password || "").trim(),
    ].filter(Boolean);

    if (passwordCandidates.length === 0) {
      return res.status(401).json({
        message:
          "Password is not set for this account. Please contact admin to reset your password.",
      });
    }

    let isMatch = false;
    let matchedSecret = "";
    for (const candidate of passwordCandidates) {
      if (await verifyPasswordForLogin(password, candidate)) {
        isMatch = true;
        matchedSecret = candidate;
        break;
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const currentHash = String(user.passwordHash || "").trim();
    if (!isLikelyBcryptHash(currentHash)) {
      const rawPassword = String(password ?? "");
      const trimmedPassword = rawPassword.trim();
      const passwordToPersist =
        matchedSecret === trimmedPassword && trimmedPassword ? trimmedPassword : rawPassword;

      if (passwordToPersist) {
        user.passwordHash = await bcrypt.hash(passwordToPersist, 10);
        await user.save({ validateBeforeSave: false });
      }
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

      if (studentDetails) {
        const disciplineGate = await resolveStudentDisciplineForLogin(studentDetails);
        if (!disciplineGate.allowed) {
          return res.status(403).json({
            message: disciplineGate.message,
          });
        }

        studentDetails = disciplineGate.studentDetails || studentDetails;

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
          disciplineStatus: studentDetails.disciplineStatus,
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

        // Final fallback: infer enrolled courses from marked attendance
        if (enrolledCourses.length === 0) {
          const attendanceCourseIds = await AttendanceSession.distinct("course", {
            "records.student": studentDetails._id,
          });

          if (attendanceCourseIds.length > 0) {
            enrolledCourses = await Course.find({ _id: { $in: attendanceCourseIds } })
              .select("code courseName department semester branch credit")
              .populate("department", "name code");
          }
        }

        /* Fetch attendance data for all enrolled courses */
        const attendanceData = await Promise.all(
          enrolledCourses.map(async (course) => {
            const courseId = course._id;
            
            const sessions = await AttendanceSession.find({
              course: courseId,
              "records.student": studentDetails._id,
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
    } else if (user.role === "admin") {
      const [
        totalFaculty,
        totalActiveFaculty,
        totalInactiveFaculty,
        totalOnLeaveFaculty,
        totalStudentsEnrolled,
        totalActiveStudents,
        totalInactiveStudents,
        totalOnLeaveStudents,
        totalDepartments,
      ] = await Promise.all([
        // Faculty aggregates
        User.countDocuments({ role: "faculty" }),
        User.countDocuments({ role: "faculty", status: "active" }),
        User.countDocuments({ role: "faculty", status: "inactive" }),
        User.countDocuments({ role: "faculty", status: "onleave" }),
        // Student aggregates
        Student.countDocuments(),
        User.countDocuments({ role: "student", status: "active" }),
        User.countDocuments({ role: "student", status: "inactive" }),
        User.countDocuments({ role: "student", status: "leave" }),
        // Other
        Department.countDocuments(),
      ]);

      const departments = await Department.find({}, "name");

      const departmentFacultyStats = await Promise.all(
        departments.map(async (dept) => {
          const facultyCount = await Faculty.countDocuments({ department: dept._id });
          return {
            id: dept._id,
            name: dept.name,
            facultyCount,
          };
        })
      );

      additionalData = {
        totalFaculty,
        totalActiveFaculty,
        totalInactiveFaculty,
        totalOnLeaveFaculty,
        totalStudentsEnrolled,
        totalActiveStudents,
        totalInactiveStudents,
        totalOnLeaveStudents,
        totalDepartments,
        departmentFacultyStats,
      };
    }

    res.json({
      message: "Login successful",
      permissions: resolvePermissionsForUser(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        profileImage: user.profileImage || "",
        role: user.role,
        permissionRoles: Array.isArray(user.permissionRoles) ? user.permissionRoles : [],
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

export const createAdminUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      permissionRoles = [],
    } = req.body || {};

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const safeFirstName = String(firstName || "").trim();
    const safeLastName = String(lastName || "").trim();
    const safePassword = String(password || "");
    const selectedRoles = Array.isArray(permissionRoles)
      ? [...new Set(permissionRoles.map((role) => String(role || "").trim().toLowerCase()))]
      : [];
    const assignableRoles = new Set(["hod", "accounts", "exam", "placement"]);
    const validSelectedRoles = selectedRoles.filter((role) => assignableRoles.has(role));

    if (!safeFirstName || !safeLastName || !normalizedEmail || !safePassword) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required.",
      });
    }

    if (!isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    if (safePassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    if (!validSelectedRoles.length) {
      return res.status(400).json({
        message: "Select at least one permission role.",
      });
    }

    const primaryRole = validSelectedRoles[0];
    const permissions = getPermissionsFromPermissionRoles(validSelectedRoles);
    if (!permissions.length) {
      return res.status(400).json({
        message: "Selected permission roles are invalid.",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(safePassword, 10);
    const user = await User.create({
      name: `${safeFirstName} ${safeLastName}`.trim(),
      email: normalizedEmail,
      passwordHash,
      role: primaryRole,
      status: "active",
      permissionRoles: validSelectedRoles,
      permissions,
    });

    return res.status(201).json({
      message: "Admin user created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        permissionRoles: user.permissionRoles || [],
        permissions: resolvePermissionsForUser(user),
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to create admin user.",
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

      Math.random() * 900000 + 100000
    ).toString();

    user.resetOtp = otp;
    user.otpExpires =
      Date.now() + 5 * 60 * 1000;
    user.isOtpVerifed = false;

    await user.save({
      validateBeforeSave: false,
    });

    const emailResult = await sendEmail(email, otp);

    if (!emailResult?.ok) {
      const isAuthIssue =
        emailResult?.code === "SENDGRID_AUTH_FAILED" ||
        emailResult?.code === "SENDGRID_NOT_CONFIGURED" ||
        emailResult?.code === "SENDGRID_FROM_MISSING" ||
        emailResult?.code === "SENDGRID_SENDER_UNVERIFIED";
      const debugHint =
        process.env.NODE_ENV !== "production" && emailResult?.message
          ? ` (${emailResult.message})`
          : "";

      console.warn(
        `[OTP FALLBACK] Email delivery failed for ${email}.${debugHint}`
      );
      console.log(`[OTP FALLBACK] OTP for ${email}: ${otp}`);

      return res.status(200).json({
        message: isAuthIssue
          ? "OTP generated. Email service is unavailable right now; use the OTP from server console."
          : "OTP generated. Email delivery failed right now; use the OTP from server console.",
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
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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

/* ================= CHANGE PASSWORD (AUTHENTICATED USER) ================= */

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Confirm password does not match",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash || "");
    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    user.resetOtp = null;
    user.otpExpires = null;
    user.isOtpVerifed = false;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
    });
  }
};

/* ================= UPDATE PROFILE IMAGE (AUTHENTICATED USER) ================= */
export const updateProfileImage = async (req, res) => {
  try {
    const { profileImage } = req.body || {};

    if (typeof profileImage !== "string" || !profileImage.trim()) {
      return res.status(400).json({
        message: "profileImage is required and must be a non-empty string",
      });
    }

    if (!profileImage.startsWith("data:image/") && !/^https?:\/\//i.test(profileImage)) {
      return res.status(400).json({
        message: "profileImage must be a valid image data URL or image URL",
      });
    }

    const finalImageUrl = profileImage.startsWith("data:image/")
      ? await uploadImageToCloudinary({
          file: profileImage,
          publicId: `user_${req.userId}_${Date.now()}`,
        })
      : profileImage.trim();

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: finalImageUrl },
      { new: true, runValidators: true }
    ).select("-passwordHash -resetOtp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile image updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        profileImage: user.profileImage || "",
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
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
              disciplineStatus: studentDetails.disciplineStatus,
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

            if (enrolledCourses.length === 0) {
              const attendanceCourseIds = await AttendanceSession.distinct("course", {
                "records.student": studentDetails._id,
              });

              if (attendanceCourseIds.length > 0) {
                enrolledCourses = await Course.find({ _id: { $in: attendanceCourseIds } })
                  .select("code courseName department semester branch credit")
                  .populate("department", "name code");
              }
            }

            const attendanceData = await Promise.all(
              enrolledCourses.map(async (course) => {
                const courseId = course._id;

                const sessions = await AttendanceSession.find({
                  course: courseId,
                  "records.student": studentDetails._id,
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
        } else if (user.role === "admin") {
          const [
            totalFaculty,
            totalActiveFaculty,
            totalInactiveFaculty,
            totalOnLeaveFaculty,
            totalStudentsEnrolled,
            totalActiveStudents,
            totalInactiveStudents,
            totalOnLeaveStudents,
            totalDepartments,
          ] = await Promise.all([
            // Faculty aggregates
            User.countDocuments({ role: "faculty" }),
            User.countDocuments({ role: "faculty", status: "active" }),
            User.countDocuments({ role: "faculty", status: "inactive" }),
            User.countDocuments({ role: "faculty", status: "onleave" }),
            // Student aggregates
            Student.countDocuments(),
            User.countDocuments({ role: "student", status: "active" }),
            User.countDocuments({ role: "student", status: "inactive" }),
            User.countDocuments({ role: "student", status: "leave" }),
            // Other
            Department.countDocuments(),
          ]);

          const departments = await Department.find({}, "name");

          const departmentFacultyStats = await Promise.all(
            departments.map(async (dept) => {
              const facultyCount = await Faculty.countDocuments({ department: dept._id });
              return {
                id: dept._id,
                name: dept.name,
                facultyCount,
              };
            })
          );

          additionalData = {
            totalFaculty,
            totalActiveFaculty,
            totalInactiveFaculty,
            totalOnLeaveFaculty,
            totalStudentsEnrolled,
            totalActiveStudents,
            totalInactiveStudents,
            totalOnLeaveStudents,
            totalDepartments,
            departmentFacultyStats,
          };
        }

        console.log("User found:", user);
        return res.status(200).json({
            message: "User fetched successfully ",
            permissions: resolvePermissionsForUser(user),
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              aadharNumber: user.aadharNumber,
              phoneNumber: user.phoneNumber,
              DOB: user.DOB,
              profileImage: user.profileImage || "",
              role: user.role,
              permissionRoles: Array.isArray(user.permissionRoles) ? user.permissionRoles : [],
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
