import mongoose from "mongoose";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import bcrypt from "bcryptjs";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/submission.js";

const buildRoutineWithDetails = async (routineMap) => {
  if (!routineMap || (routineMap instanceof Map && routineMap.size === 0)) return {};

  const routineObj =
    routineMap instanceof Map ? Object.fromEntries(routineMap.entries()) : routineMap;
  const normalizeDaySlots = (daySlots) =>
    daySlots instanceof Map ? Object.fromEntries(daySlots.entries()) : daySlots;

  const courseIds = new Set();
  const groupIds = new Set();

  Object.values(routineObj || {}).forEach((daySlotsRaw) => {
    const daySlots = normalizeDaySlots(daySlotsRaw);
    if (!daySlots || typeof daySlots !== "object") return;
    Object.values(daySlots).forEach((slot) => {
      if (!slot) return;
      const courseId = slot.course?._id || slot.course;
      const groupId = slot.group?._id || slot.group;
      if (courseId) courseIds.add(String(courseId));
      if (groupId) groupIds.add(String(groupId));
    });
  });

  const [courses, groups] = await Promise.all([
    courseIds.size
      ? Course.find({ _id: { $in: Array.from(courseIds) } }).select("code courseName")
      : [],
    groupIds.size
      ? Group.find({ _id: { $in: Array.from(groupIds) } }).select("name roomNo")
      : [],
  ]);

  const courseMap = new Map(courses.map((c) => [String(c._id), c]));
  const groupMap = new Map(groups.map((g) => [String(g._id), g]));

  const resolved = {};

  Object.entries(routineObj || {}).forEach(([day, daySlotsRaw]) => {
    const daySlots = normalizeDaySlots(daySlotsRaw);
    resolved[day] = {};
    if (!daySlots || typeof daySlots !== "object") return;

    Object.entries(daySlots).forEach(([lectureNumber, slot]) => {
      if (!slot) return;

      const courseId = String(slot.course?._id || slot.course || "");
      const groupId = String(slot.group?._id || slot.group || "");

      const courseDoc = courseMap.get(courseId);
      const groupDoc = groupMap.get(groupId);

      resolved[day][lectureNumber] = {
        course: courseDoc
          ? {
              _id: courseDoc._id,
              code: courseDoc.code,
              courseName: courseDoc.courseName,
            }
          : slot.course || null,
        group: groupDoc
          ? {
              _id: groupDoc._id,
              name: groupDoc.name,
              roomNo: groupDoc.roomNo || null,
            }
          : slot.group || null,
      };
    });
  });

  return resolved;
};

const clearTimetableCacheForDepartments = async (departmentIds = []) => {
  const normalizedIds = [...new Set((departmentIds || []).filter(Boolean).map(String))];
  await redisClient.del("admin:timetable:groups");
  await redisClient.del("admin:timetable:groups:v2");

  if (normalizedIds.length === 0) return;

  const groups = await Group.find({
    department: { $in: normalizedIds },
    isDeleted: { $ne: true },
  }).select("_id");

  await Promise.all(
    groups.map((group) =>
      redisClient.del(`admin:timetable:group:${group._id}`)
    )
  );
};

/* ================= GET ALL FACULTY ================= */

export const getAllFaculty = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:faculty:all";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getAllFaculty cache read failed:", err.message || err);
      }
    }

    const faculty = await Faculty.find({ isDeleted: { $ne: true } })
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department");

    const responsePayload = {
      message: "Faculty fetched successfully",
      count: faculty.length,
      faculty,
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllFaculty cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
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

    const faculty = await Faculty.findOne({ _id: id, isDeleted: { $ne: true } })
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

      const responsePayload = {
        message: "Faculty added successfully",
        faculty: populatedFaculty,
      };

      try {
        await redisClient.del("admin:faculty:all");
        await clearTimetableCacheForDepartments([department]);
      } catch (err) {
        console.error("[Redis] addFaculty cache clear failed:", err.message || err);
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

/* ================= UPDATE FACULTY ================= */

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const existingFaculty = await Faculty.findById(id).select("department");

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

    const responsePayload = {
      message: "Faculty updated successfully",
      faculty,
    };

    try {
      await redisClient.del("admin:faculty:all");
      await clearTimetableCacheForDepartments([
        existingFaculty?.department,
        faculty.department?._id || faculty.department,
      ]);
    } catch (err) {
      console.error("[Redis] updateFaculty cache clear failed:", err.message || err);
    }

    res.json(responsePayload);
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

    const faculty = await Faculty.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    /* Soft-delete the associated user as well */
    await User.findByIdAndUpdate(faculty.user, { isDeleted: true });

    try {
      await redisClient.del("admin:faculty:all");
      await clearTimetableCacheForDepartments([faculty.department]);
    } catch (err) {
      console.error("[Redis] deleteFaculty cache clear failed:", err.message || err);
    }

    res.json({
      message: "Faculty deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= HARD DELETE FACULTY ================= */

export const hardDeleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found",
      });
    }

    /* Hard-delete faculty and associated user */
    await Faculty.findByIdAndDelete(id);
    await User.findByIdAndDelete(faculty.user);

    try {
      await redisClient.del("admin:faculty:all");
      await clearTimetableCacheForDepartments([faculty.department]);
    } catch (err) {
      console.error("[Redis] hardDeleteFaculty cache clear failed:", err.message || err);
    }

    res.json({
      message: "Faculty permanently deleted",
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

/*============== creating new assingment================== */

export const createAssignment = async (req, res) => {
  try {
    console.log("USER ID:", req.userId);

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, description, group, department, dueDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const faculty = await Faculty.findOne({ user: req.userId });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const assignment = new Assignment({
      title,
      description,
      group,
      department,
      dueDate,
      fileUrl: req.file.path,
      fileType: req.file.mimetype,
      uploadedBy: faculty._id,
    });

    await assignment.save();

    res.status(201).json({
      message: "Assignment uploaded successfully",
      assignment,
    });

  } catch (error) {
    console.error("Assignment upload failed:", error);
    res.status(500).json({ message: error.message });
  }
};



/*=============== Get Teacher Assignments ====================*/

export const getTeacherAssignments = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const faculty = await Faculty.findOne({ user: req.userId });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty record not found" });
    }

    const assignments = await Assignment.find({
      uploadedBy: faculty._id,
    })
      .populate("group", "name")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json(assignments);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




/*=================== Get Submissions of Assignment ====================*/

export const getAssignmentSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      assignment: req.params.id,
    })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/*================ Grade Submission ===================*/

export const gradeSubmission = async (req, res) => {
  try {
    const { marks, feedback } = req.body;

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { marks, feedback },
      { new: true }
    );

    res.json({
      success: true,
      message: "Submission graded successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
