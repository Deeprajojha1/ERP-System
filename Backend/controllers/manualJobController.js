import ManualJob from "../models/ManualJob.js";
import Department from "../models/Department.js";
import Program from "../models/feeProgram.js";
import mongoose from "mongoose";

const getDepartmentYearLimit = async (departmentId) => {
  const department = await Department.findById(departmentId).select("program");
  if (!department) return { maxYears: 0, programs: [] };
  const programs = Array.isArray(department.program) ? department.program : [];
  if (!programs.length) return { maxYears: 0, programs: [] };
  const programDocs = await Program.find({ programName: { $in: programs } })
    .select("programName durationYears")
    .lean();
  const durations = programDocs
    .map((doc) => Number(doc.durationYears || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxYears = durations.length ? Math.max(...durations) : 0;
  return { maxYears, programs };
};

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
      department,
      year,
      years,
    } = req.body;

    // Validation
    if (
      !title ||
      !company ||
      !description ||
      !location ||
      !jobType ||
      !applicationUrl ||
      !expirationDate ||
      !department ||
      (!year && (!Array.isArray(years) || years.length === 0))
    ) {
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
          department: !department ? "Department is required" : undefined,
          year: !year && (!Array.isArray(years) || years.length === 0) ? "Year is required" : undefined,
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

    const normalizeYears = (value) => {
      if (Array.isArray(value)) return value;
      if (value == null) return [];
      return [value];
    };
    const rawYears = normalizeYears(years.length ? years : year);
    const normalizedYears = rawYears
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 10);
    if (!normalizedYears.length) {
      return res.status(400).json({
        message: "At least one valid year is required",
        field: "year",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({
        message: "Invalid department",
        field: "department",
      });
    }

    const { maxYears } = await getDepartmentYearLimit(department);
    if (!maxYears) {
      return res.status(400).json({
        message: "Department year configuration not found",
        field: "department",
      });
    }
    const invalidYear = normalizedYears.find((value) => value > maxYears);
    if (invalidYear) {
      return res.status(400).json({
        message: `Year must be between 1 and ${maxYears}`,
        field: "year",
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
      department,
      year: normalizedYears[0],
      years: normalizedYears,
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



    const normalizeYearsInput = (value) => {
      if (Array.isArray(value)) return value;
      if (value == null) return [];
      return [value];
    };

    if (updates.year != null || updates.years != null) {
      const rawYears = normalizeYearsInput(
        updates.years != null ? updates.years : updates.year
      );
      const normalizedYears = rawYears
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 10);
      if (!normalizedYears.length) {
        return res.status(400).json({
          message: "At least one valid year is required",
          field: "year",
        });
      }
      updates.year = normalizedYears[0];
      updates.years = normalizedYears;
    }

    if (updates.department && !mongoose.Types.ObjectId.isValid(updates.department)) {
      return res.status(400).json({
        message: "Invalid department",
        field: "department",
      });
    }

    if (updates.department || updates.year != null || updates.years != null) {
      const deptId = updates.department || manualJob.department;
      const { maxYears } = await getDepartmentYearLimit(deptId);
      if (!maxYears) {
        return res.status(400).json({
          message: "Department year configuration not found",
          field: "department",
        });
      }
      const yearsToCheck =
        Array.isArray(updates.years) && updates.years.length
          ? updates.years
          : manualJob.years && manualJob.years.length
          ? manualJob.years
          : manualJob.year
          ? [manualJob.year]
          : [];
      const invalidYear = yearsToCheck.find((value) => Number(value) > maxYears);
      if (invalidYear) {
        return res.status(400).json({
          message: `Year must be between 1 and ${maxYears}`,
          field: "year",
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
