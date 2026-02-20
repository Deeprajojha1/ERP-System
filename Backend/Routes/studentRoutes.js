import express from "express";
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
import isAuth from "../middlewares/isAuth.js";
import isStudent from "../middlewares/isStudent.js";
import { getMyAlerts, markAlertRead } from "../controllers/alertController.js";

const router = express.Router();

/* Authentication Routes */
router.post("/login", studentLogin);
router.get("/me", isAuth, isStudent, getStudentProfile);

/* Student Dashboard Routes */
router.get("/courses", isAuth, isStudent, getStudentCourses);
router.get("/attendance", isAuth, isStudent, getStudentAttendanceSummary);

/* Student Exam Registration */
router.post("/exam-registration/apply", isAuth, isStudent, applyExamRegistration);
router.get("/exam-registration", isAuth, isStudent, getMyExamRegistrations);
router.get("/exam-registration/:id", isAuth, isStudent, getMyExamRegistrationById);
router.put("/exam-registration/:id", isAuth, isStudent, updateMyExamRegistration);

/* Student Admit Card */
router.get("/admit-card", isAuth, isStudent, getMyAdmitCards);
router.get("/admit-card/:id", isAuth, isStudent, getMyAdmitCardById);

export default router;
