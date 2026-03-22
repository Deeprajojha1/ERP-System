import ExternalJobApplication from "../models/ExternalJobApplication.js";
import Student from "../models/Student.js";
import StudentProfile from "../models/StudentProfile.js";

/* ================= TRACK EXTERNAL JOB CLICK (STUDENT) ================= */
export const trackExternalJobClick = async (req, res) => {
  try {
    // Get student record from userId
    const user = await Student.findOne({ user: req.userId });
    
    if (!user) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }
    
    const studentId = user._id;
    
    const {
      externalId,
      source,
      title,
      company,
      companyLogo,
      location,
      jobType,
      department,
      year,
      years,
      salary,
      externalUrl,
      description,
    } = req.body;

    // Validation
    if (!externalId || !source || !title || !company || !externalUrl) {
      return res.status(400).json({
        message: "Required fields: externalId, source, title, company, externalUrl",
      });
    }

    // Check if already tracked
    const existing = await ExternalJobApplication.findOne({
      student: studentId,
      "externalJob.externalId": externalId,
      "externalJob.source": source,
    });

    if (existing) {
      // Update click time
      existing.clickedAt = new Date();
      await existing.save();

      return res.json({
        message: "External job click tracked (updated)",
        application: existing,
        redirectUrl: externalUrl,
      });
    }

    // Create new tracking record
    const application = await ExternalJobApplication.create({
      student: studentId,
      externalJob: {
        externalId,
        source,
        title,
        company,
        companyLogo,
        location,
        jobType,
        department: department || null,
        year: year != null ? Number(year) : null,
        years: Array.isArray(years)
          ? years.map((value) => Number(value)).filter((value) => Number.isFinite(value))
          : [],
        salary,
        externalUrl,
        description,
      },
      status: "redirected",
      statusHistory: [
        {
          status: "redirected",
          updatedAt: new Date(),
          remarks: "Student clicked apply and was redirected to external site",
        },
      ],
    });

    res.status(201).json({
      message: "External job click tracked successfully",
      application,
      redirectUrl: externalUrl,
    });
  } catch (error) {
    console.error("Track external job click error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE EXTERNAL APPLICATION STATUS (STUDENT) ================= */
export const updateExternalApplicationStatus = async (req, res) => {
  try {
    // Get student record from userId
    const user = await Student.findOne({ user: req.userId });
    
    if (!user) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }
    
    const studentId = user._id;
    const { id } = req.params;
    const { status, appliedAt, interviewDate, notes, resume, coverLetter } = req.body;

    const application = await ExternalJobApplication.findOne({
      _id: id,
      student: studentId,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Update fields
    if (status) {
      application.status = status;
      application.statusHistory.push({
        status,
        updatedAt: new Date(),
        remarks: `Status updated by student to ${status}`,
      });
    }

    if (appliedAt) application.appliedAt = appliedAt;
    if (interviewDate) application.interviewDate = interviewDate;
    if (notes) application.notes = notes;
    if (resume) application.resume = resume;
    if (coverLetter) application.coverLetter = coverLetter;

    await application.save();

    res.json({
      message: "Application status updated successfully",
      application,
    });
  } catch (error) {
    console.error("Update application status error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET MY EXTERNAL APPLICATIONS (STUDENT) ================= */
export const getMyExternalApplications = async (req, res) => {
  try {
    // Get student record from userId
    const user = await Student.findOne({ user: req.userId });
    
    if (!user) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }
    
    const studentId = user._id;
    const { status, source } = req.query;

    const filter = {
      student: studentId,
      isDeleted: { $ne: true },
    };

    if (status) filter.status = status;
    if (source) filter["externalJob.source"] = source;

    const applications = await ExternalJobApplication.find(filter)
      .sort({ clickedAt: -1 })
      .populate("student", "enrollmentNumber");

    res.json({
      message: "External applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get my applications error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET ALL EXTERNAL APPLICATIONS (ADMIN) ================= */
export const getAllExternalApplications = async (req, res) => {
  try {
    const { status, source, studentId } = req.query;

    const filter = { isDeleted: { $ne: true } };

    if (status) filter.status = status;
    if (source) filter["externalJob.source"] = source;
    if (studentId) filter.student = studentId;

    const applications = await ExternalJobApplication.find(filter)
      .populate({
        path: "student",
        select: "semester enrollmentNumber department user",
        populate: [
          { path: "user", select: "name email phoneNumber" },
          { path: "department", select: "name" },
        ],
      })
      .sort({ clickedAt: -1 });

    res.json({
      message: "All external applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET EXTERNAL APPLICATION BY ID ================= */
export const getExternalApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await ExternalJobApplication.findOne({
      _id: id,
      isDeleted: { $ne: true },
    }).populate({
      path: "student",
      select: "semester enrollmentNumber department user",
      populate: [
        { path: "user", select: "name email phoneNumber" },
        { path: "department", select: "name" },
      ],
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json({
      message: "Application fetched successfully",
      application,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET EXTERNAL APPLICATION STATISTICS (ADMIN) ================= */
export const getExternalApplicationStats = async (req, res) => {
  try {
    // Total applications
    const totalApplications = await ExternalJobApplication.countDocuments({
      isDeleted: { $ne: true },
    });

    // By status
    const byStatus = await ExternalJobApplication.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // By source
    const bySource = await ExternalJobApplication.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$externalJob.source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // By company
    const byCompany = await ExternalJobApplication.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$externalJob.company", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Recent applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentApplications = await ExternalJobApplication.countDocuments({
      isDeleted: { $ne: true },
      clickedAt: { $gte: sevenDaysAgo },
    });

    // Students who applied
    const uniqueStudents = await ExternalJobApplication.distinct("student", {
      isDeleted: { $ne: true },
    });

    res.json({
      message: "Statistics fetched successfully",
      stats: {
        totalApplications,
        recentApplications,
        uniqueStudents: uniqueStudents.length,
        byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
        bySource: bySource.map((s) => ({ source: s._id, count: s.count })),
        topCompanies: byCompany.map((c) => ({ company: c._id, count: c.count })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET STUDENTS WHO APPLIED TO SPECIFIC JOB (ADMIN) ================= */
export const getStudentsForExternalJob = async (req, res) => {
  try {
    const { externalId, source } = req.query;

    if (!externalId || !source) {
      return res.status(400).json({
        message: "externalId and source are required",
      });
    }

    const applications = await ExternalJobApplication.find({
      "externalJob.externalId": externalId,
      "externalJob.source": source,
      isDeleted: { $ne: true },
    }).populate({
      path: "student",
      select: "semester enrollmentNumber department user",
      populate: [
        { path: "user", select: "name email phoneNumber" },
        { path: "department", select: "name" },
      ],
    });

    res.json({
      message: "Students fetched successfully",
      count: applications.length,
      jobTitle: applications[0]?.externalJob?.title || "Unknown",
      company: applications[0]?.externalJob?.company || "Unknown",
      applications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE EXTERNAL APPLICATION ================= */
export const deleteExternalApplication = async (req, res) => {
  try {
    // Get student record from userId
    const user = await Student.findOne({ user: req.userId });
    
    if (!user) {
      return res.status(404).json({
        message: "Student profile not found",
      });
    }
    
    const studentId = user._id;
    const { id } = req.params;

    const application = await ExternalJobApplication.findOne({
      _id: id,
      student: studentId,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    application.isDeleted = true;
    await application.save();

    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Delete application error:", error);
    res.status(500).json({ message: error.message });
  }
};
