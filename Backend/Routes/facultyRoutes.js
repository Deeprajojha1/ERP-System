import express from "express";
import User from "../models/userModel.js";
import Faculty from "../models/Faculty.js";
import { facultyLogin, getFacultyProfile } from "../controllers/facultyAuthController.js";
import { getFacultyProfileByCredentials } from "../controllers/profileController.js";
import { applyFacultyLeave, getFacultyLeaves } from "../controllers/facultyLeaveController.js";
import {
	markGroupAttendance,
	getGroupAttendancePage,
	updateAttendance,
	getAttendanceById,
	getAttendanceByGroupAndCourse,
	getStudentsByGroup,
	getCourseStudentsForFaculty,
	getCourseGroupsForFaculty,
	getStudentAttendanceReport,
	getStudentOverallAttendance,
} from "../controllers/attendanceController.js";
import {
  getInvigilatorAdmitCards,
  verifyStudentAdmitCardAtHall,
} from "../controllers/facultyAdmitCardController.js";
import {
  getExamBlueprints,
  getExamBlueprintById,
  upsertExamSyllabus,
  generateExamPaper,
  getExamPaper,
  reviewExamPaper,
  getExamStudentScores,
  downloadExamScoresReport,
} from "../controllers/aiExamController.js";
import { getFacultyAlerts } from "../controllers/alertController.js";
import courseContentUpload from "../config/courseContentMulter.js";
import {
  getCourseContents,
  createCourseContent,
  updateCourseContent,
  deleteCourseContent,
} from "../controllers/facultyCourseContentController.js";
import {
  getFacultyCourseSyllabus,
  upsertFacultyCourseSyllabus,
} from "../controllers/facultySyllabusController.js";
import {
  getFacultyCourseQuestions,
  replyToCourseQuestion,
} from "../controllers/courseQuestionController.js";
import {
  getFacultyAssignmentSubmissions,
  gradeAssignmentSubmission,
  markMissingAssignmentSubmission,
  downloadUnitAwardSheet,
} from "../controllers/assignmentSubmissionController.js";
import isAuth from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

router.post("/login", facultyLogin);
router.get("/me", isAuth, getFacultyProfile);
router.put("/me", isAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { phoneNumber, DOB, gender, aadharNumber, qualification, specialization, university } = req.body;

    // Update user basic info
    const user = await User.findById(userId);
    if (!user || user.role !== "faculty") {
      return res.status(403).json({ message: "Access denied. Not a faculty account." });
    }
    user.phoneNumber = phoneNumber;
    user.DOB = DOB;
    user.gender = gender;
    user.aadharNumber = aadharNumber;
    await user.save();

    // Update faculty details
    const faculty = await Faculty.findOne({ user: userId });
    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }
    faculty.qualification = qualification;
    faculty.specialization = specialization;
    faculty.university = university;
    await faculty.save();

    return res.json({ message: "Profile updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update profile" });
  }
});

// get faculty profile by email & password
router.post("/profile", getFacultyProfileByCredentials);
router.get("/alerts", isFacultyOrAdmin, getFacultyAlerts);

// Faculty Leave
router.post("/leave", isFacultyOrAdmin, applyFacultyLeave);
router.get("/leave", isFacultyOrAdmin, getFacultyLeaves);

/* Course Content Routes (Faculty) */
router.get("/course-content", isFacultyOrAdmin, getCourseContents);
router.post("/course-content", isFacultyOrAdmin, (req, res, next) => {
  courseContentUpload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    return next();
  });
}, createCourseContent);
router.put("/course-content/:id", isFacultyOrAdmin, (req, res, next) => {
  courseContentUpload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    return next();
  });
}, updateCourseContent);
router.delete("/course-content/:id", isFacultyOrAdmin, deleteCourseContent);

/* Course Syllabus Routes (Faculty) */
router.get("/course-syllabus", isFacultyOrAdmin, getFacultyCourseSyllabus);
router.post("/course-syllabus", isFacultyOrAdmin, (req, res, next) => {
  courseContentUpload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    return next();
  });
}, upsertFacultyCourseSyllabus);

/* Course Question Routes (Faculty) */
router.get("/course-questions", isFacultyOrAdmin, getFacultyCourseQuestions);
router.post("/course-questions/:id/reply", isFacultyOrAdmin, replyToCourseQuestion);

/* Assignment Submission Routes (Faculty) */
router.get("/assignment-submissions", isFacultyOrAdmin, getFacultyAssignmentSubmissions);
router.get("/assignment-reports/unit-award-sheet", isFacultyOrAdmin, downloadUnitAwardSheet);
router.post("/assignment-submissions/:id/grade", isFacultyOrAdmin, gradeAssignmentSubmission);
router.post("/assignment-submissions/missing", isFacultyOrAdmin, markMissingAssignmentSubmission);

/* Course Students (Faculty/Admin helper) */
router.get("/courses/:courseId/students", isFacultyOrAdmin, getCourseStudentsForFaculty);
router.get("/courses/:courseId/groups", isFacultyOrAdmin, getCourseGroupsForFaculty);

/* Attendance Routes (Faculty) */
router.get("/attendance/:groupId", isFacultyOrAdmin, getGroupAttendancePage);
router.post("/attendance/:groupId", isFacultyOrAdmin, markGroupAttendance);
router.put("/attendance/session/:sessionId", isFacultyOrAdmin, updateAttendance);
router.get("/attendance/group/:groupId/students", isFacultyOrAdmin, getStudentsByGroup);
router.get("/attendance/group/:groupId/course/:courseId", isFacultyOrAdmin, getAttendanceByGroupAndCourse);
router.get("/attendance/student/:studentId", isFacultyOrAdmin, getStudentOverallAttendance);
router.get("/attendance/student/:studentId/course/:courseId", isFacultyOrAdmin, getStudentAttendanceReport);
router.get("/attendance/session/:sessionId", isFacultyOrAdmin, getAttendanceById);

/* Admit Card Routes (Invigilator) */
router.get("/admit-card", isFacultyOrAdmin, getInvigilatorAdmitCards);
router.patch("/admit-card/:id/verify", isFacultyOrAdmin, verifyStudentAdmitCardAtHall);

/* AI Exam Routes (Teacher/Admin) */
router.get("/exam-blueprint", isFacultyOrAdmin, getExamBlueprints);
router.get("/exam-blueprint/:id", isFacultyOrAdmin, getExamBlueprintById);
router.put("/exam-blueprint/:id/syllabus", isFacultyOrAdmin, upsertExamSyllabus);
router.post("/exam-blueprint/:id/generate-paper", isFacultyOrAdmin, generateExamPaper);
router.get("/exam-blueprint/:id/paper", isFacultyOrAdmin, getExamPaper);
router.put("/exam-paper/:paperId/review", isFacultyOrAdmin, reviewExamPaper);
router.get("/exam-blueprint/:id/scores", isFacultyOrAdmin, getExamStudentScores);
router.get("/exam-blueprint/:id/scores/download", isFacultyOrAdmin, downloadExamScoresReport);

export default router;
