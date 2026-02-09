import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import User from "../models/userModel.js";

/* ================= GET ALL DEPARTMENTS ================= */

export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().populate("hod");

    res.json({
      message: "Departments fetched successfully",
      count: departments.length,
      departments,
    });
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

    const department = await Department.findById(id).populate("hod");

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

    res.status(201).json({
      message: "Department added successfully",
      department,
    });
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
    }).populate("hod");

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({
      message: "Department updated successfully",
      department,
    });
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

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
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
