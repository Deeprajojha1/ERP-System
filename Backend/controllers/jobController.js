import Job from "../models/Job.js";
import Company from "../models/Company.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

/* ================= GET ALL JOBS ================= */
export const getAllJobs = async (req, res) => {
  try {
    const { status, jobType, company, noCache } = req.query;
    
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (jobType) filter.jobType = jobType;
    if (company) filter.company = company;

    const jobs = await Job.find(filter)
      .populate("company", "name logo location")
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Jobs fetched successfully",
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET JOB BY ID ================= */
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("company")
      .populate("postedBy", "name email")
      .populate("placementDrive");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job fetched successfully",
      job,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD JOB ================= */
export const addJob = async (req, res) => {
  try {
    const {
      company,
      title,
      jobType,
      description,
      eligibility,
      skills,
      location,
      workMode,
      salary,
      applicationDeadline,
      status,
      placementDrive,
    } = req.body;

    // Validation
    if (!company || !title || !jobType || !description || !applicationDeadline) {
      return res.status(400).json({
        message: "Company, title, jobType, description, and applicationDeadline are required",
      });
    }

    // Check if company exists
    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Validate deadline is in future
    if (new Date(applicationDeadline) < new Date()) {
      return res.status(400).json({
        message: "Application deadline must be in the future",
      });
    }

    const job = await Job.create({
      company,
      title,
      jobType,
      description,
      eligibility,
      skills,
      location,
      workMode,
      salary,
      applicationDeadline,
      status: status || "draft",
      postedBy: req.user._id,
      placementDrive,
    });

    const populatedJob = await Job.findById(job._id)
      .populate("company", "name logo location")
      .populate("postedBy", "name email");

    res.status(201).json({
      message: "Job created successfully",
      job: populatedJob,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE JOB ================= */
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate deadline if being updated
    if (updateData.applicationDeadline) {
      if (new Date(updateData.applicationDeadline) < new Date()) {
        return res.status(400).json({
          message: "Application deadline must be in the future",
        });
      }
    }

    const job = await Job.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("company", "name logo location")
      .populate("postedBy", "name email");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE JOB (SOFT) ================= */
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByIdAndUpdate(
      id,
      { isDeleted: true, status: "cancelled" },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET JOBS FOR STUDENT (WITH ELIGIBILITY FILTER) ================= */
export const getEligibleJobsForStudent = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    
    // Get student details with populated data
    const Student = (await import("../models/Student.js")).default;
    const student = await Student.findById(studentId).populate("department");
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get student profile for CGPA, skills, etc.
    const StudentProfile = (await import("../models/StudentProfile.js")).default;
    const profile = await StudentProfile.findOne({ student: studentId });

    // Build filter
    const filter = {
      isDeleted: { $ne: true },
      status: "open",
      applicationDeadline: { $gte: new Date() },
    };

    const jobs = await Job.find(filter)
      .populate("company", "name logo location")
      .sort({ createdAt: -1 });

    // Filter based on eligibility
    const eligibleJobs = jobs.filter((job) => {
      const elig = job.eligibility;
      
      // Check program
      if (elig.programs && elig.programs.length > 0) {
        if (!elig.programs.includes(student.program)) return false;
      }
      
      // Check branch/department
      if (elig.branches && elig.branches.length > 0) {
        if (!elig.branches.includes(student.department?.name)) return false;
      }
      
      // Check CGPA
      if (elig.minCGPA && profile?.cgpa) {
        if (profile.cgpa < elig.minCGPA) return false;
      }
      
      // Check percentage
      if (elig.minPercentage && profile?.percentage) {
        if (profile.percentage < elig.minPercentage) return false;
      }
      
      // Check backlogs
      if (elig.maxBacklogs !== undefined && profile?.backlogs) {
        if (profile.backlogs.current > elig.maxBacklogs) return false;
      }
      
      return true;
    });

    res.json({
      message: "Eligible jobs fetched successfully",
      count: eligibleJobs.length,
      jobs: eligibleJobs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
