import express from "express";
import {
  markAttendance,
  markGroupAttendance,
  getGroupAttendancePage,
  updateAttendance,
  getAttendanceById,
  getAttendanceByGroupAndCourse,
  deleteAttendance,
  hardDeleteAttendance,
  getStudentsByGroup,
  getStudentAttendanceReport,
  getStudentOverallAttendance,
  getDailyAttendanceSummary,
} from "../controllers/attendanceController.js";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

/* Student/self reports */
router.get("/student/:studentId", isAuth, getStudentOverallAttendance);
router.get(
  "/student/:studentId/course/:courseId",
  isAuth,
  getStudentAttendanceReport
);

/* Group attendance read APIs */
router.get("/group/:groupId/students", isFacultyOrAdmin, getStudentsByGroup);
router.get(
  "/group/:groupId/course/:courseId",
  isFacultyOrAdmin,
  getAttendanceByGroupAndCourse
);
router.get("/group/:groupId", isFacultyOrAdmin, getGroupAttendancePage);

/* Marking/updating attendance */
router.post("/group/:groupId", isFacultyOrAdmin, markGroupAttendance);
router.post("/", isAdmin, markAttendance);
router.put("/session/:sessionId", isFacultyOrAdmin, updateAttendance);
router.get("/session/:sessionId", isFacultyOrAdmin, getAttendanceById);

/* Admin-only maintenance */
router.get("/daily", isAdmin, getDailyAttendanceSummary);
router.patch("/session/:sessionId/delete", isAdmin, deleteAttendance);
router.delete("/session/:sessionId", isAdmin, hardDeleteAttendance);

export default router;
