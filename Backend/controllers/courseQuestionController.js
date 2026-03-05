import mongoose from "mongoose";
import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import Group from "../models/Group.js";
import Enrollment from "../models/Enrollment.js";
import CourseQuestion from "../models/CourseQuestion.js";
import FacultyCourseContent from "../models/FacultyCourseContent.js";

const normalizeText = (value = "", max = 2000) =>
  String(value || "").trim().slice(0, max);

const mapQuestionItem = (item) => {
  const replies = Array.isArray(item?.replies) ? item.replies : [];
  const latestFacultyReply = [...replies]
    .reverse()
    .find((reply) => reply?.senderRole === "faculty");

  return {
    _id: item?._id,
    id: String(item?._id || ""),
    subject: item?.subject || "Course Query",
    question: item?.question || "",
    status: item?.status || "open",
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    lastMessageAt: item?.lastMessageAt || item?.updatedAt || item?.createdAt || null,
    course: item?.course
      ? {
          _id: item.course._id,
          code: item.course.code || "N/A",
          courseName: item.course.courseName || "Course",
        }
      : null,
    student: item?.student
      ? {
          _id: item.student._id,
          name: item.student?.user?.name || "Student",
          email: item.student?.user?.email || "",
        }
      : null,
    faculty: item?.faculty
      ? {
          _id: item.faculty._id,
          name: item.faculty?.user?.name || "Faculty",
          email: item.faculty?.user?.email || "",
        }
      : null,
    latestFacultyReply: latestFacultyReply?.message || "",
    latestFacultyReplyAt: latestFacultyReply?.createdAt || null,
    replies: replies.map((reply) => ({
      _id: reply?._id,
      senderRole: reply?.senderRole || "faculty",
      senderUser: reply?.senderUser?._id
        ? {
            _id: reply.senderUser._id,
            name: reply.senderUser.name || "User",
            email: reply.senderUser.email || "",
          }
        : null,
      message: reply?.message || "",
      createdAt: reply?.createdAt || null,
    })),
  };
};

const resolveStudentContext = async (userId) => {
  const user = await User.findById(userId).select("_id role");
  if (!user || user.role !== "student") {
    return { status: 403, message: "Access denied. Not a student account." };
  }

  const student = await Student.findOne({ user: user._id })
    .select("_id group")
    .populate({
      path: "group",
      select: "_id courseIds courseFaculty",
    });

  if (!student) {
    return { status: 404, message: "Student profile not found." };
  }

  let courses = [];
  if (student.group?.courseIds?.length) {
    courses = student.group.courseIds;
  }

  if (courses.length === 0) {
    const enrollments = await Enrollment.find({
      student: student._id,
      status: "active",
    }).select("course");
    courses = enrollments.map((row) => row.course).filter(Boolean);
  }

  const courseIds = [
    ...new Set(
      courses
        .map((course) => String(course?._id || course || ""))
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
    ),
  ];

  return { user, student, courseIds };
};

