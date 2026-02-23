import express from "express";
import { generateSectionTimetable,getSectionTimetable,getClassroomTimetable,getFacultyTimetable, approveTimetable } from "../controllers/timeTableController.js";

const router = express.Router();

router.post("/generate/:sectionId", generateSectionTimetable);
router.post("/approve/:sectionId",approveTimetable);

router.get("/section/:sectionId", getSectionTimetable);


router.get("/faculty/:facultyId", getFacultyTimetable);
router.get("/classroom/:classroomId", getClassroomTimetable);
export default router;
