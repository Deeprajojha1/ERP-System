import StudentProfile from "../models/StudentProfile.js";
import Student from "../models/Student.js";

/* ================= GET MY PROFILE (STUDENT) ================= */
export const getMyProfile = async (req, res) => {
  try {
    const studentId = req.user.studentId;

    let profile = await StudentProfile.findOne({ student: studentId });

    // If profile doesn't exist, create one
    if (!profile) {
      profile = await StudentProfile.create({ student: studentId });
    }

    res.json({
      message: "Profile fetched successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE MY PROFILE (STUDENT) ================= */
export const updateMyProfile = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const updateData = req.body;

    let profile = await StudentProfile.findOne({ student: studentId });

    if (!profile) {
      // Create profile if doesn't exist
      profile = await StudentProfile.create({
        student: studentId,
        ...updateData,
      });
    } else {
      // Update existing profile
      profile = await StudentProfile.findOneAndUpdate(
        { student: studentId },
        updateData,
        { new: true, runValidators: true }
      );
    }

    // Check if profile is complete
    const isComplete =
      profile.cgpa &&
      profile.skills &&
      profile.skills.length > 0 &&
      profile.resumes &&
      profile.resumes.length > 0;

    if (isComplete && !profile.isProfileComplete) {
      profile.isProfileComplete = true;
      await profile.save();
    }

    res.json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD RESUME (STUDENT) ================= */
export const addResume = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { fileName, fileUrl, isDefault } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({
        message: "fileName and fileUrl are required",
      });
    }

    let profile = await StudentProfile.findOne({ student: studentId });

    if (!profile) {
      profile = await StudentProfile.create({ student: studentId });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      profile.resumes.forEach((resume) => {
        resume.isDefault = false;
      });
    }

    profile.resumes.push({
      fileName,
      fileUrl,
      uploadedAt: new Date(),
      isDefault: isDefault || false,
    });

    await profile.save();

    res.json({
      message: "Resume added successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE RESUME (STUDENT) ================= */
export const deleteResume = async (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { resumeId } = req.params;

    const profile = await StudentProfile.findOne({ student: studentId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.resumes = profile.resumes.filter(
      (resume) => resume._id.toString() !== resumeId
    );

    await profile.save();

    res.json({
      message: "Resume deleted successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET STUDENT PROFILE BY ID (ADMIN) ================= */
export const getStudentProfileById = async (req, res) => {
  try {
    const { studentId } = req.params;

    const profile = await StudentProfile.findOne({ student: studentId }).populate(
      "student"
    );

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      message: "Profile fetched successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET ALL STUDENT PROFILES (ADMIN) ================= */
export const getAllStudentProfiles = async (req, res) => {
  try {
    const { placementStatus, minCGPA } = req.query;

    const filter = { isDeleted: { $ne: true } };
    
    if (placementStatus) {
      filter.placementStatus = placementStatus;
    }
    
    if (minCGPA) {
      filter.cgpa = { $gte: parseFloat(minCGPA) };
    }

    const profiles = await StudentProfile.find(filter).populate({
      path: "student",
      populate: [
        { path: "user", select: "name email phoneNumber" },
        { path: "department", select: "name" },
      ],
    });

    res.json({
      message: "Profiles fetched successfully",
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PLACEMENT STATUS (ADMIN) ================= */
export const updatePlacementStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { placementStatus, placedCompany, placedPackage } = req.body;

    if (!placementStatus) {
      return res.status(400).json({ message: "placementStatus is required" });
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { student: studentId },
      { placementStatus, placedCompany, placedPackage },
      { new: true, runValidators: true }
    ).populate("student");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      message: "Placement status updated successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