const resolveFacultyForCourse = async ({ courseId, student }) => {
  const normalizedCourseId = String(courseId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedCourseId)) return null;

  const mappedFaculty =
    student?.group?.courseFaculty?.find(
      (entry) => String(entry?.course || "") === normalizedCourseId
    )?.faculty || null;
  if (mappedFaculty) return mappedFaculty;

  const latestContent = await FacultyCourseContent.findOne({
    course: normalizedCourseId,
    faculty: { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .select("faculty")
    .lean();
  if (latestContent?.faculty) return latestContent.faculty;

  const fallbackGroup = await Group.findOne({
    courseFaculty: {
      $elemMatch: {
        course: normalizedCourseId,
      },
    },
  })
    .select("courseFaculty")
    .lean();
  const fallbackFaculty =
    fallbackGroup?.courseFaculty?.find(
      (entry) => String(entry?.course || "") === normalizedCourseId
    )?.faculty || null;

  return fallbackFaculty;
};

export const createStudentCourseQuestion = async (req, res) => {
  try {
    const courseId = String(req.body?.courseId || "").trim();
    const subject = normalizeText(req.body?.subject, 160);
    const message = normalizeText(req.body?.message, 2000);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Valid courseId is required" });
    }

    if (!message) {
      return res.status(400).json({ message: "Question message is required" });
    }

    const context = await resolveStudentContext(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    if (!context.courseIds.includes(courseId)) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const facultyId = await resolveFacultyForCourse({
      courseId,
      student: context.student,
    });
    if (!facultyId) {
      return res.status(400).json({ message: "No faculty is assigned for this course" });
    }

    const created = await CourseQuestion.create({
      course: courseId,
      student: context.student._id,
      faculty: facultyId,
      subject: subject || "Course Query",
      question: message,
      status: "open",
      replies: [],
      lastMessageAt: new Date(),
    });

    const item = await CourseQuestion.findById(created._id)
      .populate({ path: "course", select: "_id code courseName" })
      .populate({
        path: "student",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "faculty",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "replies.senderUser",
        select: "name email",
      })
      .lean();

    return res.status(201).json({
      message: "Question sent to faculty successfully",
      item: mapQuestionItem(item),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to send question to faculty",
    });
  }
};

export const getStudentCourseQuestions = async (req, res) => {
  try {
    const courseId = String(req.query?.courseId || "").trim();

    const context = await resolveStudentContext(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    const query = {
      student: context.student._id,
    };

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId" });
      }
      if (!context.courseIds.includes(courseId)) {
        return res.status(403).json({ message: "You are not enrolled in this course" });
      }
      query.course = courseId;
    }

    const rows = await CourseQuestion.find(query)
      .populate({ path: "course", select: "_id code courseName" })
      .populate({
        path: "student",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "faculty",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "replies.senderUser",
        select: "name email",
      })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Course questions fetched successfully",
      count: rows.length,
      items: rows.map(mapQuestionItem),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch course questions",
    });
  }
};

const resolveFacultyProfile = async (userId) => {
  const faculty = await Faculty.findOne({ user: userId }).select("_id");
  if (!faculty) {
    return { status: 404, message: "Faculty profile not found" };
  }
  return { faculty };
};

export const getFacultyCourseQuestions = async (req, res) => {
  try {
    const courseId = String(req.query?.courseId || "").trim();
    const status = normalizeText(req.query?.status, 20).toLowerCase();

    const context = await resolveFacultyProfile(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    const query = {
      faculty: context.faculty._id,
    };

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid courseId" });
      }
      query.course = courseId;
    }

    if (status) {
      if (status !== "open" && status !== "answered") {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      query.status = status;
    }

    const rows = await CourseQuestion.find(query)
      .populate({ path: "course", select: "_id code courseName" })
      .populate({
        path: "student",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "faculty",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "replies.senderUser",
        select: "name email",
      })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Faculty course questions fetched successfully",
      count: rows.length,
      items: rows.map(mapQuestionItem),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch faculty course questions",
    });
  }
};

export const replyToCourseQuestion = async (req, res) => {
  try {
    const questionId = String(req.params?.id || "").trim();
    const message = normalizeText(req.body?.message, 2000);

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: "Invalid question id" });
    }

    if (!message) {
      return res.status(400).json({ message: "Reply message is required" });
    }

    const context = await resolveFacultyProfile(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    const item = await CourseQuestion.findOne({
      _id: questionId,
      faculty: context.faculty._id,
    });

    if (!item) {
      return res.status(404).json({ message: "Question not found" });
    }

    item.replies.push({
      senderRole: "faculty",
      senderUser: req.userId,
      message,
      createdAt: new Date(),
    });
    item.status = "answered";
    item.lastMessageAt = new Date();
    await item.save();

    const refreshed = await CourseQuestion.findById(item._id)
      .populate({ path: "course", select: "_id code courseName" })
      .populate({
        path: "student",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "faculty",
        select: "_id user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "replies.senderUser",
        select: "name email",
      })
      .lean();

    return res.status(200).json({
      message: "Reply sent successfully",
      item: mapQuestionItem(refreshed),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to send reply",
    });
  }
};
