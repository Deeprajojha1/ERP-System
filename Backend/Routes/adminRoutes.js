import express from "express";
import {
  getAllStudents,
  getStudentById,
  addStudent,
  resetAllStudentPasswords,
  updateStudent,
  deleteStudent,
  hardDeleteStudent,
} from "../controllers/studentController.js";

import {
  getAllDepartments,
  getDepartmentById,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  hardDeleteDepartment,
} from "../controllers/departmentController.js";

import {
  getAllFaculty,
  getFacultyById,
  addFaculty,
  updateFaculty,
  deleteFaculty,
  hardDeleteFaculty,
  addRoutineToFaculty,
} from "../controllers/facultyController.js";

import {
  getAllFacultyLeaves,
  updateFacultyLeaveStatus,
} from "../controllers/facultyLeaveController.js";

import {
  getAllCourses,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  hardDeleteCourse,
} from "../controllers/courseController.js";

import {
  getAllGroups,
  getGroupById,
  addGroup,
  updateGroup,
  deleteGroup,
  hardDeleteGroup,
  getTimetableGroups,
  getGroupTimetable,
  createGroupTimetable,
  updateGroupTimetable,
} from "../controllers/groupController.js";
import {
  getAllExams,
  getExamById,
  addExam,
  updateExam,
  deleteExam,
  hardDeleteExam,
} from "../controllers/examController.js";
import {
  getAllResults,
  getResultById,
  addResult,
  updateResult,
  deleteResult,
  hardDeleteResult,
  getStudentResultSummary,
} from "../controllers/resultController.js";

import { 
  getAdminProfile, 
  uploadProfileImage, 
  deleteProfileImage 
} from "../controllers/profileController.js";

import {
  markAttendance,
  updateAttendance,
  getAttendanceById,
  getAttendanceByGroupAndCourse,
  getGroupStudentAttendanceByDate,
  deleteAttendance,
  hardDeleteAttendance,
  getStudentsByGroup,
  getStudentAttendanceReport,
  getStudentOverallAttendance,
  getDailyAttendanceSummary,
} from "../controllers/attendanceController.js";

import {
  getStatistics,
  getAllBooks,
  addBook,
  getBookById,
  updateBook,
  deleteBook,
  issueBook,
  getIssuedBooks,
  returnBook,
} from "../controllers/libraryController.js";
import {
  getAllLibrarians,
  getLibrarianById,
  addLibrarian,
  updateLibrarian,
  deleteLibrarian,
  hardDeleteLibrarian,
} from "../controllers/librarianController.js";
import { changePassword } from "../controllers/userController.js";
import { getTeachingLoad } from "../controllers/teachingLoadController.js";

import {
  getAssignmentsByGroup,
  getSingleAssignmentAdmin,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissionsAdmin,
} from "../controllers/assingmentController.js";
import {
  createAlert,
  getAllAlertsAdmin,
  updateAlertAdmin,
  deleteAlertAdmin,
} from "../controllers/alertController.js";

import { addClassroom, getClassrooms } from "../controllers/classroomController.js";
import {
  createExamBlueprint,
  getExamBlueprints,
  getExamBlueprintById,
  updateExamBlueprint,
  publishExamBlueprint,
  generateExamPaper,
  getExamPaper,
  reviewExamPaper,
  getExamStudentScores,
  closeExamBlueprint,
  deleteExamBlueprint,
} from "../controllers/aiExamController.js";
import {
  createFeeProgram,
  getFeeProgrammes,
  createFeeBatch,
  getFeeBatches,
  createFeeBranch,
  createStudentFeeDetails,
  getStudentFeeDetails,
  updateStudentFeeDetailsBenefits,
  createFeeDemand,
  generateFeeDemandFromProfile,
  getFeeDemandRequests,
  approveFeeDemandRequest,
  rejectFeeDemandRequest,
  getFeeDemands,
  createPayment,
  updatePaymentStatus,
  getPaymentHistory,
  handleRazorpayWebhook,
} from "../controllers/feeController.js";




import isAdmin from "../middlewares/isAdmin.js";
import upload from "../config/multerConfig.js";
import feeRateLimit from "../middlewares/feeRateLimit.js";
import feeSecurityHeaders from "../middlewares/feeSecurityHeaders.js";
import verifyGatewaySignature from "../middlewares/verifyGatewaySignature.js";

const router = express.Router();

/* =========================
   PROFILE
========================= */
router.post("/profile", isAdmin, getAdminProfile);
router.post("/change-password", isAdmin, changePassword);
router.post("/profile/upload-image", isAdmin, (req, res, next) => {
  console.log("[Admin Route] Upload request received");
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      console.error("[Multer Error in Route]", err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: "File too large. Maximum size is 5MB." });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: "Unexpected file field. Expected 'profileImage'." });
      }
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    console.log("[Admin Route] File processed successfully");
    next();
  });
}, uploadProfileImage);
router.delete("/profile/delete-image", isAdmin, deleteProfileImage);

