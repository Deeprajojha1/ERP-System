import {
  aggregateJobsFromAllSources,
  fetchJobsFromSource,
  filterExternalJobs,
  normalizeExternalJob,
} from "../services/jobAggregatorService.js";
import StudentProfile from "../models/StudentProfile.js";
import Student from "../models/Student.js";
import Job from "../models/Job.js";
import ManualJob from "../models/ManualJob.js";

/* ================= GET EXTERNAL JOBS (ALL SOURCES) ================= */
export const getExternalJobs = async (req, res) => {
  try {
    const { keywords, location, page = 1 } = req.query;

    const filters = {
      keywords: keywords || "software developer",
      location: location || "India",
      page: parseInt(page),
    };

    // Fetch from all external sources
    const externalJobs = await aggregateJobsFromAllSources(filters);

    // Normalize jobs
    const normalizedJobs = externalJobs.map(normalizeExternalJob);

    // Fetch active manual jobs (not expired, not deleted)
    const manualJobs = await ManualJob.find({
      isDeleted: { $ne: true },
      status: "active",
      expirationDate: { $gte: new Date() },
    }).sort({ expirationDate: 1 });

    // Convert manual jobs to external job format
    const manualJobsFormatted = manualJobs.map((job) => job.toExternalJobFormat());

    // Combine: manual jobs first, then external jobs
    const allJobs = [...manualJobsFormatted, ...normalizedJobs];

    res.json({
      message: "External jobs fetched successfully",
      count: allJobs.length,
      manualCount: manualJobsFormatted.length,
      externalCount: normalizedJobs.length,
      source: "multiple",
      jobs: allJobs,
      filters,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET EXTERNAL JOBS FROM SPECIFIC SOURCE ================= */
export const getExternalJobsFromSource = async (req, res) => {
  try {
    const { source } = req.params;
    const { keywords, location, page = 1 } = req.query;

    const filters = {
      keywords: keywords || "software developer",
      location: location || "India",
      page: parseInt(page),
    };

    // Fetch from specific source
    const externalJobs = await fetchJobsFromSource(source, filters);

    // Normalize jobs
    const normalizedJobs = externalJobs.map(normalizeExternalJob);

    res.json({
      message: `External jobs fetched from ${source}`,
      count: normalizedJobs.length,
      source,
      jobs: normalizedJobs,
      filters,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET PERSONALIZED EXTERNAL JOBS (STUDENT) ================= */
export const getPersonalizedExternalJobs = async (req, res) => {
  try {
    // Try to get studentId from authenticated user, fallback to query param for testing
    const studentId = req.user?.studentId || req.query.studentId;
    
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const { keywords, location, page = 1 } = req.query;

    // Get student profile
    const profile = await StudentProfile.findOne({ student: studentId });
    const student = await Student.findById(studentId).populate("department");

    // Build filters based on student profile
    let baseKeywords = "software developer";
    const keywordParts = [];

    if (profile?.skills?.length > 0) {
      keywordParts.push(...profile.skills);
    }
    if (student?.department?.name) {
      keywordParts.push(student.department.name);
    }

    if (keywordParts.length > 0) {
      baseKeywords = keywordParts.join(" ");
    }

    console.log("Student profile:", {
      studentId,
      department: student?.department?.name,
      skills: profile?.skills,
      baseKeywords
    });

    const filters = {
      keywords: keywords || baseKeywords,
      location: location || profile?.preferences?.preferredLocations?.[0] || "India",
      page: parseInt(page),
    };

    // Fetch from all external sources
    const externalJobs = await aggregateJobsFromAllSources(filters);
    console.log(`Fetched ${externalJobs.length} external jobs with keywords: "${filters.keywords}"`);

    // Filter based on student profile
    const filteredJobs = profile
      ? filterExternalJobs(externalJobs, profile, student?.department?.name)
      : externalJobs;

    // Fallback: if no jobs match filters, return some jobs anyway
    let finalJobs = filteredJobs;
    if (filteredJobs.length === 0 && externalJobs.length > 0) {
      console.log("No jobs matched filters, returning top 10 unfiltered jobs as fallback");
      finalJobs = externalJobs.slice(0, 10); // Return top 10 jobs
    }

    // Normalize jobs
    const normalizedJobs = finalJobs.map(normalizeExternalJob);

    res.json({
      message: "Personalized external jobs fetched successfully",
      count: normalizedJobs.length,
      jobs: normalizedJobs,
      filters,
      profileUsed: !!profile,
      department: student?.department?.name,
      skills: profile?.skills,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET COMBINED JOBS (INTERNAL + EXTERNAL) ================= */
export const getCombinedJobs = async (req, res) => {
  try {
    const { keywords, location, includeExternal = "true" } = req.query;

    // Get internal jobs
    const internalJobs = await Job.find({
      isDeleted: { $ne: true },
      status: "open",
      applicationDeadline: { $gte: new Date() },
    })
      .populate("company", "name logo location")
      .sort({ createdAt: -1 });

    // Format internal jobs
    const formattedInternalJobs = internalJobs.map((job) => ({
      _id: job._id,
      title: job.title,
      company: {
        name: job.company?.name,
        logo: job.company?.logo,
      },
      description: job.description,
      location: job.location,
      jobType: job.jobType,
      salary: job.salary,
      skills: job.skills,
      workMode: job.workMode,
      applicationDeadline: job.applicationDeadline,
      eligibility: job.eligibility,
      isExternal: false,
      source: "internal",
    }));

    let allJobs = [...formattedInternalJobs];

    // Add external jobs if requested
    if (includeExternal === "true") {
      const filters = {
        keywords: keywords || "software developer",
        location: location || "India",
        page: 1,
      };

      const externalJobs = await aggregateJobsFromAllSources(filters);
      const normalizedExternalJobs = externalJobs.map(normalizeExternalJob);

      allJobs = [...allJobs, ...normalizedExternalJobs];
    }

    res.json({
      message: "Combined jobs fetched successfully",
      count: allJobs.length,
      internalCount: formattedInternalJobs.length,
      externalCount: allJobs.length - formattedInternalJobs.length,
      jobs: allJobs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET COMBINED ELIGIBLE JOBS (STUDENT) ================= */
export const getCombinedEligibleJobs = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { includeExternal = "true" } = req.query;

    // Get student details
    const student = await Student.findById(studentId).populate("department");
    const profile = await StudentProfile.findOne({ student: studentId });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get internal eligible jobs
    const internalJobs = await Job.find({
      isDeleted: { $ne: true },
      status: "open",
      applicationDeadline: { $gte: new Date() },
    })
      .populate("company", "name logo location")
      .sort({ createdAt: -1 });

    // Filter internal jobs by eligibility
    const eligibleInternalJobs = internalJobs.filter((job) => {
      const elig = job.eligibility;

      if (elig.programs && elig.programs.length > 0) {
        if (!elig.programs.includes(student.program)) return false;
      }

      if (elig.branches && elig.branches.length > 0) {
        if (!elig.branches.includes(student.department?.name)) return false;
      }

      if (elig.minCGPA && profile?.cgpa) {
        if (profile.cgpa < elig.minCGPA) return false;
      }

      if (elig.minPercentage && profile?.percentage) {
        if (profile.percentage < elig.minPercentage) return false;
      }

      if (elig.maxBacklogs !== undefined && profile?.backlogs) {
        if (profile.backlogs.current > elig.maxBacklogs) return false;
      }

      return true;
    });

    // Format internal jobs
    const formattedInternalJobs = eligibleInternalJobs.map((job) => ({
      _id: job._id,
      title: job.title,
      company: {
        name: job.company?.name,
        logo: job.company?.logo,
      },
      description: job.description,
      location: job.location,
      jobType: job.jobType,
      salary: job.salary,
      skills: job.skills,
      workMode: job.workMode,
      applicationDeadline: job.applicationDeadline,
      isExternal: false,
      source: "internal",
      canApply: true,
    }));

    let allJobs = [...formattedInternalJobs];

    // Add external jobs if requested
    if (includeExternal === "true") {
      let baseKeywords = "software developer";
      if (profile?.skills?.length > 0) {
        baseKeywords = profile.skills.join(" ");
      }
      if (student?.department?.name) {
        baseKeywords += ` ${student.department.name}`;
      }

      const filters = {
        keywords: baseKeywords,
        location: profile?.preferences?.preferredLocations?.[0] || "India",
        page: 1,
      };

      const externalJobs = await aggregateJobsFromAllSources(filters);
      const filteredExternalJobs = profile
        ? filterExternalJobs(externalJobs, profile, student?.department?.name)
        : externalJobs;
      const normalizedExternalJobs = filteredExternalJobs.map(normalizeExternalJob);

      allJobs = [...allJobs, ...normalizedExternalJobs];
    }

    res.json({
      message: "Combined eligible jobs fetched successfully",
      count: allJobs.length,
      internalCount: formattedInternalJobs.length,
      externalCount: allJobs.length - formattedInternalJobs.length,
      jobs: allJobs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= SEARCH JOBS (INTERNAL + EXTERNAL) ================= */
export const searchJobs = async (req, res) => {
  try {
    const { query, location, jobType, includeExternal = "true" } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Search internal jobs
    const internalJobs = await Job.find({
      isDeleted: { $ne: true },
      status: "open",
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { skills: { $in: [new RegExp(query, "i")] } },
      ],
    })
      .populate("company", "name logo location")
      .limit(20);

    const formattedInternalJobs = internalJobs.map((job) => ({
      _id: job._id,
      title: job.title,
      company: {
        name: job.company?.name,
        logo: job.company?.logo,
      },
      description: job.description,
      location: job.location,
      jobType: job.jobType,
      salary: job.salary,
      isExternal: false,
      source: "internal",
    }));

    let allJobs = [...formattedInternalJobs];

    // Search external jobs if requested
    if (includeExternal === "true") {
      const filters = {
        keywords: query,
        location: location || "India",
        page: 1,
      };

      const externalJobs = await aggregateJobsFromAllSources(filters);
      const normalizedExternalJobs = externalJobs.map(normalizeExternalJob);

      allJobs = [...allJobs, ...normalizedExternalJobs];
    }

    res.json({
      message: "Search results",
      query,
      count: allJobs.length,
      jobs: allJobs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
