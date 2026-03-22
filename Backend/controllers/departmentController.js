import Department from "../models/Department.js";
import Program from "../models/feeProgram.js";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";
import { normalizeProgramList } from "../utils/programNormalization.js";

const buildProgramYearMap = async (programNames = []) => {
  const unique = Array.from(
    new Set((Array.isArray(programNames) ? programNames : []).filter(Boolean))
  );
  if (!unique.length) return new Map();
  const programDocs = await Program.find({ programName: { $in: unique } })
    .select("programName durationYears")
    .lean();
  return new Map(
    programDocs.map((doc) => [String(doc.programName), Number(doc.durationYears || 0)])
  );
};

const attachYearInfo = (department, programYearMap) => {
  const programs = Array.isArray(department.program) ? department.program : [];
  const durations = programs
    .map((p) => programYearMap.get(String(p)) || 0)
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxYears = durations.length ? Math.max(...durations) : 0;
  return {
    ...department,
    yearCount: maxYears,
    years: maxYears ? Array.from({ length: maxYears }, (_, idx) => idx + 1) : [],
    programYears: programs
      .map((p) => ({
        program: p,
        durationYears: programYearMap.get(String(p)) || 0,
      }))
      .filter((row) => row.durationYears > 0),
  };
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
      const normalizedPrograms = normalizeProgramList(asObject.program);
      return {
        ...asObject,
        program: normalizedPrograms,
        programs: normalizedPrograms,
      };
    });

    const programNames = normalizedDepartments.flatMap((dept) => dept.program || []);
    const programYearMap = await buildProgramYearMap(programNames);
    const withYearInfo = normalizedDepartments.map((dept) =>
      attachYearInfo(dept, programYearMap)
    );

    const responsePayload = {
      message: "Departments fetched successfully",
      count: withYearInfo.length,
      departments: withYearInfo,
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

    const normalizedPrograms = normalizeProgramList(departmentObj.program);
    const normalized = {
      ...departmentObj,
      program: normalizedPrograms,
      programs: normalizedPrograms,
    };
    const programYearMap = await buildProgramYearMap(normalized.program || []);
    const enriched = attachYearInfo(normalized, programYearMap);

    res.json({
      message: "Department fetched successfully",
      department: enriched,
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
    const programs = normalizeProgramList(req.body.program);

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
      const programs = normalizeProgramList(req.body.program);
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
