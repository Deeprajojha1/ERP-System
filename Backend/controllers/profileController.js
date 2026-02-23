import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import { uploadImageToCloudinary } from "../config/cloudinaryUpload.js";

const { isEmail } = validator;

/**
 * Helper: validate credentials and return the user document.
 */
const authenticateUser = async (email, password) => {
  if (!email || !password) throw { status: 400, message: "Email & Password required" };
  if (!isEmail(email)) throw { status: 400, message: "Invalid email format" };

  const user = await User.findOne({ email });
  if (!user) throw { status: 404, message: "User not found" };

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw { status: 401, message: "Invalid credentials" };

  return user;
};

/* ================= STUDENT PROFILE ================= */

export const getStudentProfile = async (req, res) => {
  try {
    const user = await authenticateUser(req.body.email, req.body.password);

    if (user.role !== "student") {
      return res.status(403).json({ message: "Access denied. Not a student account." });
    }

    const student = await Student.findOne({ user: user._id })
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department")
      .populate("group");

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json({
      message: "Student profile fetched successfully",
      student,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};

/* ================= FACULTY PROFILE ================= */

export const getFacultyProfileByCredentials = async (req, res) => {
  try {
    const user = await authenticateUser(req.body.email, req.body.password);

    if (user.role !== "faculty") {
      return res.status(403).json({ message: "Access denied. Not a faculty account." });
    }

    const faculty = await Faculty.findOne({ user: user._id })
      .populate("user", "name email aadharNumber phoneNumber DOB status")
      .populate("department");

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    res.json({
      message: "Faculty profile fetched successfully",
      faculty,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};

/* ================= ADMIN PROFILE ================= */

export const getAdminProfile = async (req, res) => {
  try {
    const user = await authenticateUser(req.body.email, req.body.password);

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Not an admin account." });
    }

    res.json({
      message: "Admin profile fetched successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        aadharNumber: user.aadharNumber,
        phoneNumber: user.phoneNumber,
        DOB: user.DOB,
        profileImage: user.profileImage || "",
        profileImage: user.profileImage || "",
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};

/* ================= ADMIN PROFILE IMAGE ================= */

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "profileImage file is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const mime = String(req.file.mimetype || "image/jpeg");
    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;

    const imageUrl = await uploadImageToCloudinary({
      file: dataUri,
      folder: "hu-erp/profile-images",
      publicId: `profile_${user._id}_${Date.now()}`,
    });

    user.profileImage = imageUrl;
    await user.save();

    return res.json({
      message: "Profile image uploaded successfully",
      profileImage: imageUrl,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteProfileImage = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profileImage = "";
    await user.save();

    return res.json({
      message: "Profile image removed successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
