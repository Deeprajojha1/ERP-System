import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Student from "../models/Student.js";
import AttendanceSession from "../models/AttendanceSession.js";
import Submission from "../models/Submission.js";
import Result from "../models/Result.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import StudentFeeDetails from "../models/feeStudentDetails.js";
import FeeDemand from "../models/feeDemand.js";
import FeePaymentHistory from "../models/feePaymentHistory.js";
import {
  createMyRazorpayOrder,
  verifyMyRazorpayPayment,
} from "./feeController.js";

const toDayLabel = (value) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

const getStudentContextFromParentRequest = async (req) => {
  const student = await Student.findOne({
    user: req.userId,
    isDeleted: false,
  })
    .populate("user", "name email phoneNumber aadharNumber")
    .populate("department", "name code")
    .populate("group", "name")
    .lean();

  if (!student?._id) return null;
  return student;
};

const computeAttendanceSummary = async (studentId) => {
  const sessions = await AttendanceSession.find({
    "records.student": studentId,
  })
    .populate("course", "code courseName")
    .sort({ date: -1 })
    .lean();

  const courseMap = new Map();
  const dailyMap = new Map();
  let present = 0;
  let absent = 0;

  for (const session of sessions) {
    const record = (session.records || []).find(
      (row) => String(row.student) === String(studentId)
    );
    if (!record) continue;

    if (record.status === "present") present += 1;
    if (record.status === "absent") absent += 1;

    const day = toDayLabel(session.date);
    if (day) {
      if (!dailyMap.has(day)) {
        dailyMap.set(day, {
          date: day,
          presentSessions: 0,
          absentSessions: 0,
          totalSessions: 0,
          courses: [],
        });
      }
      const dailyRow = dailyMap.get(day);
      dailyRow.totalSessions += 1;
      if (record.status === "present") dailyRow.presentSessions += 1;
      if (record.status === "absent") dailyRow.absentSessions += 1;
      dailyRow.courses.push({
        courseCode: session.course?.code || "",
        courseName: session.course?.courseName || "",
        status: record.status,
      });
    }

    const courseId = String(session.course?._id || session.course || "");
    if (!courseId) continue;
    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, {
        courseId,
        courseCode: session.course?.code || "",
        courseName: session.course?.courseName || "",
        present: 0,
        absent: 0,
      });
    }
    const row = courseMap.get(courseId);
    if (record.status === "present") row.present += 1;
    if (record.status === "absent") row.absent += 1;
  }

  const subjectWise = Array.from(courseMap.values()).map((row) => {
    const total = row.present + row.absent;
    return {
      ...row,
      total,
      percentage: total > 0 ? Number(((row.present / total) * 100).toFixed(2)) : 0,
    };
  });

  const dailySubjectAttendance = Array.from(dailyMap.values())
    .map((row) => ({
      ...row,
      dayPercentage:
        row.totalSessions > 0
          ? Number(((row.presentSessions / row.totalSessions) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const totalOverall = present + absent;
  return {
    overall: {
      present,
      absent,
      total: totalOverall,
      percentage: totalOverall > 0 ? Number(((present / totalOverall) * 100).toFixed(2)) : 0,
    },
    subjectWise,
    dailySubjectAttendance,
  };
};

const buildHostelDailyAttendance = async (studentId) => {
  const allocation = await HostelAllocation.findOne({
    student: studentId,
    status: "Active",
  })
    .populate("hostel", "name type")
    .populate("room", "roomNumber floorNumber")
    .lean();

  if (!allocation?._id) {
    return {
      isHosteller: false,
      hostel: null,
      room: null,
      dailyAttendance: [],
    };
  }

  const sessions = await AttendanceSession.find({
    "records.student": studentId,
  })
    .populate("course", "code courseName")
    .sort({ date: -1 })
    .limit(500)
    .lean();

  const dailyMap = new Map();

  for (const session of sessions) {
    const record = (session.records || []).find(
      (row) => String(row.student) === String(studentId)
    );
    if (!record) continue;

    const day = toDayLabel(session.date);
    if (!day) continue;

    if (!dailyMap.has(day)) {
      dailyMap.set(day, {
        date: day,
        presentSessions: 0,
        absentSessions: 0,
        totalSessions: 0,
        courses: [],
      });
    }
    const dayRow = dailyMap.get(day);
    dayRow.totalSessions += 1;
    if (record.status === "present") dayRow.presentSessions += 1;
    if (record.status === "absent") dayRow.absentSessions += 1;
    dayRow.courses.push({
      courseCode: session.course?.code || "",
      courseName: session.course?.courseName || "",
      status: record.status,
    });
  }

  const dailyAttendance = Array.from(dailyMap.values())
    .map((row) => ({
      ...row,
      dayPercentage:
        row.totalSessions > 0
          ? Number(((row.presentSessions / row.totalSessions) * 100).toFixed(2))
          : 0,
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    isHosteller: true,
    hostel: allocation.hostel
      ? {
          id: allocation.hostel._id,
          name: allocation.hostel.name || "",
          type: allocation.hostel.type || "",
        }
      : null,
    room: allocation.room
      ? {
          id: allocation.room._id,
          roomNumber: allocation.room.roomNumber || "",
          floorNumber: allocation.room.floorNumber ?? null,
        }
      : null,
    dailyAttendance,
  };
};

const getFeeSnapshot = async (student) => {
  const normalizedEnrollment = String(student?.enrollmentNumber || "").trim();
  const profile = await StudentFeeDetails.findOne({
    $or: [{ userId: student.user?._id || student.user }, { studentId: normalizedEnrollment }],
  }).lean();

  if (!profile?._id) {
    return {
      profile: null,
      demands: [],
      payments: [],
      summary: {
        totalDemand: 0,
        totalPaid: 0,
        totalDue: 0,
      },
    };
  }

  const demands = await FeeDemand.find({
    studentMongoId: profile._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const payments = await FeePaymentHistory.find({
    studentId: profile.studentId,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const totalDemand = demands.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
  const totalPaid = demands.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
  const totalDue = demands.reduce((sum, row) => sum + Number(row.dueAmount || 0), 0);

  return {
    profile,
    demands,
    payments,
    summary: {
      totalDemand: Number(totalDemand.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalDue: Number(totalDue.toFixed(2)),
    },
  };
};

export const parentLogin = async (req, res) => {
  try {
    const loginVia = String(req.body?.loginVia || "").trim().toLowerCase();
    const aadharNumber = String(req.body?.aadharNumber || "").trim();
    const parentPhoneNumber = String(
      req.body?.parentPhoneNumber || req.body?.phoneNumber || ""
    ).trim();

    const usePhoneLogin = loginVia === "phone" || (!aadharNumber && Boolean(parentPhoneNumber));

    let user = null;
    let student = null;

    if (usePhoneLogin) {
      if (!/^\d{10}$/.test(parentPhoneNumber)) {
        return res.status(400).json({
          message: "Valid 10-digit parentPhoneNumber is required",
        });
      }

      const matchedStudents = await Student.find({
        fatherPhoneNumber: parentPhoneNumber,
        isDeleted: false,
      }).select("_id user fatherPhoneNumber enrollmentNumber");

      if (!matchedStudents.length) {
        return res.status(404).json({
          message: "No student found with this parent phone number",
        });
      }

      if (matchedStudents.length > 1) {
        return res.status(409).json({
          message: "Multiple students found for this phone number. Please login using Aadhaar.",
        });
      }

      student = matchedStudents[0];
      user = await User.findOne({
        _id: student.user,
        role: "student",
      }).select("_id name email role aadharNumber");

      if (!user?._id) {
        return res.status(404).json({
          message: "Student account not found for this phone number",
        });
      }
    } else {
      if (!/^\d{12}$/.test(aadharNumber)) {
        return res.status(400).json({
          message: "Valid 12-digit aadharNumber is required",
        });
      }

      user = await User.findOne({
        aadharNumber,
        role: "student",
      }).select("_id name email role aadharNumber");

      if (!user?._id) {
        return res.status(404).json({
          message: "Student not found with this Aadhaar",
        });
      }

      student = await Student.findOne({
        user: user._id,
        isDeleted: false,
      }).select("_id user fatherPhoneNumber enrollmentNumber");

      if (!student?._id) {
        return res.status(404).json({
          message: "Student profile not found",
        });
      }
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: "parent",
        studentId: student._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Parent login successful",
      token,
      student: {
        id: student._id,
        userId: user._id,
        name: user.name || "",
        email: user.email || "",
        enrollmentNumber: student.enrollmentNumber || "",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Login failed" });
  }
};

export const getParentDashboard = async (req, res) => {
  try {
    const student = await getStudentContextFromParentRequest(req);
    if (!student?._id) {
      return res.status(404).json({ message: "Student profile not found for parent session" });
    }

    const [attendance, hostelInfo, feeInfo, results, assignments] = await Promise.all([
      computeAttendanceSummary(student._id),
      buildHostelDailyAttendance(student._id),
      getFeeSnapshot(student),
      Result.find({
        student: student._id,
        publishStatus: "PUBLISHED",
        isDeleted: false,
      })
        .populate("subjects.course", "code courseName")
        .sort({ semester: -1, resultDate: -1 })
        .lean(),
      Submission.find({
        student: student.user?._id || student.user,
      })
        .populate({
          path: "assignment",
          select: "title dueDate createdAt",
        })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const assignmentMarks = assignments.map((row) => ({
      submissionId: row._id,
      assignmentId: row.assignment?._id || null,
      title: row.assignment?.title || "",
      dueDate: row.assignment?.dueDate || null,
      submittedAt: row.createdAt || null,
      marks: row.marks,
      grade: row.grade || "",
      feedback: row.feedback || "",
    }));

    const examMarks = results.map((row) => ({
      resultId: row._id,
      academicYear: row.academicYear,
      semester: row.semester,
      resultDate: row.resultDate,
      overallStatus: row.overallStatus,
      semesterSummary: row.semesterSummary || null,
      cumulative: row.cumulative || null,
      subjects: (row.subjects || []).map((subject) => ({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        marksObtained: subject.marksObtained,
        maxMarks: subject.maxMarks,
        examType: subject.examType,
        grade: subject.grade,
        status: subject.status,
      })),
    }));

    return res.status(200).json({
      message: "Parent dashboard fetched successfully",
      student: {
        id: student._id,
        userId: student.user?._id || student.user,
        name: student.user?.name || "",
        email: student.user?.email || "",
        enrollmentNumber: student.enrollmentNumber || "",
        department: student.department || null,
        semester: student.semester || null,
        academicYear: student.academicYear || "",
        group: student.group || null,
      },
      attendance,
      hostel: hostelInfo,
      fees: feeInfo,
      assignmentMarks,
      examMarks,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch parent dashboard" });
  }
};

export const getParentFeeProfile = async (req, res) => {
  try {
    const student = await getStudentContextFromParentRequest(req);
    if (!student?._id) return res.status(404).json({ message: "Student profile not found" });
    const feeInfo = await getFeeSnapshot(student);
    return res.status(200).json({
      message: "Parent fee details fetched successfully",
      ...feeInfo,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch fee details" });
  }
};

export const createParentRazorpayOrder = async (req, res) => {
  const parentReq = {
    ...req,
    role: "student",
  };
  return createMyRazorpayOrder(parentReq, res);
};

export const verifyParentRazorpayPayment = async (req, res) => {
  const parentReq = {
    ...req,
    role: "student",
  };
  return verifyMyRazorpayPayment(parentReq, res);
};
