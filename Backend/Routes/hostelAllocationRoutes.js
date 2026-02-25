import express from "express";
import {
  allocateStudent,
  vacateStudent,
  getActiveAllocations,
  getStudentByEnrollmentNumber,
} from "../controllers/hostelAllocationController.js";

import isAuth from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

router.post("/allocate", isAuth, isFacultyOrAdmin, allocateStudent);
router.post("/vacate", isAuth, isFacultyOrAdmin, vacateStudent);

router.get("/active/all", isAuth, isFacultyOrAdmin, getActiveAllocations);
router.get("/student/:enrollmentNumber", isAuth, isFacultyOrAdmin, getStudentByEnrollmentNumber);

export default router;
