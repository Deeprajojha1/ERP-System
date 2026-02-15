import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

const REDIS_ENABLED = process.env.REDIS_ENABLED === "true";

const PROGRAM_CANONICAL_MAP = {
  btech: "btech",
  mtech: "mtech",
  bca: "bca",
  mca: "mca",
  bba: "bba",
  mba: "mba",
};

const canonicalizeProgram = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return PROGRAM_CANONICAL_MAP[normalized] || "";
};

const normalizePrograms = (program) => {
  if (Array.isArray(program)) {
    return program
      .map((p) => canonicalizeProgram(p))
      .filter(Boolean);
  }
  if (typeof program === "string") {
    const value = canonicalizeProgram(program);
    return value ? [value] : [];
  }
  return [];
};
/* ================= GET ALL DEPARTMENTS ================= */

export const getAllDepartments = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:departments:all";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getAllDepartments cache read failed:", err.message || err);
      }
    }

    const departments = await Department.find({ isDeleted: { $ne: true } }).populate({
      path: "hod",
      populate: {
        path: "user",
        select: "name email status",
      },
    });

    const normalizedDepartments = departments.map((dept) => {
      const asObject = typeof dept.toObject === "function" ? dept.toObject() : dept;
      return {
        ...asObject,
        program: Array.isArray(asObject.program) ? asObject.program : [],
        programs: Array.isArray(asObject.program) ? asObject.program : [],
      };
    });

    const responsePayload = {
      message: "Departments fetched successfully",
      count: normalizedDepartments.length,
      departments: normalizedDepartments,
    };

    if (!noCache) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllDepartments cache write failed:", err.message || err);
      }
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

    const departmentObj =
      typeof department.toObject === "function" ? department.toObject() : department;

    res.json({
      message: "Department fetched successfully",
      department: {
        ...departmentObj,
        program: Array.isArray(departmentObj.program) ? departmentObj.program : [],
        programs: Array.isArray(departmentObj.program) ? departmentObj.program : [],
      },
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
    const programs = normalizePrograms(req.body.program);

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: "Department name is required",
      });
    }

    if (!programs.length) {
      return res.status(400).json({
        message: "At least one program is required",
      });
    }

    /* Check if department already exists */
    const existingDepartment = await Department.findOne({
      name: String(name).trim(),
    });
    if (existingDepartment) {
      return res.status(400).json({
        message: "Department already exists",
      });
    }

    const department = await Department.create({
      name: String(name).trim(),
      program: [...new Set(programs)],
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
    const updateData = {};

    if (typeof req.body.name !== "undefined") {
      const normalizedName = String(req.body.name || "").trim();
      if (!normalizedName) {
        return res.status(400).json({
          message: "Department name cannot be empty",
        });
      }
      updateData.name = normalizedName;
    }

    if (typeof req.body.program !== "undefined") {
      const programs = normalizePrograms(req.body.program);
      if (!programs.length) {
        return res.status(400).json({
          message: "At least one program is required",
        });
      }
      updateData.program = [...new Set(programs)];
    }

    if (typeof req.body.hod !== "undefined") {
      updateData.hod = req.body.hod || null;
    }

    if (!Object.keys(updateData).length) {
      return res.status(400).json({
        message: "Provide at least one field to update: name, program, or hod",
      });
    }

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
