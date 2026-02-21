import bcrypt from "bcryptjs";
import validator from "validator";
import User from "../models/userModel.js";

const { isEmail } = validator;

const buildName = ({ firstName, lastName, name }) => {
  if (name && String(name).trim()) return String(name).trim();
  return `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();
};

/* ================= GET ALL LIBRARIANS ================= */
export const getAllLibrarians = async (req, res) => {
  try {
    const librarians = await User.find({
      role: "librarian",
      isDeleted: { $ne: true },
    }).select("-passwordHash -resetOtp -otpExpires");

    return res.status(200).json({
      message: "Librarians fetched successfully",
      count: librarians.length,
      librarians,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch librarians",
    });
  }
};

/* ================= GET LIBRARIAN BY ID ================= */
export const getLibrarianById = async (req, res) => {
  try {
    const { id } = req.params;
    const librarian = await User.findOne({
      _id: id,
      role: "librarian",
      isDeleted: { $ne: true },
    }).select("-passwordHash -resetOtp -otpExpires");

    if (!librarian) {
      return res.status(404).json({
        message: "Librarian not found",
      });
    }

    return res.status(200).json({
      message: "Librarian fetched successfully",
      librarian,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch librarian",
    });
  }
};

/* ================= ADD LIBRARIAN ================= */
export const addLibrarian = async (req, res) => {
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

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (!isEmail(String(email))) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const librarian = await User.create({
      name: fullName,
      email: String(email).toLowerCase().trim(),
      passwordHash: hashedPassword,
      role: "librarian",
      status: status || "active",
      aadharNumber: aadharNumber || undefined,
      phoneNumber: phoneNumber || undefined,
      DOB: DOB || undefined,
    });

    return res.status(201).json({
      message: "Librarian added successfully",
      librarian: {
        _id: librarian._id,
        name: librarian.name,
        email: librarian.email,
        role: librarian.role,
        status: librarian.status,
        phoneNumber: librarian.phoneNumber,
        aadharNumber: librarian.aadharNumber,
        DOB: librarian.DOB,
        createdAt: librarian.createdAt,
        updatedAt: librarian.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to add librarian",
    });
  }
};

/* ================= UPDATE LIBRARIAN ================= */
export const updateLibrarian = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      name,
      email,
      password,
      status,
      aadharNumber,
      phoneNumber,
      DOB,
    } = req.body || {};

    const librarian = await User.findOne({
      _id: id,
      role: "librarian",
      isDeleted: { $ne: true },
    });

    if (!librarian) {
      return res.status(404).json({
        message: "Librarian not found",
      });
    }

    const nextName = buildName({ firstName, lastName, name });
    if (nextName) librarian.name = nextName;

    if (typeof email !== "undefined") {
      if (!isEmail(String(email))) {
        return res.status(400).json({
          message: "Invalid email format",
        });
      }
      const normalizedEmail = String(email).toLowerCase().trim();
      const duplicate = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({
          message: "Email already registered",
        });
      }
      librarian.email = normalizedEmail;
    }

    if (typeof password !== "undefined" && String(password).trim()) {
      if (String(password).length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }
      librarian.passwordHash = await bcrypt.hash(String(password), 10);
    }

    if (typeof status !== "undefined") librarian.status = status;
    if (typeof aadharNumber !== "undefined") librarian.aadharNumber = aadharNumber || undefined;
    if (typeof phoneNumber !== "undefined") librarian.phoneNumber = phoneNumber || undefined;
    if (typeof DOB !== "undefined") librarian.DOB = DOB || undefined;

    await librarian.save();

    return res.status(200).json({
      message: "Librarian updated successfully",
      librarian: {
        _id: librarian._id,
        name: librarian.name,
        email: librarian.email,
        role: librarian.role,
        status: librarian.status,
        phoneNumber: librarian.phoneNumber,
        aadharNumber: librarian.aadharNumber,
        DOB: librarian.DOB,
        createdAt: librarian.createdAt,
        updatedAt: librarian.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to update librarian",
    });
  }
};

/* ================= SOFT DELETE LIBRARIAN ================= */
export const deleteLibrarian = async (req, res) => {
  try {
    const { id } = req.params;
    const librarian = await User.findOneAndUpdate(
      { _id: id, role: "librarian", isDeleted: { $ne: true } },
      { isDeleted: true, status: "inactive" },
      { new: true }
    );

    if (!librarian) {
      return res.status(404).json({
        message: "Librarian not found",
      });
    }

    return res.status(200).json({
      message: "Librarian deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to delete librarian",
    });
  }
};

/* ================= HARD DELETE LIBRARIAN ================= */
export const hardDeleteLibrarian = async (req, res) => {
  try {
    const { id } = req.params;
    const librarian = await User.findOneAndDelete({
      _id: id,
      role: "librarian",
    });

    if (!librarian) {
      return res.status(404).json({
        message: "Librarian not found",
      });
    }

    return res.status(200).json({
      message: "Librarian permanently deleted",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to permanently delete librarian",
    });
  }
};
