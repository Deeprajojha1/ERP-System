import bcrypt from "bcryptjs";
import validator from "validator";
import User from "../models/userModel.js";
import Hostel from "../models/hostelModel.js";
import { bumpNamespaceVersion } from "../utils/cacheNamespace.js";

const { isEmail } = validator;

const buildName = ({ firstName, lastName, name }) => {
  if (name && String(name).trim()) return String(name).trim();
  return `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
};

/* ================= ADD WARDEN ================= */
export const addWarden = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      name,
      email,
      password,
      aadharNumber,
      phoneNumber,
      DOB,
      status,
      role,
    } = req.body || {};

    const fullName = buildName({ firstName, lastName, name });
    const normalizedEmail = String(email || "").toLowerCase().trim();

    if (!fullName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (!isEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    if (aadharNumber) {
      const existingAadhar = await User.findOne({ aadharNumber: String(aadharNumber).trim() });
      if (existingAadhar) {
        return res.status(400).json({
          message: "Aadhar number already registered",
        });
      }
    }

    const normalizedRole = String(role || "warden").trim();
    if (!["warden", "gateSecurity"].includes(normalizedRole)) {
      return res.status(400).json({
        message: "Role must be either warden or gateSecurity",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const warden = await User.create({
      name: fullName,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: normalizedRole,
      status: status || "active",
      aadharNumber: aadharNumber || undefined,
      phoneNumber: phoneNumber || undefined,
      DOB: DOB || undefined,
    });

    return res.status(201).json({
      message: normalizedRole === "gateSecurity" ? "Gate security added successfully" : "Warden added successfully",
      warden: {
        _id: warden._id,
        name: warden.name,
        email: warden.email,
        role: warden.role,
        status: warden.status,
        phoneNumber: warden.phoneNumber,
        aadharNumber: warden.aadharNumber,
        DOB: warden.DOB,
        createdAt: warden.createdAt,
        updatedAt: warden.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to add warden",
    });
  }
};

export const deleteWarden = async (req, res) => {
  try {
    const wardenId = String(req.params?.id || "").trim();
    if (!wardenId) {
      return res.status(400).json({ message: "Warden id is required" });
    }

    const warden = await User.findById(wardenId).select("_id role email name");
    if (!warden?._id) {
      return res.status(404).json({ message: "Warden not found" });
    }

    const normalizedRole = String(warden.role || "").toLowerCase();
    if (normalizedRole !== "warden" && normalizedRole !== "gatesecurity") {
      return res.status(400).json({ message: "Only warden or gate security users can be deleted here" });
    }

    await Hostel.updateMany({ wardens: warden._id }, { $pull: { wardens: warden._id } });
    await warden.deleteOne();
    await bumpNamespaceVersion("hostels");

    return res.status(200).json({
      message: normalizedRole === "gatesecurity" ? "Gate security deleted successfully" : "Warden deleted successfully",
      wardenId: warden._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to delete warden",
    });
  }
};
