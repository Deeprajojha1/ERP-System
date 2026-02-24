import express from "express";
import {
  createHostel,
  getAllHostels,
  getSingleHostel,
  updateHostel,
  deleteHostel,
    getHostelSummary,
} from "../controllers/hostelController.js";

import  isAuth  from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

// Admin only routes
router.post("/", isAuth, isFacultyOrAdmin, createHostel);
router.put("/:id", isAuth, isFacultyOrAdmin, updateHostel);
router.delete("/:id", isAuth, isFacultyOrAdmin, deleteHostel);
router.get("/summary/dashboard", isAuth, isFacultyOrAdmin, getHostelSummary);

// Accessible to logged in users
router.get("/", isAuth, getAllHostels);
router.get("/:id", isAuth, getSingleHostel);


export default router;