import bcrypt from "bcryptjs";
import validator from "validator";
import User from "../models/userModel.js";

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

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const warden = await User.create({
      name: fullName,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: "warden",
      status: status || "active",
      aadharNumber: aadharNumber || undefined,
      phoneNumber: phoneNumber || undefined,
      DOB: DOB || undefined,
    });

    return res.status(201).json({
      message: "Warden added successfully",
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
