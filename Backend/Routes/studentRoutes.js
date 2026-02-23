import express from "express";
import {
import {
  studentLogin, 
  getStudentProfile,
  getStudentCourses,
  getStudentAttendanceSummary
} from "../controllers/studentAuthController.js";
import {
  applyExamRegistration,
  getMyExamRegistrations,
  getMyExamRegistrationById,
  updateMyExamRegistration,
} from "../controllers/studentExamRegistrationController.js";
import {
  getMyAdmitCards,
  getMyAdmitCardById,
} from "../controllers/studentAdmitCardController.js";
import {
  getPublishedExamsForStudent,
  startExamAttempt,
  saveExamAnswer,
  submitExamAttempt,
  getMyExamResult,
} from "../controllers/aiExamController.js";
import {
  getMyFeeDemands,
  getMyPaymentHistory,
  createMyPayment,
} from "../controllers/feeController.js";
import { getStudentAlerts } from "../controllers/alertController.js";
import isAuth from "../middlewares/isAuth.js";
import isStudent from "../middlewares/isStudent.js";
import feeRateLimit from "../middlewares/feeRateLimit.js";

const router = express.Router();

/* Authentication Routes */
router.post("/login", studentLogin);
router.get("/me", isAuth, isStudent, getStudentProfile);

/* Student Dashboard Routes */
router.get("/courses", isAuth, isStudent, getStudentCourses);
router.get("/attendance", isAuth, isStudent, getStudentAttendanceSummary);
router.get("/alerts", isAuth, isStudent, getStudentAlerts);

/* Student Exam Registration */
router.post("/exam-registration/apply", isAuth, isStudent, applyExamRegistration);
router.get("/exam-registration", isAuth, isStudent, getMyExamRegistrations);
router.get("/exam-registration/:id", isAuth, isStudent, getMyExamRegistrationById);
router.put("/exam-registration/:id", isAuth, isStudent, updateMyExamRegistration);

/* Student Admit Card */
router.get("/admit-card", isAuth, isStudent, getMyAdmitCards);
router.get("/admit-card/:id", isAuth, isStudent, getMyAdmitCardById);

/* AI Exam (Student) */
router.get("/exam", isAuth, isStudent, getPublishedExamsForStudent);
router.post("/exam/:id/start", isAuth, isStudent, startExamAttempt);
router.patch("/attempt/:attemptId/answer", isAuth, isStudent, saveExamAnswer);
router.post("/attempt/:attemptId/submit", isAuth, isStudent, submitExamAttempt);
router.get("/attempt/:attemptId/result", isAuth, isStudent, getMyExamResult);

/* Fee (Student) */
router.get("/fee/me/demand", isAuth, isStudent, feeRateLimit, getMyFeeDemands);
router.get("/fee/me/payment", isAuth, isStudent, feeRateLimit, getMyPaymentHistory);
router.post("/fee/me/payment", isAuth, isStudent, feeRateLimit, createMyPayment);

export default router;
