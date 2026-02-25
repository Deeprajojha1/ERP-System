import express from "express";
import {
  createRoom,
  getRoomsByHostel,
  deleteRoom,
  updateRoom,
  getAvailableRooms,
  getFullRooms,
} from "../controllers/roomController.js";

import isAuth from "../middlewares/isAuth.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

const router = express.Router();

// Admin only
router.post("/", isAuth, isFacultyOrAdmin, createRoom);
router.put("/:id", isAuth, isFacultyOrAdmin, updateRoom);
router.delete("/:id", isAuth, isFacultyOrAdmin, deleteRoom);

// All logged users
router.get("/available/all", isAuth, getAvailableRooms);
router.get("/full/all", isAuth, getFullRooms);
router.get("/:hostelId", isAuth, getRoomsByHostel);

export default router;
