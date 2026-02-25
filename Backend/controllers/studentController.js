import mongoose from "mongoose";
import Student from "../models/Student.js";
import User from "../models/userModel.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import bcrypt from "bcryptjs";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const clearTimetableGroupCardsCache = async () => {
  await redisClient.del("admin:timetable:groups");
  await redisClient.del("admin:timetable:groups:v2");
};

/* ================= GET ALL STUDENTS ================= */

export const getAllStudents = async (req, res) => {
  try {
    const full = req.query.full === "true";
    const noCache = req.query.noCache === "true";
    const cacheKey = full
      ? "admin:students:all:full:v1"
      : "admin:students:all:summary:v1";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getAllStudents cache read failed:", err.message || err);
      }
    }

    const students = await Student.find({ isDeleted: { $ne: true } })
      .populate({
        path: "user",
        select: full
          ? "name email aadharNumber phoneNumber DOB role status"
          : "name status",
      })
      .populate("department", full ? "" : "name")
      .populate("group");

    const responseStudents = full
      ? students
      : students.map((student) => ({
          _id: student._id,
          studentName: student.user?.name || "",
          rollNo: student.enrollmentNumber,
          department: student.department?.name || "",
          semester: student.semester,
          status: student.user?.status || "inactive",
          disciplineStatus: student?.disciplineStatus?.currentStatus || "clear",
        }));

    const responsePayload = {
      message: "Students fetched successfully",
      count: responseStudents.length,
      students: responseStudents,
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllStudents cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= GET STUDENT BY ID ================= */

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const full = req.query.full === "true";

    const student = await Student.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate({
        path: "user",
        select: full
          ? "name email aadharNumber phoneNumber DOB role status"
          : "name status",
      })
      .populate("department", full ? "" : "name")
      .populate("group");

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (full) {
      return res.json({
        message: "Student fetched successfully",
        student,
      });
    }

    const studentSummary = {
      studentName: student.user?.name || "",
      rollNo: student.enrollmentNumber,
      department: student.department?.name || "",
      semester: student.semester,
      status: student.user?.status || "inactive",
    };

    res.json({
      message: "Student fetched successfully",
      student: studentSummary,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= ADD STUDENT ================= */

export const addStudent = async (req, res) => {
  try {
    const {
      /* User fields - will be extracted and stored in User schema */
      name,
      email,
      password,
      aadharNumber,
      phoneNumber,
      DOB,
      /* Student fields */
      enrollmentNumber,
      department,
      program,
      semester,
      academicYear,
      fatherName,
      fatherPhoneNumber,
      collegeEmail,
      group,
    } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const passwordValue = String(password || "");

    if (
      !name ||
      !normalizedEmail ||
      !passwordValue ||
      !enrollmentNumber ||
      !department ||
      !program ||
      !semester ||
      !academicYear
    ) {
      return res.status(400).json({
        message:
          "Name, email, password, enrollment number, department, program, semester and academic year are required",
      });
    }

    if (passwordValue.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    /* Check if user already exists */
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    /* Check if aadhar already exists */
    if (aadharNumber) {
      const existingAadhar = await User.findOne({ aadharNumber });
      if (existingAadhar) {
        return res.status(400).json({
          message: "Aadhar number already registered",
        });
      }
    }

    /* Check if enrollment number already exists */
    const existingStudent = await Student.findOne({ enrollmentNumber });
    if (existingStudent) {
      return res.status(400).json({
        message: "Enrollment number already exists",
      });
    }

    /* ---- Start transaction so both docs succeed or both roll back ---- */
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      /* Create User first - extract only User schema fields */
      const hashedPassword = await bcrypt.hash(passwordValue, 10);
      const [user] = await User.create(
        [
          {
            name,
            email: normalizedEmail,
            aadharNumber,
            phoneNumber,
            DOB,
            passwordHash: hashedPassword,
            role: "student",
          },
        ],
        { session }
      );

      /* Create Student with user reference - only Student schema fields */
      const [student] = await Student.create(
        [
          {
            user: user._id,
            enrollmentNumber,
            department,
            program,
            semester,
            academicYear,
            fatherName,
            fatherPhoneNumber,
            collegeEmail,
            group: group || null,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      /* Auto-assign student to the group's studentIds array */
      if (group) {
        await Group.findByIdAndUpdate(group, {
          $addToSet: { studentIds: student._id },
        });
      }

      const populatedStudent = await Student.findById(student._id)
        .populate("user", "name email aadharNumber phoneNumber DOB role status")
        .populate("department")
        .populate("group");

      const responsePayload = {
        message: "Student added successfully",
        student: populatedStudent,
      };

      try {
        await redisClient.del("admin:students:all:summary:v1");
        await redisClient.del("admin:students:all:full:v1");
        if (group) {
          await redisClient.del("admin:groups:all");
        }
        await clearTimetableGroupCardsCache();
      } catch (err) {
        console.error("[Redis] addStudent cache clear failed:", err.message || err);
      }

      res.status(201).json(responsePayload);
    } catch (txnError) {
      await session.abortTransaction();
      session.endSession();
      throw txnError;
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= RESET ALL STUDENT PASSWORDS ================= */

export const resetAllStudentPasswords = async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    const passwordValue = String(newPassword || "");

    if (!passwordValue) {
      return res.status(400).json({
        message: "newPassword is required",
      });
    }

    if (passwordValue.length < 6) {
      return res.status(400).json({
        message: "newPassword must be at least 6 characters",
      });
    }

    const hashedPassword = await bcrypt.hash(passwordValue, 10);
    const result = await User.updateMany(
      { role: "student", isDeleted: { $ne: true } },
      {
        $set: {
          passwordHash: hashedPassword,
          resetOtp: null,
          otpExpires: null,
          isOtpVerifed: false,
        },
      }
    );

    try {
      await redisClient.del("admin:students:all:summary:v1");
      await redisClient.del("admin:students:all:full:v1");
    } catch (err) {
      console.error(
        "[Redis] resetAllStudentPasswords cache clear failed:",
        err.message || err
      );
    }

    return res.status(200).json({
      message: "Student passwords reset successfully",
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= UPDATE STUDENT ================= */

export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const student = await Student.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department")
      .populate("group");

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const responsePayload = {
      message: "Student updated successfully",
      student,
    };

    try {
      await redisClient.del("admin:students:all:summary:v1");
      await redisClient.del("admin:students:all:full:v1");
      await clearTimetableGroupCardsCache();
    } catch (err) {
      console.error("[Redis] updateStudent cache clear failed:", err.message || err);
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= UPDATE STUDENT DISCIPLINE STATUS ================= */

export const updateStudentDisciplineStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      currentStatus = "clear",
      reason = "",
      startDate = null,
      endDate = null,
    } = req.body || {};

    const normalizedStatus = String(currentStatus || "clear")
      .trim()
      .toLowerCase();

    if (!["clear", "suspended", "detained"].includes(normalizedStatus)) {
      return res.status(400).json({
        message: "currentStatus must be clear, suspended, or detained",
      });
    }

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ message: "Invalid startDate" });
    }
    if (parsedEndDate && Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: "Invalid endDate" });
    }
    if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        message: "endDate must be greater than or equal to startDate",
      });
    }

    const trimmedReason = String(reason || "").trim();
    if (normalizedStatus !== "clear" && !trimmedReason) {
      return res.status(400).json({
        message: "reason is required when status is suspended or detained",
      });
    }

    const disciplinePayload =
      normalizedStatus === "clear"
        ? {
            currentStatus: "clear",
            reason: "",
            startDate: null,
            endDate: null,
            updatedBy: req.userId || null,
            updatedAt: new Date(),
          }
        : {
            currentStatus: normalizedStatus,
            reason: trimmedReason,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            updatedBy: req.userId || null,
            updatedAt: new Date(),
          };

    const student = await Student.findByIdAndUpdate(
      id,
      { disciplineStatus: disciplinePayload },
      { new: true, runValidators: true }
    )
      .populate("user", "name email status")
      .populate("department", "name code")
      .populate("group", "name roomNo");

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    try {
      await redisClient.del("admin:students:all:summary:v1");
      await redisClient.del("admin:students:all:full:v1");
    } catch (err) {
      console.error(
        "[Redis] updateStudentDisciplineStatus cache clear failed:",
        err.message || err
      );
    }

    return res.json({
      message: "Student discipline status updated successfully",
      student,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= DELETE STUDENT ================= */

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    /* Soft-delete the associated user as well */
    await User.findByIdAndUpdate(student.user, { isDeleted: true });

    try {
      await redisClient.del("admin:students:all:summary:v1");
      await redisClient.del("admin:students:all:full:v1");
      await clearTimetableGroupCardsCache();
    } catch (err) {
      console.error("[Redis] deleteStudent cache clear failed:", err.message || err);
    }

    res.json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= HARD DELETE STUDENT ================= */

export const hardDeleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    /* Hard-delete student and associated user */
    await Student.findByIdAndDelete(id);
    await User.findByIdAndDelete(student.user);

    try {
      await redisClient.del("admin:students:all:summary:v1");
      await redisClient.del("admin:students:all:full:v1");
      await clearTimetableGroupCardsCache();
    } catch (err) {
      console.error("[Redis] hardDeleteStudent cache clear failed:", err.message || err);
    }

    res.json({
      message: "Student permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
