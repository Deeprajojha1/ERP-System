import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";
import isStudent from "../middlewares/isStudent.js";
import isFacultyOrAdmin from "../middlewares/isFacultyOrAdmin.js";

// Company Controllers
import {
  getAllCompanies,
  getCompanyById,
  addCompany,
  updateCompany,
  deleteCompany,
} from "../controllers/companyController.js";

// Job Controllers
import {
  getAllJobs,
  getJobById,
  addJob,
  updateJob,
  deleteJob,
  getEligibleJobsForStudent,
} from "../controllers/jobController.js";

// Placement Drive Controllers
import {
  getAllPlacementDrives,
  getPlacementDriveById,
  addPlacementDrive,
  updatePlacementDrive,
  deletePlacementDrive,
  getEligibleDrivesForStudent,
} from "../controllers/placementDriveController.js";

// Application Controllers
import {
  getAllApplications,
  getApplicationById,
  applyForJobOrDrive,
  updateApplicationStatus,
  getMyApplications,
  withdrawApplication,
} from "../controllers/applicationController.js";

// Student Profile Controllers
import {
  getMyProfile,
  updateMyProfile,
  addResume,
  deleteResume,
  getStudentProfileById,
  getAllStudentProfiles,
  updatePlacementStatus,
} from "../controllers/studentProfileController.js";

// External Job Controllers
import {
  getExternalJobs,
  getExternalJobsFromSource,
  getPersonalizedExternalJobs,
  getCombinedJobs,
  getCombinedEligibleJobs,
  searchJobs,
} from "../controllers/externalJobController.js";

// External Job Application Controllers
import {
  trackExternalJobClick,
  updateExternalApplicationStatus,
  getMyExternalApplications,
  getAllExternalApplications,
  getExternalApplicationById,
  getExternalApplicationStats,
  getStudentsForExternalJob,
  deleteExternalApplication,
} from "../controllers/externalJobApplicationController.js";

// Manual Job Controllers
import {
  createManualJob,
  getAllManualJobs,
  getManualJobById,
  updateManualJob,
  deleteManualJob,
} from "../controllers/manualJobController.js";

const router = express.Router();

/* ================= COMPANY ROUTES ================= */
router.get("/companies", isAuth, getAllCompanies);
router.get("/companies/:id", isAuth, getCompanyById);
router.post("/companies", isAuth, isFacultyOrAdmin, addCompany);
router.put("/companies/:id", isAuth, isFacultyOrAdmin, updateCompany);
router.delete("/companies/:id", isAuth, isAdmin, deleteCompany);

/* ================= JOB ROUTES ================= */
router.get("/jobs", isAuth, getAllJobs);
router.get("/jobs/eligible/me", isAuth, isStudent, getEligibleJobsForStudent);
router.get("/jobs/:id", isAuth, getJobById);
router.post("/jobs", isAuth, isFacultyOrAdmin, addJob);
router.put("/jobs/:id", isAuth, isFacultyOrAdmin, updateJob);
router.delete("/jobs/:id", isAuth, isAdmin, deleteJob);

/* ================= PLACEMENT DRIVE ROUTES ================= */
router.get("/drives", isAuth, getAllPlacementDrives);
router.get("/drives/eligible/me", isAuth, isStudent, getEligibleDrivesForStudent);
router.get("/drives/:id", isAuth, getPlacementDriveById);
router.post("/drives", isAuth, isFacultyOrAdmin, addPlacementDrive);
router.put("/drives/:id", isAuth, isFacultyOrAdmin, updatePlacementDrive);
router.delete("/drives/:id", isAuth, isAdmin, deletePlacementDrive);

/* ================= APPLICATION ROUTES ================= */
// Admin routes
router.get("/applications", isAuth, isFacultyOrAdmin, getAllApplications);
router.get("/applications/:id", isAuth, getApplicationById);
router.put("/applications/:id/status", isAuth, isFacultyOrAdmin, updateApplicationStatus);

// Student routes
router.post("/applications/apply", isAuth, isStudent, applyForJobOrDrive);
router.get("/applications/me", isAuth, isStudent, getMyApplications);
router.put("/applications/:id/withdraw", isAuth, isStudent, withdrawApplication);

/* ================= STUDENT PROFILE ROUTES ================= */
// Student routes
router.get("/profile/me", isAuth, isStudent, getMyProfile);
router.put("/profile/me", isAuth, isStudent, updateMyProfile);
router.post("/profile/me/resume", isAuth, isStudent, addResume);
router.delete("/profile/me/resume/:resumeId", isAuth, isStudent, deleteResume);

// Admin routes
router.get("/profiles", isAuth, isFacultyOrAdmin, getAllStudentProfiles);
router.get("/profiles/:studentId", isAuth, isFacultyOrAdmin, getStudentProfileById);
router.put("/profiles/:studentId/placement-status", isAuth, isFacultyOrAdmin, updatePlacementStatus);

/* ================= EXTERNAL JOB ROUTES (NEW!) ================= */
// Get external jobs from all sources
router.get("/external-jobs", isAuth, getExternalJobs);

// Get external jobs from specific source (adzuna, themuse, remotive, jsearch)
router.get("/external-jobs/source/:source", isAuth, getExternalJobsFromSource);

// Get personalized external jobs for student
router.get("/external-jobs/personalized", isAuth, isStudent, getPersonalizedExternalJobs);

// Get combined jobs (internal + external)
router.get("/jobs/combined", isAuth, getCombinedJobs);

// Get combined eligible jobs for student (internal + external)
router.get("/jobs/combined/eligible", isAuth, isStudent, getCombinedEligibleJobs);

// Search jobs (internal + external)
router.get("/jobs/search", isAuth, searchJobs);

/* ================= EXTERNAL JOB APPLICATION TRACKING (NEW!) ================= */
// Student routes - Track when student applies to external jobs
router.post("/external-applications/track", isAuth, isStudent, trackExternalJobClick);
router.get("/external-applications/me", isAuth, isStudent, getMyExternalApplications);
router.put("/external-applications/:id", isAuth, isStudent, updateExternalApplicationStatus);
router.delete("/external-applications/:id", isAuth, isStudent, deleteExternalApplication);

// Admin routes - View all external applications
router.get("/external-applications", isAuth, isFacultyOrAdmin, getAllExternalApplications);
router.get("/external-applications/stats", isAuth, isFacultyOrAdmin, getExternalApplicationStats);
router.get("/external-applications/:id", isAuth, isFacultyOrAdmin, getExternalApplicationById);
router.get("/external-applications/job/students", isAuth, isFacultyOrAdmin, getStudentsForExternalJob);

/* ================= MANUAL JOB ROUTES (CAMPUS JOBS) ================= */
// Admin routes - Manage manual jobs
router.post("/manual-jobs", isAuth, isAdmin, createManualJob);
router.get("/manual-jobs", isAuth, isAdmin, getAllManualJobs);
router.get("/manual-jobs/:id", isAuth, getManualJobById);
router.put("/manual-jobs/:id", isAuth, isAdmin, updateManualJob);
router.delete("/manual-jobs/:id", isAuth, isAdmin, deleteManualJob);

export default router;
