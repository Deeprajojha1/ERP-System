import fs from "fs";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Faculty from "../models/Faculty.js";
import Group from "../models/Group.js";
import FacultyCourseContent from "../models/FacultyCourseContent.js";

const ALLOWED_TYPES = new Set([
  "materials",
  "assignments",
  "quizzes",
  "syllabus",
  "questionbanks",
]);

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

const buildUploadPath = (fileName = "") =>
  fileName ? `${process.cwd()}/uploads/faculty-content/${fileName}` : "";

const mapContent = (item) => ({
  _id: item._id,
  course: item.course,
  faculty: item.faculty,
  type: item.type,
  title: item.title,
  description: item.description || "",
  dueDate: item.dueDate || null,
  group: item.group || null,
  groupId: item.group?._id || item.group || null,
  groupName: item.group?.name || null,
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
      .populate("group", "_id name")
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
    const groupIdRaw = String(req.body?.groupId || "").trim();

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

    if (type === "syllabus" && !req.file) {
      return res.status(400).json({ message: "Please upload a file for syllabus" });
    }

    if (type === "questionbanks" && !req.file) {
      return res.status(400).json({ message: "Please upload a file for question bank" });
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

    // Validate groupId if provided (optional for all content types)
    let groupIdValue = null;
    if (groupIdRaw && mongoose.Types.ObjectId.isValid(groupIdRaw)) {
      const groupExists = await Group.exists({
        _id: groupIdRaw,
        courseFaculty: {
          $elemMatch: {
            course: access.course._id,
            faculty: access.faculty._id,
          },
        },
      });
      if (groupExists) {
        groupIdValue = groupIdRaw;
      }
    }

    const payload = {
      course: access.course._id,
      faculty: access.faculty._id,
      type,
      title,
      description,
      dueDate: dueDateValue,
      group: groupIdValue,
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

export const updateCourseContent = async (req, res) => {
  try {
    if (req.role !== "faculty") {
      await removeUploadedFile(req.file?.path);
      return res.status(403).json({ message: "Only faculty can update course content" });
    }

    const contentId = String(req.params?.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Valid content id is required" });
    }

    const faculty = await Faculty.findOne({ user: req.userId }).select("_id");
    if (!faculty) {
      await removeUploadedFile(req.file?.path);
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const content = await FacultyCourseContent.findOne({
      _id: contentId,
      faculty: faculty._id,
    });

    if (!content) {
      await removeUploadedFile(req.file?.path);
      return res.status(404).json({ message: "Course content not found" });
    }

    const type = normalizeType(req.body?.type || content.type);
    if (!ALLOWED_TYPES.has(type) || type !== content.type) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Content type cannot be changed" });
    }

    const titleRaw = req.body?.title;
    if (titleRaw !== undefined) {
      const title = String(titleRaw || "").trim();
      if (!title) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "Title is required" });
      }
      content.title = title;
    }

    const descriptionRaw = req.body?.description;
    if (descriptionRaw !== undefined) {
      content.description = String(descriptionRaw || "").trim();
    }

    const dueDateRaw = String(req.body?.dueDate || "").trim();
    if (type === "assignments" && dueDateRaw) {
      const dueDateValue = new Date(dueDateRaw);
      if (Number.isNaN(dueDateValue.getTime())) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "Invalid due date format" });
      }
      content.dueDate = dueDateValue;
    }

    const questionCountRaw = String(req.body?.questions || req.body?.questionCount || "").trim();
    if (type === "quizzes" && questionCountRaw) {
      const questionCountValue = Number(questionCountRaw);
      if (!Number.isFinite(questionCountValue) || questionCountValue < 1) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "Question count must be at least 1" });
      }
      content.questionCount = questionCountValue;
    }

    const groupIdRaw = String(req.body?.groupId || "").trim();
    if (groupIdRaw === "") {
      content.group = null;
    } else if (groupIdRaw && mongoose.Types.ObjectId.isValid(groupIdRaw)) {
      const groupExists = await Group.exists({
        _id: groupIdRaw,
        courseFaculty: {
          $elemMatch: {
            course: content.course,
            faculty: faculty._id,
          },
        },
      });
      if (groupExists) {
        content.group = groupIdRaw;
      }
    }

    if (req.file) {
      const oldPath = buildUploadPath(content.fileName);
      await removeUploadedFile(oldPath);
      content.fileUrl = toPublicFileUrl(req, req.file.filename);
      content.fileName = req.file.filename || "";
      content.originalFileName = req.file.originalname || "";
      content.fileMime = req.file.mimetype || "";
      content.fileSize = req.file.size || 0;
    }

    await content.save();
    await content.populate("group", "_id name");

    return res.status(200).json({
      message: "Course content updated successfully",
      item: mapContent(content),
    });
  } catch (error) {
    await removeUploadedFile(req.file?.path);
    return res.status(500).json({ message: error.message || "Failed to update course content" });
  }
};

export const deleteCourseContent = async (req, res) => {
  try {
    if (req.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can delete course content" });
    }

    const contentId = String(req.params?.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ message: "Valid content id is required" });
    }

    const faculty = await Faculty.findOne({ user: req.userId }).select("_id");
    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const content = await FacultyCourseContent.findOne({
      _id: contentId,
      faculty: faculty._id,
    });

    if (!content) {
      return res.status(404).json({ message: "Course content not found" });
    }

    if (content.type !== "assignments") {
      return res.status(403).json({ message: "Only assignments can be deleted here" });
    }

    const oldPath = buildUploadPath(content.fileName);
    await content.deleteOne();
    await removeUploadedFile(oldPath);

    return res.status(200).json({ message: "Assignment deleted successfully", id: contentId });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete assignment" });
  }
};