/* =========================
   DEPARTMENT
========================= */
router.get("/department", isAdmin, getAllDepartments);
router.get("/department/:id", isAdmin, getDepartmentById);
router.post("/department", isAdmin, addDepartment);
router.put("/department/:id", isAdmin, updateDepartment);
router.patch("/department/:id/delete", isAdmin, deleteDepartment);
router.delete("/department/:id", isAdmin, hardDeleteDepartment);

/* =========================
   FACULTY
========================= */
router.get("/faculty", isAdmin, getAllFaculty);
router.get("/faculty/:id", isAdmin, getFacultyById);
router.post("/faculty", isAdmin, addFaculty);
router.put("/faculty/:id", isAdmin, updateFaculty);
router.patch("/faculty/:id/delete", isAdmin, deleteFaculty);
router.delete("/faculty/:id", isAdmin, hardDeleteFaculty);
router.post("/faculty/:id/routine", isAdmin, addRoutineToFaculty);

/* =========================
   FACULTY LEAVES
========================= */
router.get("/facultyleave", isAdmin, getAllFacultyLeaves);
router.patch("/facultyleave/:id/status", isAdmin, updateFacultyLeaveStatus);

/* =========================
   STUDENTS
========================= */
router.get("/student", isAdmin, getAllStudents);
router.get("/student/:id", isAdmin, getStudentById);
router.post("/student", isAdmin, addStudent);
router.post("/student/reset-password/all", isAdmin, resetAllStudentPasswords);
router.put("/student/:id", isAdmin, updateStudent);
router.patch("/student/:id/delete", isAdmin, deleteStudent);
router.delete("/student/:id", isAdmin, hardDeleteStudent);

/* =========================
   COURSES
========================= */
router.get("/course", isAdmin, getAllCourses);
router.get("/course/:id", isAdmin, getCourseById);
router.post("/course", isAdmin, addCourse);
router.put("/course/:id", isAdmin, updateCourse);
router.patch("/course/:id/delete", isAdmin, deleteCourse);
router.delete("/course/:id", isAdmin, hardDeleteCourse);

/* =========================
   GROUPS
========================= */
router.get("/group", isAdmin, getAllGroups);
router.get("/group/:id", isAdmin, getGroupById);
router.post("/group", isAdmin, addGroup);
router.put("/group/:id", isAdmin, updateGroup);
router.patch("/group/:id/delete", isAdmin, deleteGroup);
router.delete("/group/:id", isAdmin, hardDeleteGroup);

/* =========================
   TIMETABLE (GROUP-WISE)
========================= */
router.get("/timetable/group", isAdmin, getTimetableGroups);
router.get("/timetable/group/:groupId", isAdmin, getGroupTimetable);
router.post("/timetable/group/:groupId", isAdmin, createGroupTimetable);
router.put("/timetable/group/:groupId", isAdmin, updateGroupTimetable);
router.get("/teaching-load", isAdmin, getTeachingLoad);

/* =========================
   ATTENDANCE
========================= */
router.post("/attendance", isAdmin, markAttendance);
router.put("/attendance/:sessionId", isAdmin, updateAttendance);
router.get("/attendance/daily", isAdmin, getDailyAttendanceSummary);
router.get("/attendance/group/:groupId/students", isAdmin, getStudentsByGroup);
router.get("/attendance/group/:groupId/date/:date", isAdmin, getGroupStudentAttendanceByDate);
router.get(
  "/attendance/group/:groupId/course/:courseId",
  isAdmin,
  getAttendanceByGroupAndCourse,
);
router.get(
  "/attendance/student/:studentId",
  isAdmin,
  getStudentOverallAttendance,
);
router.get(
  "/attendance/student/:studentId/course/:courseId",
  isAdmin,
  getStudentAttendanceReport,
);
router.get("/attendance/:sessionId", isAdmin, getAttendanceById);
router.patch("/attendance/:sessionId/delete", isAdmin, deleteAttendance);
router.delete("/attendance/:sessionId", isAdmin, hardDeleteAttendance);

//Library
router.get("/librarian", isAdmin, getAllLibrarians);
router.get("/librarian/:id", isAdmin, getLibrarianById);
router.post("/librarian", isAdmin, addLibrarian);
router.put("/librarian/:id", isAdmin, updateLibrarian);
router.patch("/librarian/:id/delete", isAdmin, deleteLibrarian);
router.delete("/librarian/:id", isAdmin, hardDeleteLibrarian);

router.get("/library/statistics", getStatistics);

router.get("/library/books", getAllBooks);
router.post("/library/books", addBook);
router.get("/library/books/:id", getBookById);
router.put("/library/books/:id", updateBook);
router.delete("/library/books/:id", deleteBook);

router.post("/library/issues", issueBook);
router.get("/library/issues", getIssuedBooks);
router.patch("/library/issues/:id/return", returnBook);

