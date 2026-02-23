import express from "express";
import {
  createSectionCourse,
  getAllSectionCourses,
  getSectionCourseById,
  updateSectionCourse,
  deleteSectionCourse,
} from "../controllers/sectionCourseController.js";

const router = express.Router();

router.post("/", createSectionCourse);
router.get("/", getAllSectionCourses);
router.get("/:id", getSectionCourseById);
router.put("/:id", updateSectionCourse);
router.delete("/:id", deleteSectionCourse);

export default router;
