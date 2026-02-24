import fs from "fs";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Faculty from "../models/Faculty.js";
import Group from "../models/Group.js";
import FacultyCourseContent from "../models/FacultyCourseContent.js";

const ALLOWED_TYPES = new Set(["materials", "assignments", "quizzes"]);

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_error) {
    // Ignore cleanup failures.
  }
};

const normalizeType = (value = "") => String(value || "").trim().toLowerCase();

const toPublicFileUrl = (req, fileName = "") => {
  if (!fileName) return "";
  return `${req.protocol}://${req.get("host")}/uploads/faculty-content/${fileName}`;
};

const mapContent = (item) => ({
  _id: item._id,
  course: item.course,
  faculty: item.faculty,
  type: item.type,
  title: item.title,
  description: item.description || "",
  dueDate: item.dueDate || null,
  questionCount: item.questionCount || null,
  fileUrl: item.fileUrl || "",
  fileName: item.fileName || "",
  originalFileName: item.originalFileName || "",
  fileMime: item.fileMime || "",
  fileSize: item.fileSize || 0,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const validateFacultyCourseAccess = async ({ courseId, userId }) => {
  const [course, faculty] = await Promise.all([
    Course.findById(courseId).select("_id"),
    Faculty.findOne({ user: userId }).select("_id"),
  ]);

  if (!course) {
    return { status: 404, message: "Course not found" };
  }

  if (!faculty) {
    return { status: 404, message: "Faculty profile not found" };
  }

  const assigned = await Group.exists({
    courseFaculty: {
      $elemMatch: {
        course: course._id,
        faculty: faculty._id,
      },
    },
  });

  if (!assigned) {
    return { status: 403, message: "You are not assigned to this course" };
  }

  return { course, faculty };
};

export const getCourseContents = async (req, res) => {
  try {
    if (req.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can access course content APIs" });
    }

    const courseId = String(req.query?.courseId || "").trim();
    const type = normalizeType(req.query?.type);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Valid courseId is required" });
    }

    if (type && !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const access = await validateFacultyCourseAccess({ courseId, userId: req.userId });
    if (access?.status) {
      return res.status(access.status).json({ message: access.message });
    }

    const query = {
      course: access.course._id,
      faculty: access.faculty._id,
    };
    if (type) {
      query.type = type;
    }

    const items = await FacultyCourseContent.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      items: items.map(mapContent),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch course content" });
  }
};

export const createCourseContent = async (req, res) => {
  try {
    if (req.role !== "faculty") {
      await removeUploadedFile(req.file?.path);
      return res.status(403).json({ message: "Only faculty can upload course content" });
    }

    const courseId = String(req.body?.courseId || "").trim();
    const type = normalizeType(req.body?.type);
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const dueDateRaw = String(req.body?.dueDate || "").trim();
    const questionCountRaw = String(req.body?.questions || req.body?.questionCount || "").trim();

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Valid courseId is required" });
    }

    if (!ALLOWED_TYPES.has(type)) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (!title) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Title is required" });
    }

    if (type === "materials" && !req.file) {
      return res.status(400).json({ message: "Please upload a file for materials" });
    }

    if (type === "assignments" && !dueDateRaw) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Due date is required for assignments" });
    }

    const dueDateValue =
      type === "assignments" && dueDateRaw ? new Date(dueDateRaw) : null;

    if (type === "assignments" && dueDateRaw) {
      if (Number.isNaN(dueDateValue.getTime())) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "Invalid due date format" });
      }
    }

    const questionCountValue =
      type === "quizzes" && questionCountRaw ? Number(questionCountRaw) : null;

    if (type === "quizzes" && questionCountRaw) {
      if (!Number.isFinite(questionCountValue) || questionCountValue < 1) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "Question count must be at least 1" });
      }
    }

    const access = await validateFacultyCourseAccess({ courseId, userId: req.userId });
    if (access?.status) {
      await removeUploadedFile(req.file?.path);
      return res.status(access.status).json({ message: access.message });
    }

    const payload = {
      course: access.course._id,
      faculty: access.faculty._id,
      type,
      title,
      description,
      dueDate: dueDateValue,
      questionCount: questionCountValue,
      fileUrl: req.file ? toPublicFileUrl(req, req.file.filename) : "",
      fileName: req.file?.filename || "",
      originalFileName: req.file?.originalname || "",
      fileMime: req.file?.mimetype || "",
      fileSize: req.file?.size || 0,
    };

    const createdItem = await FacultyCourseContent.create(payload);

    return res.status(201).json({
      message: "Course content created successfully",
      item: mapContent(createdItem),
    });
  } catch (error) {
    await removeUploadedFile(req.file?.path);
    return res.status(500).json({ message: error.message || "Failed to create course content" });
  }
};
