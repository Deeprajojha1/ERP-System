import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Faculty from "../models/Faculty.js";
import Group from "../models/Group.js";
import FacultyCourseContent from "../models/FacultyCourseContent.js";

const normalizeText = (value = "") => String(value || "").trim();

const toPublicFileUrl = (req, fileName = "") => {
  if (!fileName) return "";
  return `${req.protocol}://${req.get("host")}/uploads/faculty-content/${fileName}`;
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_error) {
    // Ignore cleanup failures.
  }
};

const removeStoredSyllabusFile = async (fileName) => {
  const normalized = normalizeText(fileName);
  if (!normalized) return;
  const absolutePath = path.join(process.cwd(), "uploads", "faculty-content", normalized);
  await removeUploadedFile(absolutePath);
};

const validateFacultyCourseAccess = async ({ courseId, userId }) => {
  const [course, faculty] = await Promise.all([
    Course.findById(courseId).select("_id code courseName"),
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

const mapSyllabus = (doc) => ({
  _id: doc._id,
  course: doc.course,
  faculty: doc.faculty,
  type: doc.type,
  title: doc.title,
  description: doc.description || "",
  fileUrl: doc.fileUrl || "",
  fileName: doc.fileName || "",
  originalFileName: doc.originalFileName || "",
  fileMime: doc.fileMime || "",
  fileSize: doc.fileSize || 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const getFacultyCourseSyllabus = async (req, res) => {
  try {
    if (req.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can access syllabus APIs" });
    }

    const courseId = normalizeText(req.query?.courseId);
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Valid courseId is required" });
    }

    const access = await validateFacultyCourseAccess({ courseId, userId: req.userId });
    if (access?.status) {
      return res.status(access.status).json({ message: access.message });
    }

    const syllabus = await FacultyCourseContent.findOne({
      course: access.course._id,
      faculty: access.faculty._id,
      type: "syllabus",
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not uploaded yet" });
    }

    return res.status(200).json({
      message: "Syllabus fetched successfully",
      syllabus: mapSyllabus(syllabus),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch syllabus",
    });
  }
};

export const upsertFacultyCourseSyllabus = async (req, res) => {
  try {
    if (req.role !== "faculty") {
      await removeUploadedFile(req.file?.path);
      return res.status(403).json({ message: "Only faculty can upload syllabus" });
    }

    const courseId = normalizeText(req.body?.courseId);
    const title = normalizeText(req.body?.title) || "Course Syllabus";
    const description = normalizeText(req.body?.description);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Valid courseId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a syllabus file" });
    }

    const access = await validateFacultyCourseAccess({ courseId, userId: req.userId });
    if (access?.status) {
      await removeUploadedFile(req.file?.path);
      return res.status(access.status).json({ message: access.message });
    }

    const existing = await FacultyCourseContent.findOne({
      course: access.course._id,
      faculty: access.faculty._id,
      type: "syllabus",
    }).select("_id fileName");

    const payload = {
      course: access.course._id,
      faculty: access.faculty._id,
      type: "syllabus",
      title,
      description,
      dueDate: null,
      questionCount: null,
      fileUrl: toPublicFileUrl(req, req.file.filename),
      fileName: req.file.filename,
      originalFileName: req.file.originalname || "",
      fileMime: req.file.mimetype || "",
      fileSize: req.file.size || 0,
    };

    const syllabus = await FacultyCourseContent.findOneAndUpdate(
      {
        course: access.course._id,
        faculty: access.faculty._id,
        type: "syllabus",
      },
      { $set: payload },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    if (existing?.fileName && existing.fileName !== req.file.filename) {
      await removeStoredSyllabusFile(existing.fileName);
    }

    return res.status(existing ? 200 : 201).json({
      message: existing ? "Syllabus updated successfully" : "Syllabus uploaded successfully",
      syllabus: mapSyllabus(syllabus),
    });
  } catch (error) {
    await removeUploadedFile(req.file?.path);
    return res.status(500).json({
      message: error.message || "Failed to upload syllabus",
    });
  }
};
