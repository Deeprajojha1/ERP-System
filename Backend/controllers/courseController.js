import Course from "../models/Course.js";
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import redisClient, { DEFAULT_CACHE_TTL } from "../config/redisClient.js";

/* ================= GET ALL COURSES ================= */

export const getAllCourses = async (req, res) => {
  try {
    const noCache = req.query.noCache === "true";
    const cacheKey = "admin:courses:all";

    if (!noCache) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          return res.json(cachedData);
        }
      } catch (err) {
        console.error("[Redis] getAllCourses cache read failed:", err.message || err);
      }
    }

    const courses = await Course.find({ isDeleted: { $ne: true } })
      .populate("department")
      .populate({
        path: "facultyIds",
        populate: { path: "user", select: "name email" },
      });

    const studentCounts = await Student.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
    ]);

    const studentCountMap = studentCounts.reduce((acc, doc) => {
      if (doc._id) {
        acc[doc._id.toString()] = doc.count;
      }
      return acc;
    }, {});

    const simplifiedCourses = courses.map((course) => {
      const deptId = course.department?._id?.toString();
      const studentsInDepartment = deptId
        ? studentCountMap[deptId] || 0
        : 0;

      const coordinator =
        course.facultyIds && course.facultyIds.length > 0
          ? course.facultyIds[0]
          : null;

      const coordinatorName = coordinator?.user?.name || null;

      return {
        id: course._id,
        code: course.code,
        courseName: course.courseName,
        department: course.department?.name || null,
        departmentId: course.department?._id || null,
        credit: course.credit,
        branch: course.branch || null,
        studentsInDepartment,
        coordinatorId: coordinator?._id || null,
        coordinatorName,
      };
    });
    const responsePayload = {
      message: "Courses fetched successfully",
      count: simplifiedCourses.length,
      courses: simplifiedCourses,
    };

    if (!noCache) {
      try {
        // Cache using global TTL
        await redisClient.set(cacheKey, JSON.stringify(responsePayload), {
          EX: DEFAULT_CACHE_TTL,
        });
      } catch (err) {
        console.error("[Redis] getAllCourses cache write failed:", err.message || err);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET COURSE BY ID ================= */

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({ _id: id, isDeleted: { $ne: true } })
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

    const responsePayload = {
      message: "Course added successfully",
      course: populatedCourse,
    };

    try {
      await redisClient.del("admin:courses:all");
    } catch (err) {
      console.error("[Redis] addCourse cache clear failed:", err.message || err);
    }

    res.status(201).json(responsePayload);
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

    const responsePayload = {
      message: "Course updated successfully",
      course,
    };

    try {
      await redisClient.del("admin:courses:all");
    } catch (err) {
      console.error("[Redis] updateCourse cache clear failed:", err.message || err);
    }

    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE COURSE ================= */

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    try {
      await redisClient.del("admin:courses:all");
    } catch (err) {
      console.error("[Redis] deleteCourse cache clear failed:", err.message || err);
    }

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= HARD DELETE COURSE ================= */

export const hardDeleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    try {
      await redisClient.del("admin:courses:all");
    } catch (err) {
      console.error("[Redis] hardDeleteCourse cache clear failed:", err.message || err);
    }

    res.json({ message: "Course permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
