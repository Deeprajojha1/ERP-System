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
import { addWarden, deleteWarden } from "../controllers/wardenController.js";
import {
  backfillAdminPermissionMetadata,
  changePassword,
  createAdminUser,
  updateUserPermissionConfig,
} from "../controllers/userController.js";
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
import hasModuleAccess from "../middlewares/hasModuleAccess.js";
import upload from "../config/multerConfig.js";
import feeRateLimit from "../middlewares/feeRateLimit.js";
import feeSecurityHeaders from "../middlewares/feeSecurityHeaders.js";
import verifyGatewaySignature from "../middlewares/verifyGatewaySignature.js";

const router = express.Router();
const canDepartment = hasModuleAccess("module.department");
const canFaculty = hasModuleAccess("module.faculty");
const canStudents = hasModuleAccess("module.students");
const canStudentsWrite = hasModuleAccess("module.students_write");
const canStudentDiscipline = hasModuleAccess("module.student_discipline");
const canStudentIdCards = hasModuleAccess("module.student_id_cards");
const canCourses = hasModuleAccess("module.courses");
const canGroups = hasModuleAccess("module.groups");
const canClassrooms = hasModuleAccess("module.classrooms");
const canAssignment = hasModuleAccess("module.assignment");
const canTimetable = hasModuleAccess("module.timetable");
const canExams = hasModuleAccess("module.exams");
const canExamBlueprint = hasModuleAccess("module.exam_blueprint");
const canResults = hasModuleAccess("module.results");
const canAttendance = hasModuleAccess("module.attendance");
const canLeaves = hasModuleAccess("module.leaves");
const canFees = hasModuleAccess("module.fees");
const canAlerts = hasModuleAccess("module.alerts");
const canWardenSupport = hasModuleAccess("module.warden_support");
const canGeneralReports = hasModuleAccess("module.general_reports");
const canTeachingLoadReport = hasModuleAccess("module.teaching_load");
const canLibrary = hasModuleAccess("module.library");
const canSettings = hasModuleAccess("module.settings");
const canSettingsAdmin = hasModuleAccess("module.settings.admin");
const canSettingsSecurity = hasModuleAccess("module.settings.security");
const canSettingsProfile = hasModuleAccess("module.settings.profile");

