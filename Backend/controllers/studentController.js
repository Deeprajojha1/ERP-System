import mongoose from "mongoose";
import Student from "../models/Student.js";
import User from "../models/userModel.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import bcrypt from "bcryptjs";

/* ================= GET ALL STUDENTS ================= */

export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department")
      .populate("group");

    res.json({
      message: "Students fetched successfully",
      count: students.length,
      students,
    });
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

    const student = await Student.findById(id)
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department")
      .populate("group");

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.json({
      message: "Student fetched successfully",
      student,
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

    /* Check if user already exists */
    const existingUser = await User.findOne({ email });
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
      const hashedPassword = await bcrypt.hash(password, 10);
      const [user] = await User.create(
        [
          {
            name,
            email,
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

      const populatedStudent = await Student.findById(student._id)
        .populate("user", "name email aadharNumber phoneNumber DOB role status")
        .populate("department")
        .populate("group");

      res.status(201).json({
        message: "Student added successfully",
        student: populatedStudent,
      });
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

    res.json({
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= DELETE STUDENT ================= */

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    /* Delete student and associated user */
    await Student.findByIdAndDelete(id);
    await User.findByIdAndDelete(student.user);

    res.json({
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
