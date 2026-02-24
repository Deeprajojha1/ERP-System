import ManualJob from "../models/ManualJob.js";
import mongoose from "mongoose";

/* ================= CREATE MANUAL JOB (ADMIN ONLY) ================= */
export const createManualJob = async (req, res) => {
  try {
    console.log("Create manual job request received");
    console.log("User ID:", req.userId);
    console.log("Role:", req.role);
    console.log("Body:", req.body);

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    const {
      title,
      company,
      companyLogo,
      description,
      location,
      jobType,
      workMode,
      applicationUrl,
      salary,
      skills,
      expirationDate,
    } = req.body;

    // Validation
    if (!title || !company || !description || !location || !jobType || !applicationUrl || !expirationDate) {
      return res.status(400).json({
        message: "Missing required fields",
        details: {
          title: !title ? "Title is required" : undefined,
          company: !company ? "Company is required" : undefined,
          description: !description ? "Description is required" : undefined,
          location: !location ? "Location is required" : undefined,
          jobType: !jobType ? "Job type is required" : undefined,
          applicationUrl: !applicationUrl ? "Application URL is required" : undefined,
          expirationDate: !expirationDate ? "Expiration date is required" : undefined,
        },
      });
    }

    // Check if expiration date is in the future
    const expiresAt = new Date(expirationDate);
    if (expiresAt <= new Date()) {
      return res.status(400).json({
        message: "Expiration date must be in the future",
        field: "expirationDate",
      });
    }

    console.log("Creating manual job with data:", {
      title,
      company,
      location,
      jobType,
      expirationDate: expiresAt,
      postedBy: req.userId,
    });

    // Convert userId to ObjectId if it's a string
    const postedById = mongoose.Types.ObjectId.isValid(req.userId) 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    // Create manual job
    const manualJob = await ManualJob.create({
      title,
      company,
      companyLogo,
      description,
      location,
      jobType,
      workMode,
      applicationUrl,
      salary,
      skills,
      expirationDate: expiresAt,
      postedBy: postedById,
      source: "Campus",
    });

    console.log("Manual job created successfully:", manualJob._id);

    res.status(201).json({
      message: "Manual job created successfully",
      job: manualJob,
    });
  } catch (error) {
    console.error("Create manual job error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Failed to create manual job",
      error: error.message,
      details: error.toString(),
    });
  }
};

/* ================= GET ALL MANUAL JOBS (ADMIN ONLY) ================= */
export const getAllManualJobs = async (req, res) => {
  try {
    const { includeExpired } = req.query;

    let query = { isDeleted: { $ne: true } };

    // Filter by expiration if not including expired
    if (includeExpired !== "true") {
      query.expirationDate = { $gte: new Date() };
      query.status = "active";
    }

    const manualJobs = await ManualJob.find(query)
      .populate("postedBy", "name email")
      .sort({ expirationDate: 1 });

    res.json({
      message: "Manual jobs fetched successfully",
      count: manualJobs.length,
      jobs: manualJobs,
    });
  } catch (error) {
    console.error("Get manual jobs error:", error);
    res.status(500).json({
      message: "Failed to fetch manual jobs",
      error: error.message,
    });
  }
};

/* ================= GET SINGLE MANUAL JOB ================= */
export const getManualJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const manualJob = await ManualJob.findById(id).populate("postedBy", "name email");

    if (!manualJob) {
      return res.status(404).json({
        message: "Manual job not found",
        jobId: id,
      });
    }

    res.json({
      message: "Manual job fetched successfully",
      job: manualJob,
    });
  } catch (error) {
    console.error("Get manual job error:", error);
    res.status(500).json({
      message: "Failed to fetch manual job",
      error: error.message,
    });
  }
};

/* ================= UPDATE MANUAL JOB (ADMIN ONLY) ================= */
export const updateManualJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if job exists
    const manualJob = await ManualJob.findById(id);
    if (!manualJob) {
      return res.status(404).json({
        message: "Manual job not found",
        jobId: id,
      });
    }

    // If updating expiration date, validate it's in the future
    if (updates.expirationDate) {
      const expiresAt = new Date(updates.expirationDate);
      if (expiresAt <= new Date()) {
        return res.status(400).json({
          message: "Expiration date must be in the future",
          field: "expirationDate",
        });
      }
    }

    // Update job
    Object.assign(manualJob, updates);
    await manualJob.save();

    res.json({
      message: "Manual job updated successfully",
      job: manualJob,
    });
  } catch (error) {
    console.error("Update manual job error:", error);
    res.status(500).json({
      message: "Failed to update manual job",
      error: error.message,
    });
  }
};

/* ================= DELETE MANUAL JOB (ADMIN ONLY) ================= */
export const deleteManualJob = async (req, res) => {
  try {
    const { id } = req.params;

    const manualJob = await ManualJob.findById(id);
    if (!manualJob) {
      return res.status(404).json({
        message: "Manual job not found",
        jobId: id,
      });
    }

    // Soft delete
    manualJob.status = "deleted";
    manualJob.isDeleted = true;
    await manualJob.save();

    res.json({
      message: "Manual job deleted successfully",
    });
  } catch (error) {
    console.error("Delete manual job error:", error);
    res.status(500).json({
      message: "Failed to delete manual job",
      error: error.message,
    });
  }
};
