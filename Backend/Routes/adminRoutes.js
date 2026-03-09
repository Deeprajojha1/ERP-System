import express from "express";
import {
  getAllStudents,
  getStudentById,
  addStudent,
  resetAllStudentPasswords,
  updateStudent,
  deleteStudent,
  hardDeleteStudent,
  updateStudentDisciplineStatus,
} from "../controllers/studentController.js";
import {
  downloadStudentIdCard,
  bulkDownloadStudentIdCards,
} from "../controllers/studentIdCardController.js";

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
  getAllExamRegistrations,
  getExamRegistrationById,
  addExamRegistration,
  updateExamRegistration,
  deleteExamRegistration,
} from "../controllers/examRegistrationController.js";
import {
  getAllAdmitCards,
  getAdmitCardById,
  issueAdmitCard,
  holdAdmitCard,
  cancelAdmitCard,
  deleteAdmitCard,
} from "../controllers/admitCardController.js";

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
import { addWarden, deleteWarden } from "../controllers/wardenController.js";
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
import {
  getAllWardenSupportTicketsAdmin,
  updateWardenSupportTicketStatusAdmin,
} from "../controllers/wardenSupportTicketController.js";

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
  getFeeBulkTemplate,
  uploadFeeBulkFile,
  getFeeBulkJobs,
  getFeeBulkJobById,
  retryFeeBulkJob,
  createFeeReportExport,
  getFeeReportExports,
  getFeeReportExportById,
  downloadFeeReportExport,
  shareFeeReportExport,
  getFinancialSummary,
  getFinancialProgramBreakup,
  getFinancialCashflow,
  getStudentAnalyticsOverview,
  getStudentStatusDistribution,
  getStudentSegments,
  getStudentAnalyticsList,
  createFeeCalendarEvent,
  getFeeCalendarEvents,
  updateFeeCalendarEvent,
  deleteFeeCalendarEvent,
  signFeePaymentRequest,
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
router.patch("/student/:id/discipline-status", isAdmin, updateStudentDisciplineStatus);
router.patch("/student/:id/delete", isAdmin, deleteStudent);
router.delete("/student/:id", isAdmin, hardDeleteStudent);
router.get("/student/:studentId/id-card", isAdmin, downloadStudentIdCard);
router.post("/student/id-card/bulk", isAdmin, bulkDownloadStudentIdCards);

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
	router.post("/warden", isAdmin, addWarden);
	router.delete("/warden/:id", isAdmin, deleteWarden);

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

router.get("/warden-support-tickets", isAdmin, getAllWardenSupportTicketsAdmin);
router.patch("/warden-support-tickets/:id", isAdmin, updateWardenSupportTicketStatusAdmin);

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
   EXAM REGISTRATIONS
========================= */
router.get("/exam-registration", isAdmin, getAllExamRegistrations);
router.get("/exam-registration/:id", isAdmin, getExamRegistrationById);
router.post("/exam-registration", isAdmin, addExamRegistration);
router.put("/exam-registration/:id", isAdmin, updateExamRegistration);
router.patch("/exam-registration/:id/delete", isAdmin, deleteExamRegistration);

/* =========================
   ADMIT CARDS
========================= */
router.get("/admit-card", isAdmin, getAllAdmitCards);
router.get("/admit-card/:id", isAdmin, getAdmitCardById);
router.post("/admit-card/issue/:registrationId", isAdmin, issueAdmitCard);
router.patch("/admit-card/:id/hold", isAdmin, holdAdmitCard);
router.patch("/admit-card/:id/cancel", isAdmin, cancelAdmitCard);
router.patch("/admit-card/:id/delete", isAdmin, deleteAdmitCard);

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
router.post("/fee/payment/sign", isAdmin, feeSecurityHeaders, feeRateLimit, signFeePaymentRequest);
router.post("/fee/razorpay/webhook", feeSecurityHeaders, handleRazorpayWebhook);

/* =========================
   FEES - BULK OPS (ADMIN)
========================= */
router.get("/fee/bulk/template", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeBulkTemplate);
router.post("/fee/bulk/upload", isAdmin, feeSecurityHeaders, feeRateLimit, uploadFeeBulkFile);
router.get("/fee/bulk/jobs", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeBulkJobs);
router.get("/fee/bulk/jobs/:jobId", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeBulkJobById);
router.post("/fee/bulk/jobs/:jobId/retry", isAdmin, feeSecurityHeaders, feeRateLimit, retryFeeBulkJob);

/* =========================
   FEES - REPORTS (ADMIN)
========================= */
router.post("/fee/reports/export", isAdmin, feeSecurityHeaders, feeRateLimit, createFeeReportExport);
router.get("/fee/reports/export", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeReportExports);
router.get("/fee/reports/export/:exportId", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeReportExportById);
router.get("/fee/reports/export/:exportId/download", isAdmin, feeSecurityHeaders, feeRateLimit, downloadFeeReportExport);
router.post("/fee/reports/export/:exportId/share", isAdmin, feeSecurityHeaders, feeRateLimit, shareFeeReportExport);

/* =========================
   FEES - ANALYTICS (ADMIN)
========================= */
router.get("/fee/analytics/financial/summary", isAdmin, feeSecurityHeaders, feeRateLimit, getFinancialSummary);
router.get("/fee/analytics/financial/program-breakup", isAdmin, feeSecurityHeaders, feeRateLimit, getFinancialProgramBreakup);
router.get("/fee/analytics/financial/cashflow", isAdmin, feeSecurityHeaders, feeRateLimit, getFinancialCashflow);
router.get("/fee/analytics/students/overview", isAdmin, feeSecurityHeaders, feeRateLimit, getStudentAnalyticsOverview);
router.get("/fee/analytics/students/status-distribution", isAdmin, feeSecurityHeaders, feeRateLimit, getStudentStatusDistribution);
router.get("/fee/analytics/students/segments", isAdmin, feeSecurityHeaders, feeRateLimit, getStudentSegments);
router.get("/fee/analytics/students/list", isAdmin, feeSecurityHeaders, feeRateLimit, getStudentAnalyticsList);

/* =========================
   FEES - CALENDAR (ADMIN)
========================= */
router.post("/fee/calendar", isAdmin, feeSecurityHeaders, feeRateLimit, createFeeCalendarEvent);
router.get("/fee/calendar", isAdmin, feeSecurityHeaders, feeRateLimit, getFeeCalendarEvents);
router.put("/fee/calendar/:id", isAdmin, feeSecurityHeaders, feeRateLimit, updateFeeCalendarEvent);
router.patch("/fee/calendar/:id/delete", isAdmin, feeSecurityHeaders, feeRateLimit, deleteFeeCalendarEvent);

export default router;
