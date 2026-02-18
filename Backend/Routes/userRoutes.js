import express from "express";
import User from "../models/userModel.js";
import Student from "../models/Student.js";
import {
  login,
  sendOtp,
  verifyOtp,
  resetPassword,
  getUser,
  logout,
} from "../controllers/userController.js";
import { renderPdfFromHtml } from "../controllers/pdfController.js";
import { getStudentProfile } from "../controllers/profileController.js";
import {
  getStudentAttendanceReport,
  getStudentOverallAttendance,
} from "../controllers/attendanceController.js";
import upload from "../config/multerConfig.js";
import { uploadStudentProfileImage, deleteStudentProfileImage } from "../controllers/profileController.js";
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
router.post("/pdf/render", isAuth, renderPdfFromHtml);
router.post("/export/tabular", isAuth, exportTabularData);

// get student profile by email & password
router.post("/profile", getStudentProfile);

// get current student profile (authenticated user)
router.get("/student-profile", isAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-passwordHash -resetOtp -otpExpires -isOtpVerifed"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const student = await Student.findOne({ user: user._id })
      .populate("user", "name email aadharNumber phoneNumber DOB status profileImage")
      .populate("department")
      .populate("group");

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json({
      message: "Student profile fetched successfully",
      student,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
});

// Test route for debugging
router.post("/student/test-upload", isAuth, (req, res) => {
  console.log("[Test Route] Student test upload request received");
  console.log("[Test Route] isAuth passed, userId:", req.userId);
  res.json({ 
    message: "Test route working", 
    userId: req.userId,
    headers: Object.keys(req.headers),
    contentType: req.headers['content-type']
  });
});

// Student profile image upload
router.post("/student/upload-image", isAuth, (req, res, next) => {
  console.log("[User Route] Student upload image request received");
  console.log("[User Route] isAuth passed, userId:", req.userId);
  console.log("[User Route] Request headers:", Object.keys(req.headers));
  console.log("[User Route] Content-Type:", req.headers['content-type']);
  
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      console.error("[Multer Error in Student Route]", err);
      console.error("[Multer Error Code]:", err.code);
      console.error("[Multer Error Message]:", err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: "File too large. Maximum size is 5MB." });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: "Unexpected file field. Expected 'profileImage'." });
      }
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    console.log("[User Route] File processed successfully");
    console.log("[User Route] File details:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    } : 'No file');
    next();
  });
}, uploadStudentProfileImage);

// Student profile image deletion
router.delete("/student/delete-image", isAuth, deleteStudentProfileImage);

/* Student Attendance (self-view) */
router.get("/attendance/:studentId", isAuth, getStudentOverallAttendance);
router.get("/attendance/:studentId/course/:courseId", isAuth, getStudentAttendanceReport);

export default router;
