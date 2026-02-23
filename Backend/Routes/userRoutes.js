import express from "express";
import isAuth from "../middlewares/isAuth.js";
import {
  login,
  sendOtp,
  verifyOtp,
  resetPassword,
  logout,
  getUser,
  changePassword,
  updateProfileImage,
} from "../controllers/userController.js";
import { renderPdfFromHtml } from "../controllers/pdfController.js";
import { exportTabularData } from "../controllers/exportController.js";
import User from "../models/userModel.js";
import upload from "../config/multerConfig.js";
import { uploadImageToCloudinary } from "../config/cloudinaryUpload.js";

const router = express.Router();

router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/logout", isAuth, logout);

router.get("/me", isAuth, getUser);
router.post("/change-password", isAuth, changePassword);
router.put("/profile-image", isAuth, updateProfileImage);
router.delete("/profile-image", isAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: "" },
      { new: true }
    ).select("-passwordHash -resetOtp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile image removed successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
    });
  }
});
router.post("/student/upload-image", isAuth, (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    return next();
  });
}, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "profileImage file is required" });
    }

    const mimeType = req.file.mimetype || "image/png";
    const base64File = `data:${mimeType};base64,${req.file.buffer.toString("base64")}`;
    const profileImageUrl = await uploadImageToCloudinary({
      file: base64File,
      publicId: `user_${req.userId}_${Date.now()}`,
    });

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: profileImageUrl },
      { new: true, runValidators: true }
    ).select("-passwordHash -resetOtp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile image updated successfully",
      profileImageUrl,
      profileImage: profileImageUrl,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
    });
  }
});
router.delete("/student/delete-image", isAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: "" },
      { new: true }
    ).select("-passwordHash -resetOtp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile image removed successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Server Error",
    });
  }
});

router.post("/pdf/render", isAuth, renderPdfFromHtml);
router.post("/export/tabular", isAuth, exportTabularData);

export default router;
