import express from "express";
import { getExternalJobs } from "../controllers/externalJobController.js";
import isAuth from "../middlewares/isAuth.js";

const router = express.Router();

// Get external jobs from Indeed, JSearch, and other sources
router.get("/", isAuth, getExternalJobs);

export default router;
