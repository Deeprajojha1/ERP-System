import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isWarden from "../middlewares/isWarden.js";
import {
  getWardenMe,
  getWardenHostels,
  getWardenOverview,
  getWardenRooms,
  updateWardenRoomStatus,
  getWardenStudents,
  getWardenOutpasses,
  getWardenTodayOutpasses,
  updateWardenOutpassStatus,
  scanWardenOutpassQr,
  getWardenComplaints,
  updateWardenComplaintStatus,
} from "../controllers/wardenDashboardController.js";
import { createWardenStudentAlert, getMyWardenStudentAlerts, getWardenAlerts } from "../controllers/alertController.js";
import { createWardenSupportTicket, getMyWardenSupportTickets } from "../controllers/wardenSupportTicketController.js";

const router = express.Router();

router.get("/me", isAuth, isWarden, getWardenMe);
router.get("/hostels", isAuth, isWarden, getWardenHostels);
router.get("/overview", isAuth, isWarden, getWardenOverview);
router.get("/alerts", isAuth, isWarden, getWardenAlerts);
router.post("/student-alerts", isAuth, isWarden, createWardenStudentAlert);
router.get("/student-alerts", isAuth, isWarden, getMyWardenStudentAlerts);
router.post("/support-tickets", isAuth, isWarden, createWardenSupportTicket);
router.get("/support-tickets", isAuth, isWarden, getMyWardenSupportTickets);

router.get("/rooms", isAuth, isWarden, getWardenRooms);
router.patch("/rooms/:roomId/status", isAuth, isWarden, updateWardenRoomStatus);

router.get("/students", isAuth, isWarden, getWardenStudents);

router.get("/outpasses", isAuth, isWarden, getWardenOutpasses);
router.get("/outpasses/today", isAuth, isWarden, getWardenTodayOutpasses);
router.post("/outpasses/scan", isAuth, isWarden, scanWardenOutpassQr);
router.patch("/outpasses/:id", isAuth, isWarden, updateWardenOutpassStatus);

router.get("/complaints", isAuth, isWarden, getWardenComplaints);
router.patch("/complaints/:id", isAuth, isWarden, updateWardenComplaintStatus);

export default router;
