import express from "express";
import {
  studentLogin, 
  getStudentProfile,
  getStudentCourses,
  getStudentAttendanceSummary
} from "../controllers/studentAuthController.js";
import { getStudentCourseContent } from "../controllers/studentCourseContentController.js";
import {
  createStudentCourseQuestion,
  getStudentCourseQuestions,
} from "../controllers/courseQuestionController.js";
import assignmentSubmissionUpload from "../config/assignmentSubmissionMulter.js";
import {
  upsertStudentAssignmentSubmission,
} from "../controllers/assignmentSubmissionController.js";
import {
  applyExamRegistration,
  getMyExamRegistrations,
  getMyExamRegistrationById,
  updateMyExamRegistration,
  uploadExamRegistrationImage,
} from "../controllers/studentExamRegistrationController.js";
import upload from "../config/multerConfig.js";
import {
  getMyAdmitCards,
  getMyAdmitCardById,
} from "../controllers/studentAdmitCardController.js";
import {
  getPublishedExamsForStudent,
  verifyStudentFace,
  checkAttemptFaceActivity,
  startExamAttempt,
  saveExamAnswer,
  submitExamAttempt,
  getMyExamResult,
} from "../controllers/aiExamController.js";
import {
  getMyFeeProfile,
  getMyFeeDemands,
  getMyPaymentHistory,
  getMyFeeDemandRequests,
  createMyFeeDemandRequest,
  viewMyDemandLetterPdf,
  downloadMyDemandLetterPdf,
  createMyPayment,
  createMyRazorpayOrder,
  createMyRazorpayOrderForYear,
  verifyMyRazorpayPayment,
  verifyMyRazorpayPaymentForYear,
}
from "../controllers/feeController.js";
import { getStudentAlerts } from "../controllers/alertController.js";
import {
  analyzeProfile,
  getLinkedinReports,
} from "../controllers/linkedinAnalyzerController.js";
import { getMyIdCard } from "../controllers/studentIdCardController.js";
	import {
	  createStudentHostelComplaint,
	  getMyHostelComplaints,
	  getStudentHostelContext,
	} from "../controllers/hostelComplaintController.js";
	import {
	  createMyHostelOutpass,
	  getMyHostelOutpasses,
    getMyActiveOutpassQr,
	} from "../controllers/hostelOutpassController.js";
import linkedinPdfUpload from "../config/linkedinPdfUpload.js";
import isAuth from "../middlewares/isAuth.js";
import isStudent from "../middlewares/isStudent.js";
import feeRateLimit from "../middlewares/feeRateLimit.js";
import feeSecurityHeaders from "../middlewares/feeSecurityHeaders.js";
import verifyGatewaySignature from "../middlewares/verifyGatewaySignature.js";
import linkedinAnalyzerRateLimit from "../middlewares/linkedinAnalyzerRateLimit.js";

const router = express.Router();

/* Authentication Routes */
router.post("/login", studentLogin);
router.get("/me", isAuth, isStudent, getStudentProfile);

/* Student Dashboard Routes */
router.get("/courses", isAuth, isStudent, getStudentCourses);
router.get("/course-content", isAuth, isStudent, getStudentCourseContent);
router.post(
  "/assignment-submissions",
  isAuth,
  isStudent,
  (req, res, next) => {
    assignmentSubmissionUpload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          message: err.message || "Assignment upload failed",
        });
      }
      return next();
    });
  },
  upsertStudentAssignmentSubmission
);
router.get("/course-questions", isAuth, isStudent, getStudentCourseQuestions);
router.post("/course-questions", isAuth, isStudent, createStudentCourseQuestion);
router.get("/attendance", isAuth, isStudent, getStudentAttendanceSummary);
	router.get("/alerts", isAuth, isStudent, getStudentAlerts);
	router.get("/hostel/context", isAuth, isStudent, getStudentHostelContext);
	router.post("/hostel/complaints", isAuth, isStudent, createStudentHostelComplaint);
	router.get("/hostel/complaints", isAuth, isStudent, getMyHostelComplaints);
	router.post("/hostel/holiday", isAuth, isStudent, createMyHostelOutpass);
	router.get("/hostel/holiday", isAuth, isStudent, getMyHostelOutpasses);
  router.get("/hostel/holiday/active-qr", isAuth, isStudent, getMyActiveOutpassQr);

/* Student Exam Registration */
router.post("/exam-registration/upload-image", isAuth, isStudent, upload.single("image"), uploadExamRegistrationImage);
router.post("/exam-registration/apply", isAuth, isStudent, applyExamRegistration);
router.get("/exam-registration", isAuth, isStudent, getMyExamRegistrations);
router.get("/exam-registration/:id", isAuth, isStudent, getMyExamRegistrationById);
router.put("/exam-registration/:id", isAuth, isStudent, updateMyExamRegistration);

/* Student Admit Card */
router.get("/admit-card", isAuth, isStudent, getMyAdmitCards);
router.get("/admit-card/:id", isAuth, isStudent, getMyAdmitCardById);
router.get("/id-card/download", isAuth, isStudent, getMyIdCard);

/* AI Exam (Student) */
router.get("/exam", isAuth, isStudent, getPublishedExamsForStudent);
router.post("/exam/face-verify", isAuth, isStudent, verifyStudentFace);
router.post("/exam/:id/start", isAuth, isStudent, startExamAttempt);
router.post("/attempt/:attemptId/face-check", isAuth, isStudent, checkAttemptFaceActivity);
router.patch("/attempt/:attemptId/answer", isAuth, isStudent, saveExamAnswer);
router.post("/attempt/:attemptId/submit", isAuth, isStudent, submitExamAttempt);
router.get("/attempt/:attemptId/result", isAuth, isStudent, getMyExamResult);

/* Fee (Student) */
router.get("/fee/me/profile", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, getMyFeeProfile);
router.get("/fee/me/demand", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, getMyFeeDemands);
router.get("/fee/me/payment", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, getMyPaymentHistory);
router.get("/fee/me/demand-request", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, getMyFeeDemandRequests);
router.post("/fee/me/demand-request", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, createMyFeeDemandRequest);
router.get("/fee/me/demand-request/:requestId/letter/view", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, viewMyDemandLetterPdf);
router.get("/fee/me/demand-request/:requestId/letter/download", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, downloadMyDemandLetterPdf);
router.post("/fee/me/payment/razorpay/order", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, createMyRazorpayOrder);
router.post("/fee/me/payment/razorpay/order-year", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, createMyRazorpayOrderForYear);
router.post("/fee/me/payment/razorpay/verify", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, verifyMyRazorpayPayment);
router.post("/fee/me/payment/razorpay/verify-year", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, verifyMyRazorpayPaymentForYear);
router.post("/fee/me/payment", isAuth, isStudent, feeSecurityHeaders, feeRateLimit, verifyGatewaySignature, createMyPayment);

/* LinkedIn Analyzer (Student) */
router.post(
  "/linkedin-analyzer/analyze-profile",
  isAuth,
  isStudent,
  linkedinAnalyzerRateLimit,
  (req, res, next) => {
    linkedinPdfUpload.single("profilePdf")(req, res, (err) => {
      if (!err) return next();
      return res.status(400).json({
        message: err.message || "Invalid PDF upload request",
      });
    });
  },
  analyzeProfile
);
router.get("/linkedin-analyzer/reports", isAuth, isStudent, getLinkedinReports);

export default router;
