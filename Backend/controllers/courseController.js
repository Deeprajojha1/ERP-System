import Course from "../models/Course.js";
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";

/* ================= GET ALL COURSES ================= */

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    res.json({
      message: "Courses fetched successfully",
      count: courses.length,
      courses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET COURSE BY ID ================= */

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      message: "Course fetched successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= ADD COURSE ================= */

export const addCourse = async (req, res) => {
  try {
    const { code, courseName, department, semester, branch, credit, facultyIds } = req.body;

    /* Check if course code already exists */
    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({ message: "Course code already exists" });
    }

    const course = await Course.create({
      code,
      courseName,
      department,
      semester,
      branch,
      credit,
      facultyIds: facultyIds || [],
    });

    const populatedCourse = await Course.findById(course._id)
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    res.status(201).json({
      message: "Course added successfully",
      course: populatedCourse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE COURSE ================= */

export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const course = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE COURSE ================= */

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
