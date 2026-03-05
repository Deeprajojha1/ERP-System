import express from "express";
import {
  createHostel,
  getAllHostels,
  getSingleHostel,
  updateHostel,
  deleteHostel,
  getHostelSummary,
  getHostelMenu,
  updateHostelMenu,
} from "../controllers/hostelController.js";
import {
  getComplaintIssueTypes,
  getHostelComplaints,
  updateHostelComplaintStatus,
} from "../controllers/hostelComplaintController.js";

import  isAuth  from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

// Admin only routes
router.post("/", isAuth, isFacultyOrAdmin, createHostel);
router.put("/:id", isAuth, isFacultyOrAdmin, updateHostel);
router.delete("/:id", isAuth, isFacultyOrAdmin, deleteHostel);
router.get("/summary/dashboard", isAuth, isFacultyOrAdmin, getHostelSummary);
router.get("/:id/menu", isAuth, getHostelMenu);
router.put("/:id/menu", isAuth, isFacultyOrAdmin, updateHostelMenu);

// Hostel complaint management (admin/faculty/warden allowed via controller-level role checks)
router.get("/complaints", isAuth, getHostelComplaints);
router.get("/complaints/issue-types/list", isAuth, getComplaintIssueTypes);
router.get("/:id/complaints", isAuth, getHostelComplaints);
router.patch("/complaints/:complaintId/status", isAuth, updateHostelComplaintStatus);

// Accessible to logged in users
router.get("/", isAuth, getAllHostels);
router.get("/:id", isAuth, getSingleHostel);


export default router;