/* =========================
   ASSIGNMENTS (ADMIN)
========================= */

// Get filtered assignments
router.get("/assignments", isAdmin, getAssignmentsByGroup);

// Get single assignment
router.get("/assignment/:id", isAdmin, getSingleAssignmentAdmin);

// Update assignment
router.put("/assignment/:id", isAdmin, updateAssignment);

// Delete assignment
router.delete("/assignment/:id", isAdmin, deleteAssignment);

// Get submissions
router.get(
  "/assignment/:id/submissions",
  isAdmin,
  getAssignmentSubmissionsAdmin
);

router.post("/alerts", isAdmin, createAlert);
router.get("/alerts", isAdmin, getAllAlertsAdmin);
router.put("/alerts/:id", isAdmin, updateAlertAdmin);
router.delete("/alerts/:id", isAdmin, deleteAlertAdmin);

// Classrooms
router.post("/classroom", isAdmin, addClassroom);
router.get("/classrooms", isAdmin, getClassrooms);

/* =========================
   EXAMS
========================= */
router.get("/exam", isAdmin, getAllExams);
router.get("/exam/:id", isAdmin, getExamById);
router.post("/exam", isAdmin, addExam);
router.put("/exam/:id", isAdmin, updateExam);
router.patch("/exam/:id/delete", isAdmin, deleteExam);
router.delete("/exam/:id", isAdmin, hardDeleteExam);

/* =========================
   RESULTS
========================= */
router.get("/result", isAdmin, getAllResults);
router.get("/result/:id", isAdmin, getResultById);
router.post("/result", isAdmin, addResult);
router.put("/result/:id", isAdmin, updateResult);
router.patch("/result/:id/delete", isAdmin, deleteResult);
router.delete("/result/:id", isAdmin, hardDeleteResult);
router.get("/result/student/:studentId/summary", isAdmin, getStudentResultSummary);

/* =========================
   AI EXAM (ADMIN)
========================= */
router.post("/exam-blueprint", isAdmin, createExamBlueprint);
router.get("/exam-blueprint", isAdmin, getExamBlueprints);
router.get("/exam-blueprint/:id", isAdmin, getExamBlueprintById);
router.put("/exam-blueprint/:id", isAdmin, updateExamBlueprint);
router.post("/exam-blueprint/:id/generate-paper", isAdmin, generateExamPaper);
router.get("/exam-blueprint/:id/paper", isAdmin, getExamPaper);
router.put("/exam-paper/:paperId/review", isAdmin, reviewExamPaper);
router.get("/exam-blueprint/:id/scores", isAdmin, getExamStudentScores);
router.patch("/exam-blueprint/:id/publish", isAdmin, publishExamBlueprint);
router.patch("/exam-blueprint/:id/close", isAdmin, closeExamBlueprint);
router.patch("/exam-blueprint/:id/delete", isAdmin, deleteExamBlueprint);

/* =========================
   FEES (ADMIN)
========================= */
router.post("/fee/program", isAdmin, feeSecurityHeaders, feeRateLimit, createFeeProgram);
router.get("/fee/program", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeProgrammes);
router.post("/fee/batch", isAdmin, feeSecurityHeaders, feeRateLimit, createFeeBatch);
router.get("/fee/batch", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeBatches);
router.post("/fee/branch", isAdmin, feeSecurityHeaders, feeRateLimit, createFeeBranch);
router.post("/fee/student-details", isAdmin, feeSecurityHeaders, feeRateLimit, createStudentFeeDetails);
router.get("/fee/student-details", isAdmin, feeSecurityHeaders, feeRateLimit, getStudentFeeDetails);
router.patch("/fee/student-details/:id/benefits", isAdmin, feeSecurityHeaders, feeRateLimit, updateStudentFeeDetailsBenefits);
router.post("/fee/demand", isAdmin, feeSecurityHeaders, feeRateLimit, createFeeDemand);
router.post("/fee/demand/generate", isAdmin, feeSecurityHeaders, feeRateLimit, generateFeeDemandFromProfile);
router.get("/fee/demand-request", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeDemandRequests);
router.patch("/fee/demand-request/:id/approve", isAdmin, feeSecurityHeaders, feeRateLimit, approveFeeDemandRequest);
router.patch("/fee/demand-request/:id/reject", isAdmin, feeSecurityHeaders, feeRateLimit, rejectFeeDemandRequest);
router.get("/fee/demand", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeDemands);
router.post("/fee/payment", isAdmin, feeSecurityHeaders, feeRateLimit, verifyGatewaySignature, createPayment);
router.patch("/fee/payment/:paymentId/status", isAdmin, feeSecurityHeaders, feeRateLimit, updatePaymentStatus);
router.get("/fee/payment", isAdmin, feeSecurityHeaders, feeRateLimit, getPaymentHistory);
router.post("/fee/razorpay/webhook", feeSecurityHeaders, handleRazorpayWebhook);

export default router;
