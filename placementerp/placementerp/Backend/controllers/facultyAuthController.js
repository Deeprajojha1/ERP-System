import User from "../models/userModel.js";
import Faculty from "../models/Faculty.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";

const { isEmail } = validator;

/* ---- Helper: populate course & group details inside the routine Map ---- */
const buildPopulatedRoutine = async (routineMap) => {
  if (!routineMap || routineMap.size === 0) return {};

  const populated = {};

  for (const [day, lectureMap] of routineMap.entries()) {
    populated[day] = {};
    for (const [lectureNum, detail] of lectureMap.entries()) {
      const [courseDoc, groupDoc] = await Promise.all([
        Course.findById(detail.course).select("code courseName department semester branch credit").populate("department", "name"),
        Group.findById(detail.group).select("name roomNo department").populate("department", "name"),
      ]);

      populated[day][lectureNum] = {
        course: courseDoc || { _id: detail.course },
        group: groupDoc || { _id: detail.group },
      };
    }
  }

  return populated;
};

/* ================= FACULTY LOGIN ================= */

export const facultyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email & Password required",
      });
    }

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

    /* Check role */
    if (user.role !== "faculty") {
      return res.status(403).json({
        message: "Access denied. Not a faculty account.",
      });
    }

    /* Compare password */
    const isMatch = await bcrypt.compare(password, user.passwordHash);

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

    /* Fetch faculty details */
    const facultyDetails = await Faculty.findOne({ user: user._id })
      .populate("department");

    /* Fetch schedule from Groups where this faculty is assigned */
    const assignedGroups = await Group.find({
      "courseFaculty.faculty": facultyDetails._id,
    }).populate("department");

    /* Build today's schedule for this faculty */
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = dayNames[new Date().getDay()];
    const todaySchedule = [];

    for (const group of assignedGroups) {
      /* Get course IDs (as strings) this faculty teaches in this group */
      const facultyCourseIds = group.courseFaculty
        .filter((cf) => cf.faculty.toString() === facultyDetails._id.toString())
        .map((cf) => cf.course.toString());

      /* Get today's lecture map from the nested Map: { lectureNumber: courseId } */
      const todayMap = group.scheduleSlots?.get(today);
      if (!todayMap) continue;

      /* Iterate over each lecture slot for today */
      for (const [lectureNumber, courseId] of todayMap.entries()) {
        if (!facultyCourseIds.includes(courseId.toString())) continue;

        const courseDoc = await Course.findById(courseId);
        todaySchedule.push({
          lectureNumber: Number(lectureNumber),
          courseId: courseDoc ? courseDoc._id : courseId,
          course: courseDoc
            ? { _id: courseDoc._id, code: courseDoc.code, courseName: courseDoc.courseName }
            : { _id: courseId },
          group: {
            _id: group._id,
            name: group.name,
            roomNo: group.roomNo,
          },
          attendanceUrl: `/api/faculty/attendance/${group._id}?courseId=${courseDoc ? courseDoc._id : courseId}`,
        });
      }
    }

    /* Sort by lecture number */
    todaySchedule.sort((a, b) => a.lectureNumber - b.lectureNumber);

    res.json({
      message: "Faculty login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        role: user.role,
      },
      facultyDetails: {
        _id: facultyDetails._id,
        employeeId: facultyDetails.employeeId,
        designation: facultyDetails.designation,
        department: facultyDetails.department,
        qualification: facultyDetails.qualification,
        joiningDate: facultyDetails.joiningDate,
        routine: await buildPopulatedRoutine(facultyDetails.routine),
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

/* ================= GET FACULTY PROFILE ================= */

export const getFacultyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || user.role !== "faculty") {
      return res.status(403).json({
        message: "Access denied. Not a faculty account.",
      });
    }

    const facultyDetails = await Faculty.findOne({ user: user._id })
      .populate("department");

    if (!facultyDetails) {
      return res.status(404).json({
        message: "Faculty profile not found",
      });
    }

    /* Fetch schedule from Groups where this faculty is assigned */
    const assignedGroups = await Group.find({
      "courseFaculty.faculty": facultyDetails._id,
    }).populate("department");

    /* Build today's schedule */
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = dayNames[new Date().getDay()];
    const todaySchedule = [];

    for (const group of assignedGroups) {
      const facultyCourseIds = group.courseFaculty
        .filter((cf) => cf.faculty.toString() === facultyDetails._id.toString())
        .map((cf) => cf.course.toString());

      const todayMap = group.scheduleSlots?.get(today);
      if (!todayMap) continue;

      for (const [lectureNumber, courseId] of todayMap.entries()) {
        if (!facultyCourseIds.includes(courseId.toString())) continue;

        const courseDoc = await Course.findById(courseId);
        todaySchedule.push({
          lectureNumber: Number(lectureNumber),
          courseId: courseDoc ? courseDoc._id : courseId,
          course: courseDoc
            ? { _id: courseDoc._id, code: courseDoc.code, courseName: courseDoc.courseName }
            : { _id: courseId },
          group: {
            _id: group._id,
            name: group.name,
            roomNo: group.roomNo,
          },
          attendanceUrl: `/api/faculty/attendance/${group._id}?courseId=${courseDoc ? courseDoc._id : courseId}`,
        });
      }
    }

    todaySchedule.sort((a, b) => a.lectureNumber - b.lectureNumber);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        role: user.role,
      },
      facultyDetails: {
        _id: facultyDetails._id,
        employeeId: facultyDetails.employeeId,
        designation: facultyDetails.designation,
        department: facultyDetails.department,
        qualification: facultyDetails.qualification,
        joiningDate: facultyDetails.joiningDate,
        routine: await buildPopulatedRoutine(facultyDetails.routine),
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
