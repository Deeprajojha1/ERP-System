import express from "express";
import { 
  studentLogin, 
  getStudentProfile,
  getStudentCourses,
  getStudentAttendanceSummary
} from "../controllers/studentAuthController.js";
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

router.get("/alerts", isAuth, isStudent, getMyAlerts);
router.post("/alerts/:id/read", isAuth, isStudent, markAlertRead);

export default router;
