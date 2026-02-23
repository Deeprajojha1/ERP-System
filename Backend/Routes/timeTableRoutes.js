import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import {
  generateSectionTimetable,
  getSectionTimetable,
  getFacultyTimetable,
} from "../controllers/timeTableController.js";

const router = express.Router();

router.post("/section/:sectionId/generate", isAuth, isAdmin, generateSectionTimetable);
router.get("/section/:sectionId", isAuth, getSectionTimetable);
router.get("/faculty/:facultyId", isAuth, getFacultyTimetable);

export default router;
