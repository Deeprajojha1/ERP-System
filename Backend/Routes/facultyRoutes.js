import express from "express";
import { facultyLogin, getFacultyProfile } from "../controllers/facultyAuthController.js";
import { getFacultyProfileByCredentials } from "../controllers/profileController.js";
import { applyFacultyLeave } from "../controllers/facultyLeaveController.js";
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
import isAuth from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

router.post("/login", facultyLogin);
router.get("/me", isAuth, getFacultyProfile);

// get faculty profile by email & password
router.post("/profile", getFacultyProfileByCredentials);

// Faculty Leave
router.post("/leave", isFacultyOrAdmin, applyFacultyLeave);

/* Attendance Routes (Faculty) */
router.get("/attendance/:groupId", isFacultyOrAdmin, getGroupAttendancePage);
router.post("/attendance/:groupId", isFacultyOrAdmin, markGroupAttendance);
router.put("/attendance/session/:sessionId", isFacultyOrAdmin, updateAttendance);
router.get("/attendance/group/:groupId/students", isFacultyOrAdmin, getStudentsByGroup);
router.get("/attendance/group/:groupId/course/:courseId", isFacultyOrAdmin, getAttendanceByGroupAndCourse);
router.get("/attendance/student/:studentId", isFacultyOrAdmin, getStudentOverallAttendance);
router.get("/attendance/student/:studentId/course/:courseId", isFacultyOrAdmin, getStudentAttendanceReport);
router.get("/attendance/session/:sessionId", isFacultyOrAdmin, getAttendanceById);

export default router;
