import express from "express";
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
} from "../controllers/aiExamController.js";
import { getFacultyAlerts } from "../controllers/alertController.js";
import courseContentUpload from "../config/courseContentMulter.js";
import {
  getCourseContents,
  createCourseContent,
} from "../controllers/facultyCourseContentController.js";
import isAuth from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

router.post("/login", facultyLogin);
router.get("/me", isAuth, getFacultyProfile);

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

export default router;
