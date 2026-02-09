import mongoose from "mongoose";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import bcrypt from "bcryptjs";

/* ================= GET ALL FACULTY ================= */

export const getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find()
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department");

    res.json({
      message: "Faculty fetched successfully",
      count: faculty.length,
      faculty,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= GET FACULTY BY ID ================= */

export const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id)
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department");

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    res.json({
      message: "Faculty fetched successfully",
      faculty,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= ADD FACULTY ================= */

export const addFaculty = async (req, res) => {
  try {
    const {
      /* User fields - will be extracted and stored in User schema */
      name,
      email,
      password,
      aadharNumber,
      phoneNumber,
      DOB,
      /* Faculty fields */
      employeeId,
      department,
      designation,
      qualification,
      joiningDate,
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

    /* Check if employee ID already exists */
    const existingFaculty = await Faculty.findOne({ employeeId });
    if (existingFaculty) {
      return res.status(400).json({
        message: "Employee ID already exists",
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
            role: "faculty",
          },
        ],
        { session }
      );

      /* Create Faculty with user reference - only Faculty schema fields */
      const [faculty] = await Faculty.create(
        [
          {
            user: user._id,
            employeeId,
            department,
            designation,
            qualification,
            joiningDate,
            routine: new Map(),
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const populatedFaculty = await Faculty.findById(faculty._id)
        .populate("user", "name email aadharNumber phoneNumber DOB role status")
        .populate("department");

      res.status(201).json({
        message: "Faculty added successfully",
        faculty: populatedFaculty,
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

/* ================= UPDATE FACULTY ================= */

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const faculty = await Faculty.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department");

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    res.json({
      message: "Faculty updated successfully",
      faculty,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= DELETE FACULTY ================= */

export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    /* Delete faculty and associated user */
    await Faculty.findByIdAndDelete(id);
    await User.findByIdAndDelete(faculty.user);

    res.json({
      message: "Faculty deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= ADD ROUTINE TO FACULTY ================= */

export const addRoutineToFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { group, day, course, lectureNumber } = req.body;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    /* Set the lecture slot in the nested Map: routine.{day}.{lectureNumber} */
    await Faculty.findByIdAndUpdate(id, {
      $set: {
        [`routine.${day}.${lectureNumber}`]: { course, group },
      },
    });

    const populatedFaculty = await Faculty.findById(id)
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department");

    res.json({
      message: "Routine added successfully",
      faculty: populatedFaculty,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
