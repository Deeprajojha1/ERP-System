import express from "express";
import {
  login,
  sendOtp,
  verifyOtp,
  resetPassword,
  getUser,
  logout,
  updateProfileImage,
} from "../controllers/userController.js";
import { renderPdfFromHtml } from "../controllers/pdfController.js";
import { getStudentProfile } from "../controllers/profileController.js";
import {
  getStudentAttendanceReport,
  getStudentOverallAttendance,
} from "../controllers/attendanceController.js";
import { exportTabularData } from "../controllers/exportController.js";
import isAuth from "../middlewares/isAuth.js";
const router = express.Router();

router.post("/login", login);
// router.post("/register", register); // Removed - Only admin can create users via /api/admin/student or /api/admin/faculty
// Send OTP
router.post("/send-otp", sendOtp);

// Verify OTP
router.post("/verify-otp", verifyOtp);

// Reset Password
router.post("/reset-password", resetPassword);
// Logout
router.post("/logout", logout);
// get user
router.get("/me", isAuth, getUser);
router.put("/profile-image", isAuth, updateProfileImage);
router.post("/pdf/render", isAuth, renderPdfFromHtml);
router.post("/export/tabular", isAuth, exportTabularData);

// get student profile by email & password
router.post("/profile", getStudentProfile);

/* Student Attendance (self-view) */
router.get("/attendance/:studentId", isAuth, getStudentOverallAttendance);
router.get("/attendance/:studentId/course/:courseId", isAuth, getStudentAttendanceReport);

export default router;
