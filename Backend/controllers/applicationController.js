import Application from "../models/Application.js";
import Job from "../models/Job.js";
import PlacementDrive from "../models/PlacementDrive.js";
import Student from "../models/Student.js";

/* ================= GET ALL APPLICATIONS (ADMIN) ================= */
export const getAllApplications = async (req, res) => {
  try {
    const { status, job, placementDrive } = req.query;
    
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (job) filter.job = job;
    if (placementDrive) filter.placementDrive = placementDrive;

    const applications = await Application.find(filter)
      .populate({
        path: "student",
        populate: { path: "user", select: "name email phoneNumber" },
      })
      .populate({
        path: "job",
        populate: { path: "company", select: "name logo" },
      })
      .populate({
        path: "placementDrive",
        populate: { path: "company", select: "name logo" },
      })
      .sort({ appliedAt: -1 });

    res.json({
      message: "Applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET APPLICATION BY ID ================= */
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "student",
        populate: [
          { path: "user", select: "name email phoneNumber" },
          { path: "department", select: "name" },
        ],
      })
      .populate({
        path: "job",
        populate: { path: "company" },
      })
      .populate({
        path: "placementDrive",
        populate: { path: "company" },
      })
      .populate("statusHistory.changedBy", "name email");

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

/* ================= APPLY FOR JOB/DRIVE (STUDENT) ================= */
export const applyForJobOrDrive = async (req, res) => {
  try {
    const { job, placementDrive, resume, coverLetter } = req.body;
    const studentId = req.user.studentId;

    // Validation
    if (!job && !placementDrive) {
      return res.status(400).json({
        message: "Either job or placementDrive must be specified",
      });
    }

    if (!resume) {
      return res.status(400).json({ message: "Resume is required" });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if job/drive exists and is open
    if (job) {
      const jobDoc = await Job.findById(job);
      if (!jobDoc) {
        return res.status(404).json({ message: "Job not found" });
      }
      if (jobDoc.status !== "open") {
        return res.status(400).json({ message: "Job is not open for applications" });
      }
      if (new Date(jobDoc.applicationDeadline) < new Date()) {
        return res.status(400).json({ message: "Application deadline has passed" });
      }

      // Check if already applied
      const existingApplication = await Application.findOne({
        student: studentId,
        job,
        isDeleted: { $ne: true },
      });
      if (existingApplication) {
        return res.status(400).json({ message: "Already applied for this job" });
      }
    }

    if (placementDrive) {
      const drive = await PlacementDrive.findById(placementDrive);
      if (!drive) {
        return res.status(404).json({ message: "Placement drive not found" });
      }
      if (drive.status !== "registration-open") {
        return res.status(400).json({
          message: "Placement drive registration is not open",
        });
      }
      if (new Date(drive.schedule.registrationEnd) < new Date()) {
        return res.status(400).json({ message: "Registration deadline has passed" });
      }

      // Check if already applied
      const existingApplication = await Application.findOne({
        student: studentId,
        placementDrive,
        isDeleted: { $ne: true },
      });
      if (existingApplication) {
        return res.status(400).json({
          message: "Already registered for this placement drive",
        });
      }
    }

    // Create application
    const application = await Application.create({
      student: studentId,
      job: job || null,
      placementDrive: placementDrive || null,
      resume,
      coverLetter,
      status: "submitted",
      statusHistory: [
        {
          status: "submitted",
          changedAt: new Date(),
          remarks: "Application submitted",
        },
      ],
    });

    // Update job/drive application count
    if (job) {
      await Job.findByIdAndUpdate(job, { $inc: { totalApplications: 1 } });
    }
    if (placementDrive) {
      await PlacementDrive.findByIdAndUpdate(placementDrive, {
        $inc: { totalRegistrations: 1 },
      });
    }

    const populatedApplication = await Application.findById(application._id)
      .populate({
        path: "job",
        populate: { path: "company", select: "name logo" },
      })
      .populate({
        path: "placementDrive",
        populate: { path: "company", select: "name logo" },
      });

    res.status(201).json({
      message: "Application submitted successfully",
      application: populatedApplication,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE APPLICATION STATUS (ADMIN) ================= */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, interviewDetails, feedback } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Update status
    application.status = status;
    
    // Add to status history
    application.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks,
    });

    // Update interview details if provided
    if (interviewDetails) {
      application.interviewDetails = {
        ...application.interviewDetails,
        ...interviewDetails,
      };
    }

    // Update feedback if provided
    if (feedback) {
      application.feedback = feedback;
    }

    await application.save();

    const populatedApplication = await Application.findById(application._id)
      .populate({
        path: "student",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "job",
        populate: { path: "company", select: "name logo" },
      })
      .populate({
        path: "placementDrive",
        populate: { path: "company", select: "name logo" },
      })
      .populate("statusHistory.changedBy", "name email");

    res.json({
      message: "Application status updated successfully",
      application: populatedApplication,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET MY APPLICATIONS (STUDENT) ================= */
export const getMyApplications = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    const applications = await Application.find({
      student: studentId,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "job",
        populate: { path: "company", select: "name logo location" },
      })
      .populate({
        path: "placementDrive",
        populate: { path: "company", select: "name logo location" },
      })
      .sort({ appliedAt: -1 });

    res.json({
      message: "Applications fetched successfully",
      count: applications.length,
      applications,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= WITHDRAW APPLICATION (STUDENT) ================= */
export const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.studentId;

    const application = await Application.findOne({
      _id: id,
      student: studentId,
      isDeleted: { $ne: true },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (["selected", "offer-accepted", "rejected"].includes(application.status)) {
      return res.status(400).json({
        message: "Cannot withdraw application in current status",
      });
    }

    application.status = "withdrawn";
    application.statusHistory.push({
      status: "withdrawn",
      changedAt: new Date(),
      remarks: "Withdrawn by student",
    });

    await application.save();

    // Decrement application count
    if (application.job) {
      await Job.findByIdAndUpdate(application.job, {
        $inc: { totalApplications: -1 },
      });
    }
    if (application.placementDrive) {
      await PlacementDrive.findByIdAndUpdate(application.placementDrive, {
        $inc: { totalRegistrations: -1 },
      });
    }

    res.json({
      message: "Application withdrawn successfully",
      application,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
