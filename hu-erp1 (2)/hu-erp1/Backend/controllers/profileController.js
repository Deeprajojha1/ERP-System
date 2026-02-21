import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Admin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getFileUrl, deleteFile } from "../config/multerConfig.js";

const { isEmail } = validator;

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper: Convert base64 image to file and return filename
 */
const convertBase64ToFile = async (base64String, userId) => {
  if (!base64String || !base64String.startsWith('data:')) {
    return null;
  }

  try {
    // Extract mime type and base64 data
    const matches = base64String.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!matches) {
      console.log("[convertBase64ToFile] Invalid base64 format");
      return null;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate filename
    const filename = `profile-${userId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-images');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    console.log("[convertBase64ToFile] Converted base64 to file:", filename);
    return filename;
  } catch (error) {
    console.error("[convertBase64ToFile] Error:", error);
    return null;
  }
};

/**
 * Helper: Check and convert base64 profile image to file
 */
export const migrateBase64ProfileImage = async (user) => {
  if (user.profileImage && user.profileImage.startsWith('data:')) {
    console.log("[migrateBase64ProfileImage] Converting base64 image for user:", user._id);
    const filename = await convertBase64ToFile(user.profileImage, user._id);
    if (filename) {
      user.profileImage = filename;
      await user.save({ validateBeforeSave: false });
      console.log("[migrateBase64ProfileImage] Migration complete:", filename);
      return filename;
    }
  }
  return user.profileImage;
};

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
      .populate("user", "name email aadharNumber phoneNumber DOB status profileImage")
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
        role: user.role,
        status: user.status,
        profileImage: user.profileImage ? getFileUrl(user.profileImage) : null,
      },
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message });
  }
};

/* ================= UPLOAD PROFILE IMAGE ================= */

export const uploadProfileImage = async (req, res) => {
  try {
    console.log("[uploadProfileImage] ========== UPLOAD START ==========");
    console.log("[uploadProfileImage] Request received", {
      userId: req.userId,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      } : null
    });

    if (!req.file) {
      console.log("[uploadProfileImage] No file provided");
      return res.status(400).json({ message: "No image file provided" });
    }

    const userId = req.userId; // From auth middleware
    console.log("[uploadProfileImage] Finding user with ID:", userId);
    const user = await User.findById(userId);

    if (!user) {
      // Delete uploaded file if user not found
      deleteFile(req.file.filename);
      return res.status(404).json({ message: "User not found" });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      deleteFile(user.profileImage);
    }

    // Update user with new profile image filename
    console.log("[uploadProfileImage] Updating user profile image");
    user.profileImage = req.file.filename;
    await user.save();

    const imageUrl = getFileUrl(req.file.filename);
    console.log("[uploadProfileImage] Profile image saved successfully", { imageUrl });

    const url = getFileUrl(user.profileImage);
    const absoluteUrl = url && url.startsWith("/")
      ? `${req.protocol}://${req.get("host")}${url}`
      : url;

    res.json({
      message: "Profile image uploaded successfully",
      profileImage: user.profileImage,
      profileImageUrl: absoluteUrl,
    });
  } catch (error) {
    console.error("[uploadProfileImage] Error:", error);
    
    // Delete uploaded file if there's an error
    if (req.file) {
      console.log("[uploadProfileImage] Cleaning up uploaded file");
      deleteFile(req.file.filename);
    }
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE PROFILE IMAGE ================= */

export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      deleteFile(user.profileImage);
      user.profileImage = null;
      await user.save();
    }

    res.json({
      message: "Profile image deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= STUDENT PROFILE IMAGE UPLOAD ================= */

export const uploadStudentProfileImage = async (req, res) => {
  try {
    console.log("[uploadStudentProfileImage] ========== STUDENT UPLOAD START ==========");
    console.log("[uploadStudentProfileImage] Request received", {
      userId: req.userId,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      } : null
    });

    if (!req.file) {
      console.log("[uploadStudentProfileImage] No file provided");
      return res.status(400).json({ message: "No image file provided" });
    }

    const userId = req.userId; // From auth middleware
    console.log("[uploadStudentProfileImage] Finding user with ID:", userId);
    
    if (!userId) {
      console.log("[uploadStudentProfileImage] No userId found in request");
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(userId);
    console.log("[uploadStudentProfileImage] User found:", user ? "YES" : "NO");

    if (!user) {
      // Delete uploaded file if user not found
      console.log("[uploadStudentProfileImage] User not found, cleaning up file");
      deleteFile(req.file.filename);
      return res.status(404).json({ message: "User not found" });
    }

    // Verify user is a student
    console.log("[uploadStudentProfileImage] User role:", user.role);
    if (user.role !== "student") {
      console.log("[uploadStudentProfileImage] User is not a student, cleaning up file");
      deleteFile(req.file.filename);
      return res.status(403).json({ message: "Access denied. Only students can upload profile images" });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      console.log("[uploadStudentProfileImage] Deleting old profile image:", user.profileImage);
      deleteFile(user.profileImage);
    }

    // Update user with new profile image filename
    console.log("[uploadStudentProfileImage] Updating student profile image");
    user.profileImage = req.file.filename;
    await user.save();
    console.log("[uploadStudentProfileImage] User saved successfully");

    const imageUrl = getFileUrl(req.file.filename);
    console.log("[uploadStudentProfileImage] Student profile image saved successfully", { imageUrl });

    const url = getFileUrl(user.profileImage);
    const absoluteUrl = url && url.startsWith("/")
      ? `${req.protocol}://${req.get("host")}${url}`
      : url;

    res.json({
      message: "Student profile image uploaded successfully",
      profileImage: user.profileImage,
      profileImageUrl: absoluteUrl,
    });
  } catch (error) {
    console.error("[uploadStudentProfileImage] Error:", error);
    console.error("[uploadStudentProfileImage] Error stack:", error.stack);
    
    // Delete uploaded file if there's an error
    if (req.file) {
      console.log("[uploadStudentProfileImage] Cleaning up uploaded file");
      deleteFile(req.file.filename);
    }
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/* ================= STUDENT PROFILE IMAGE DELETE ================= */

export const deleteStudentProfileImage = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify user is a student
    if (user.role !== "student") {
      return res.status(403).json({ message: "Access denied. Only students can delete profile images" });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      deleteFile(user.profileImage);
      user.profileImage = null;
      await user.save();
    }

    res.json({
      message: "Student profile image deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