/* =========================
   PROFILE
========================= */
router.post("/profile", isAdmin, canSettings, canSettingsProfile, getAdminProfile);
router.post("/change-password", isAdmin, canSettings, canSettingsSecurity, changePassword);
router.post("/user", isAdmin, canSettings, canSettingsAdmin, createAdminUser);
router.post("/user/:id/permissions", isAdmin, canSettings, canSettingsAdmin, updateUserPermissionConfig);
router.post(
  "/user/backfill-permissions",
  isAdmin,
  canSettings,
  canSettingsAdmin,
  backfillAdminPermissionMetadata
);
router.post("/profile/upload-image", isAdmin, canSettings, canSettingsProfile, (req, res, next) => {
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
router.delete("/profile/delete-image", isAdmin, canSettings, canSettingsProfile, deleteProfileImage);

/* =========================
   DEPARTMENT
========================= */
router.get("/department", isAdmin, canDepartment, getAllDepartments);
router.get("/department/:id", isAdmin, canDepartment, getDepartmentById);
router.post("/department", isAdmin, canDepartment, addDepartment);
router.put("/department/:id", isAdmin, canDepartment, updateDepartment);
router.patch("/department/:id/delete", isAdmin, canDepartment, deleteDepartment);
router.delete("/department/:id", isAdmin, canDepartment, hardDeleteDepartment);

/* =========================
   FACULTY
========================= */
router.get("/faculty", isAdmin, hasModuleAccess("module.faculty", ["exam"]), getAllFaculty);
router.get("/faculty/:id", isAdmin, hasModuleAccess("module.faculty", ["exam"]), getFacultyById);
router.post("/faculty", isAdmin, canFaculty, addFaculty);
router.put("/faculty/:id", isAdmin, canFaculty, updateFaculty);
router.patch("/faculty/:id/delete", isAdmin, canFaculty, deleteFaculty);
router.delete("/faculty/:id", isAdmin, canFaculty, hardDeleteFaculty);
router.post("/faculty/:id/routine", isAdmin, canFaculty, addRoutineToFaculty);

/* =========================
   FACULTY LEAVES
========================= */
router.get("/facultyleave", isAdmin, canLeaves, getAllFacultyLeaves);
router.patch("/facultyleave/:id/status", isAdmin, canLeaves, updateFacultyLeaveStatus);

/* =========================
   STUDENTS
========================= */
router.get("/student", isAdmin, canStudents, getAllStudents);
router.get("/student/:id", isAdmin, canStudents, getStudentById);
router.post("/student", isAdmin, canStudents, canStudentsWrite, addStudent);
router.post("/student/reset-password/all", isAdmin, canStudents, canStudentsWrite, resetAllStudentPasswords);
router.put("/student/:id", isAdmin, canStudents, canStudentsWrite, updateStudent);
router.patch("/student/:id/discipline-status", isAdmin, canStudentDiscipline, updateStudentDisciplineStatus);
router.patch("/student/:id/delete", isAdmin, canStudents, canStudentsWrite, deleteStudent);
router.delete("/student/:id", isAdmin, canStudents, canStudentsWrite, hardDeleteStudent);
router.get("/student/:studentId/id-card", isAdmin, canStudentIdCards, downloadStudentIdCard);
router.post("/student/id-card/bulk", isAdmin, canStudentIdCards, bulkDownloadStudentIdCards);

/* =========================
   COURSES
========================= */
router.get("/course", isAdmin, hasModuleAccess("module.courses", ["exam"]), getAllCourses);
router.get("/course/:id", isAdmin, hasModuleAccess("module.courses", ["exam"]), getCourseById);
router.post("/course", isAdmin, canCourses, addCourse);
router.put("/course/:id", isAdmin, canCourses, updateCourse);
router.patch("/course/:id/delete", isAdmin, canCourses, deleteCourse);
router.delete("/course/:id", isAdmin, canCourses, hardDeleteCourse);

/* =========================
   GROUPS
========================= */
router.get("/group", isAdmin, hasModuleAccess("module.groups", ["exam"]), getAllGroups);
router.get("/group/:id", isAdmin, hasModuleAccess("module.groups", ["exam"]), getGroupById);
router.post("/group", isAdmin, canGroups, addGroup);
router.put("/group/:id", isAdmin, canGroups, updateGroup);
router.patch("/group/:id/delete", isAdmin, canGroups, deleteGroup);
router.delete("/group/:id", isAdmin, canGroups, hardDeleteGroup);

/* =========================
   TIMETABLE (GROUP-WISE)
========================= */
router.get("/timetable/group", isAdmin, canTimetable, getTimetableGroups);
router.get("/timetable/group/:groupId", isAdmin, canTimetable, getGroupTimetable);
router.post("/timetable/group/:groupId", isAdmin, canTimetable, createGroupTimetable);
router.put("/timetable/group/:groupId", isAdmin, canTimetable, updateGroupTimetable);
router.get("/teaching-load", isAdmin, canTeachingLoadReport, getTeachingLoad);

/* =========================
   ATTENDANCE
========================= */
router.post("/attendance", isAdmin, canAttendance, markAttendance);
router.put("/attendance/:sessionId", isAdmin, canAttendance, updateAttendance);
router.get("/attendance/daily", isAdmin, canAttendance, getDailyAttendanceSummary);
router.get("/attendance/group/:groupId/students", isAdmin, canAttendance, getStudentsByGroup);
router.get("/attendance/group/:groupId/date/:date", isAdmin, canAttendance, getGroupStudentAttendanceByDate);
router.get(
  "/attendance/group/:groupId/course/:courseId",
  isAdmin,
  canAttendance,
  getAttendanceByGroupAndCourse,
);
router.get(
  "/attendance/student/:studentId",
  isAdmin,
  canAttendance,
  getStudentOverallAttendance,
);
router.get(
  "/attendance/student/:studentId/course/:courseId",
  isAdmin,
  canAttendance,
  getStudentAttendanceReport,
);
router.get("/attendance/:sessionId", isAdmin, canAttendance, getAttendanceById);
router.patch("/attendance/:sessionId/delete", isAdmin, canAttendance, deleteAttendance);
router.delete("/attendance/:sessionId", isAdmin, canAttendance, hardDeleteAttendance);

//Library
router.get("/librarian", isAdmin, canLibrary, getAllLibrarians);
router.get("/librarian/:id", isAdmin, canLibrary, getLibrarianById);
router.post("/librarian", isAdmin, canLibrary, addLibrarian);
router.put("/librarian/:id", isAdmin, canLibrary, updateLibrarian);
router.patch("/librarian/:id/delete", isAdmin, canLibrary, deleteLibrarian);
router.delete("/librarian/:id", isAdmin, canLibrary, hardDeleteLibrarian);
	router.post("/warden", isAdmin, canWardenSupport, addWarden);
	router.delete("/warden/:id", isAdmin, canWardenSupport, deleteWarden);

router.get("/library/statistics", isAdmin, canLibrary, getStatistics);

router.get("/library/books", isAdmin, canLibrary, getAllBooks);
router.post("/library/books", isAdmin, canLibrary, addBook);
router.get("/library/books/:id", isAdmin, canLibrary, getBookById);
router.put("/library/books/:id", isAdmin, canLibrary, updateBook);
router.delete("/library/books/:id", isAdmin, canLibrary, deleteBook);

router.post("/library/issues", isAdmin, canLibrary, issueBook);
router.get("/library/issues", isAdmin, canLibrary, getIssuedBooks);
router.patch("/library/issues/:id/return", isAdmin, canLibrary, returnBook);

/* =========================
   ASSIGNMENTS (ADMIN)
========================= */

// Get filtered assignments
router.get("/assignments", isAdmin, canAssignment, getAssignmentsByGroup);

// Get single assignment
router.get("/assignment/:id", isAdmin, canAssignment, getSingleAssignmentAdmin);

// Update assignment
router.put("/assignment/:id", isAdmin, canAssignment, updateAssignment);

// Delete assignment
router.delete("/assignment/:id", isAdmin, canAssignment, deleteAssignment);

// Get submissions
router.get(
  "/assignment/:id/submissions",
  isAdmin,
  canAssignment,
  getAssignmentSubmissionsAdmin
);

router.post("/alerts", isAdmin, canAlerts, createAlert);
router.get("/alerts", isAdmin, canAlerts, getAllAlertsAdmin);
router.put("/alerts/:id", isAdmin, canAlerts, updateAlertAdmin);
router.delete("/alerts/:id", isAdmin, canAlerts, deleteAlertAdmin);

router.get("/warden-support-tickets", isAdmin, canWardenSupport, getAllWardenSupportTicketsAdmin);
router.patch("/warden-support-tickets/:id", isAdmin, canWardenSupport, updateWardenSupportTicketStatusAdmin);

// Classrooms
router.post("/classroom", isAdmin, canClassrooms, addClassroom);
router.get("/classrooms", isAdmin, canClassrooms, getClassrooms);

/* =========================
   EXAMS
========================= */
router.get("/exam", isAdmin, canExams, getAllExams);
router.get("/exam/:id", isAdmin, canExams, getExamById);
router.post("/exam", isAdmin, canExams, addExam);
router.put("/exam/:id", isAdmin, canExams, updateExam);
router.patch("/exam/:id/delete", isAdmin, canExams, deleteExam);
router.delete("/exam/:id", isAdmin, canExams, hardDeleteExam);

/* =========================
   EXAM REGISTRATIONS
========================= */
router.get("/exam-registration", isAdmin, canExams, getAllExamRegistrations);
router.get("/exam-registration/:id", isAdmin, canExams, getExamRegistrationById);
router.post("/exam-registration", isAdmin, canExams, addExamRegistration);
router.put("/exam-registration/:id", isAdmin, canExams, updateExamRegistration);
router.patch("/exam-registration/:id/delete", isAdmin, canExams, deleteExamRegistration);

/* =========================
   ADMIT CARDS
========================= */
router.get("/admit-card", isAdmin, canExams, getAllAdmitCards);
router.get("/admit-card/:id", isAdmin, canExams, getAdmitCardById);
router.post("/admit-card/issue/:registrationId", isAdmin, canExams, issueAdmitCard);
router.patch("/admit-card/:id/hold", isAdmin, canExams, holdAdmitCard);
router.patch("/admit-card/:id/cancel", isAdmin, canExams, cancelAdmitCard);
router.patch("/admit-card/:id/delete", isAdmin, canExams, deleteAdmitCard);

/* =========================
   RESULTS
========================= */
router.get("/result", isAdmin, canResults, getAllResults);
router.get("/result/:id", isAdmin, canResults, getResultById);
router.post("/result", isAdmin, canResults, addResult);
router.put("/result/:id", isAdmin, canResults, updateResult);
router.patch("/result/:id/delete", isAdmin, canResults, deleteResult);
router.delete("/result/:id", isAdmin, canResults, hardDeleteResult);
router.get("/result/student/:studentId/summary", isAdmin, canResults, getStudentResultSummary);

/* =========================
   AI EXAM (ADMIN)
========================= */
router.post("/exam-blueprint", isAdmin, canExamBlueprint, createExamBlueprint);
router.get("/exam-blueprint", isAdmin, canExamBlueprint, getExamBlueprints);
router.get("/exam-blueprint/:id", isAdmin, canExamBlueprint, getExamBlueprintById);
router.put("/exam-blueprint/:id", isAdmin, canExamBlueprint, updateExamBlueprint);
router.post("/exam-blueprint/:id/generate-paper", isAdmin, canExamBlueprint, generateExamPaper);
router.get("/exam-blueprint/:id/paper", isAdmin, canExamBlueprint, getExamPaper);
router.put("/exam-paper/:paperId/review", isAdmin, canExamBlueprint, reviewExamPaper);
router.get("/exam-blueprint/:id/scores", isAdmin, canExamBlueprint, getExamStudentScores);
router.patch("/exam-blueprint/:id/publish", isAdmin, canExamBlueprint, publishExamBlueprint);
router.patch("/exam-blueprint/:id/close", isAdmin, canExamBlueprint, closeExamBlueprint);
router.patch("/exam-blueprint/:id/delete", isAdmin, canExamBlueprint, deleteExamBlueprint);

router.post("/fee/razorpay/webhook", feeSecurityHeaders, handleRazorpayWebhook);

/* =========================
   FEES (ADMIN)
========================= */
router.post("/fee/program", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, createFeeProgram);
router.get("/fee/program", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeProgrammes);
router.post("/fee/batch", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, createFeeBatch);
router.get("/fee/batch", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeBatches);
router.post("/fee/branch", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, createFeeBranch);
router.post("/fee/student-details", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, createStudentFeeDetails);
router.get("/fee/student-details", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getStudentFeeDetails);
router.patch("/fee/student-details/:id/benefits", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, updateStudentFeeDetailsBenefits);
router.post("/fee/demand", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, createFeeDemand);
router.post("/fee/demand/generate", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, generateFeeDemandFromProfile);
router.get("/fee/demand-request", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeDemandRequests);
router.patch("/fee/demand-request/:id/approve", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, approveFeeDemandRequest);
router.patch("/fee/demand-request/:id/reject", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, rejectFeeDemandRequest);
router.get("/fee/demand", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeDemands);
router.post("/fee/payment", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, verifyGatewaySignature, createPayment);
router.patch("/fee/payment/:paymentId/status", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, updatePaymentStatus);
router.get("/fee/payment", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getPaymentHistory);
router.post("/fee/payment/sign", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, signFeePaymentRequest);

/* =========================
   FEES - BULK OPS (ADMIN)
========================= */
router.get("/fee/bulk/template", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeBulkTemplate);
router.post("/fee/bulk/upload", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, uploadFeeBulkFile);
router.get("/fee/bulk/jobs", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeBulkJobs);
router.get("/fee/bulk/jobs/:jobId", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeBulkJobById);
router.post("/fee/bulk/jobs/:jobId/retry", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, retryFeeBulkJob);

/* =========================
   FEES - REPORTS (ADMIN)
========================= */
router.post("/fee/reports/export", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, createFeeReportExport);
router.get("/fee/reports/export", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getFeeReportExports);
router.get("/fee/reports/export/:exportId", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getFeeReportExportById);
router.get("/fee/reports/export/:exportId/download", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, downloadFeeReportExport);
router.post("/fee/reports/export/:exportId/share", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, shareFeeReportExport);

/* =========================
   FEES - ANALYTICS (ADMIN)
========================= */
router.get("/fee/analytics/financial/summary", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getFinancialSummary);
router.get("/fee/analytics/financial/program-breakup", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getFinancialProgramBreakup);
router.get("/fee/analytics/financial/cashflow", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getFinancialCashflow);
router.get("/fee/analytics/students/overview", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getStudentAnalyticsOverview);
router.get("/fee/analytics/students/status-distribution", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getStudentStatusDistribution);
router.get("/fee/analytics/students/segments", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getStudentSegments);
router.get("/fee/analytics/students/list", isAdmin, canFees, canGeneralReports, feeSecurityHeaders, feeRateLimit, getStudentAnalyticsList);

/* =========================
   FEES - CALENDAR (ADMIN)
========================= */
router.post("/fee/calendar", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, createFeeCalendarEvent);
router.get("/fee/calendar", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, getFeeCalendarEvents);
router.put("/fee/calendar/:id", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, updateFeeCalendarEvent);
router.patch("/fee/calendar/:id/delete", isAdmin, canFees, feeSecurityHeaders, feeRateLimit, deleteFeeCalendarEvent);

export default router;
