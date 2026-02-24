import PlacementDrive from "../models/PlacementDrive.js";
import Company from "../models/Company.js";

/* ================= GET ALL PLACEMENT DRIVES ================= */
export const getAllPlacementDrives = async (req, res) => {
  try {
    const { status, company } = req.query;
    
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (company) filter.company = company;

    const drives = await PlacementDrive.find(filter)
      .populate("company", "name logo location")
      .populate("createdBy", "name email")
      .sort({ "schedule.driveDate": -1 });

    res.json({
      message: "Placement drives fetched successfully",
      count: drives.length,
      drives,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET PLACEMENT DRIVE BY ID ================= */
export const getPlacementDriveById = async (req, res) => {
  try {
    const { id } = req.params;

    const drive = await PlacementDrive.findOne({
      _id: id,
      isDeleted: { $ne: true },
    })
      .populate("company")
      .populate("createdBy", "name email");

    if (!drive) {
      return res.status(404).json({ message: "Placement drive not found" });
    }

    res.json({
      message: "Placement drive fetched successfully",
      drive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD PLACEMENT DRIVE ================= */
export const addPlacementDrive = async (req, res) => {
  try {
    const {
      title,
      company,
      driveType,
      description,
      eligibility,
      schedule,
      rounds,
      status,
    } = req.body;

    // Validation
    if (!title || !company || !driveType || !schedule) {
      return res.status(400).json({
        message: "Title, company, driveType, and schedule are required",
      });
    }

    if (!schedule.registrationStart || !schedule.registrationEnd || !schedule.driveDate) {
      return res.status(400).json({
        message: "Schedule must include registrationStart, registrationEnd, and driveDate",
      });
    }

    // Check if company exists
    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Validate dates
    const regStart = new Date(schedule.registrationStart);
    const regEnd = new Date(schedule.registrationEnd);
    const driveDate = new Date(schedule.driveDate);

    if (regStart >= regEnd) {
      return res.status(400).json({
        message: "Registration start must be before registration end",
      });
    }

    if (regEnd >= driveDate) {
      return res.status(400).json({
        message: "Registration end must be before drive date",
      });
    }

    const drive = await PlacementDrive.create({
      title,
      company,
      driveType,
      description,
      eligibility,
      schedule,
      rounds,
      status: status || "upcoming",
      createdBy: req.user._id,
    });

    const populatedDrive = await PlacementDrive.findById(drive._id)
      .populate("company", "name logo location")
      .populate("createdBy", "name email");

    res.status(201).json({
      message: "Placement drive created successfully",
      drive: populatedDrive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PLACEMENT DRIVE ================= */
export const updatePlacementDrive = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate dates if schedule is being updated
    if (updateData.schedule) {
      const { registrationStart, registrationEnd, driveDate } = updateData.schedule;
      
      if (registrationStart && registrationEnd) {
        if (new Date(registrationStart) >= new Date(registrationEnd)) {
          return res.status(400).json({
            message: "Registration start must be before registration end",
          });
        }
      }
      
      if (registrationEnd && driveDate) {
        if (new Date(registrationEnd) >= new Date(driveDate)) {
          return res.status(400).json({
            message: "Registration end must be before drive date",
          });
        }
      }
    }

    const drive = await PlacementDrive.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("company", "name logo location")
      .populate("createdBy", "name email");

    if (!drive) {
      return res.status(404).json({ message: "Placement drive not found" });
    }

    res.json({
      message: "Placement drive updated successfully",
      drive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE PLACEMENT DRIVE (SOFT) ================= */
export const deletePlacementDrive = async (req, res) => {
  try {
    const { id } = req.params;

    const drive = await PlacementDrive.findByIdAndUpdate(
      id,
      { isDeleted: true, status: "cancelled" },
      { new: true }
    );

    if (!drive) {
      return res.status(404).json({ message: "Placement drive not found" });
    }

    res.json({ message: "Placement drive deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET ELIGIBLE DRIVES FOR STUDENT ================= */
export const getEligibleDrivesForStudent = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    
    const Student = (await import("../models/Student.js")).default;
    const student = await Student.findById(studentId).populate("department");
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const StudentProfile = (await import("../models/StudentProfile.js")).default;
    const profile = await StudentProfile.findOne({ student: studentId });

    const filter = {
      isDeleted: { $ne: true },
      status: { $in: ["registration-open", "upcoming"] },
      "schedule.registrationEnd": { $gte: new Date() },
    };

    const drives = await PlacementDrive.find(filter)
      .populate("company", "name logo location")
      .sort({ "schedule.driveDate": 1 });

    // Filter based on eligibility
    const eligibleDrives = drives.filter((drive) => {
      const elig = drive.eligibility;
      
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

    res.json({
      message: "Eligible placement drives fetched successfully",
      count: eligibleDrives.length,
      drives: eligibleDrives,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
