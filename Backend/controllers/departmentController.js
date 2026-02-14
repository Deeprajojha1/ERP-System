import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const REDIS_ENABLED = process.env.REDIS_ENABLED === "true";
/* ================= GET ALL DEPARTMENTS ================= */

export const getAllDepartments = async (req, res) => {
  try {
    const cacheKey = "admin:departments:all";

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        return res.json(cachedData);
      }
    } catch (err) {
      console.error("[Redis] getAllDepartments cache read failed:", err.message || err);
    }

    const departments = await Department.find({ isDeleted: { $ne: true } }).populate({
      path: "hod",
      populate: {
        path: "user",
        select: "name email status",
      },
    });

    const responsePayload = {
      message: "Departments fetched successfully",
      count: departments.length,
      departments,
    };

    try {
      await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
        EX: DEFAULT_CACHE_TTL,
      });
    } catch (err) {
      console.error("[Redis] getAllDepartments cache write failed:", err.message || err);
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= GET DEPARTMENT BY ID ================= */

export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findOne({ _id: id, isDeleted: { $ne: true } }).populate({
      path: "hod",
      populate: {
        path: "user",
        select: "name email status",
      },
    });

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({
      message: "Department fetched successfully",
      department,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= ADD DEPARTMENT ================= */

export const addDepartment = async (req, res) => {
  try {
    const { name, hod } = req.body;

    /* Check if department already exists */
    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({
        message: "Department already exists",
      });
    }

    const department = await Department.create({
      name,
      hod: hod || null,
    });

    const responsePayload = {
      message: "Department added successfully",
      department,
    };

    try {
      await redisClient.del("admin:departments:all");
    } catch (err) {
      console.error("[Redis] addDepartment cache clear failed:", err.message || err);
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= UPDATE DEPARTMENT ================= */

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const department = await Department.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "hod",
      populate: {
        path: "user",
        select: "name email status",
      },
    });

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    const responsePayload = {
      message: "Department updated successfully",
      department,
    };

    try {
      await redisClient.del("admin:departments:all");
    } catch (err) {
      console.error("[Redis] updateDepartment cache clear failed:", err.message || err);
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= DELETE DEPARTMENT ================= */

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    try {
      await redisClient.del("admin:departments:all");
    } catch (err) {
      console.error("[Redis] deleteDepartment cache clear failed:", err.message || err);
    }

    res.json({
      message: "Department deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ================= HARD DELETE DEPARTMENT ================= */

export const hardDeleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    try {
      await redisClient.del("admin:departments:all");
    } catch (err) {
      console.error("[Redis] hardDeleteDepartment cache clear failed:", err.message || err);
    }

    res.json({
      message: "Department permanently deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
