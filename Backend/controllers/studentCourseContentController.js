import mongoose from "mongoose";
import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import FacultyCourseContent from "../models/FacultyCourseContent.js";
import Submission from "../models/Submission.js";

const ALLOWED_TYPES = new Set([
  "materials",
  "assignments",
  "quizzes",
  "syllabus",
  "questionbanks",
]);

const normalizeType = (value = "") => String(value || "").trim().toLowerCase();

const buildDueMessage = (dueDate) => {
  if (!dueDate) return "Please check assignment instructions.";
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return "Please check assignment instructions.";
  const now = Date.now();
  if (parsed.getTime() < now) return "Due date has passed. Contact faculty for next steps.";
  return "Complete and submit before the due date.";
};

const mapMaterialItem = (item) => ({
  _id: item._id,
  id: String(item._id),
  type: "materials",
  title: item.title || "Untitled material",
  name: item.title || "Untitled material",
  description: item.description || "",
  date: item.createdAt || null,
  createdAt: item.createdAt || null,
  fileUrl: item.fileUrl || "",
  fileName: item.fileName || "",
  originalFileName: item.originalFileName || "",
  fileMime: item.fileMime || "",
  fileSize: item.fileSize || 0,
});

const mapSyllabusItem = (item) => ({
  _id: item._id,
  id: String(item._id),
  type: "syllabus",
  title: item.title || "Course syllabus",
  name: item.title || "Course syllabus",
  description: item.description || "",
  date: item.createdAt || null,
  createdAt: item.createdAt || null,
  fileUrl: item.fileUrl || "",
  fileName: item.fileName || "",
  originalFileName: item.originalFileName || "",
  fileMime: item.fileMime || "",
  fileSize: item.fileSize || 0,
});

const mapQuestionBankItem = (item) => ({
  _id: item._id,
  id: String(item._id),
  type: "questionbanks",
  title: item.title || "Question bank",
  name: item.title || "Question bank",
  description: item.description || "",
  date: item.createdAt || null,
  createdAt: item.createdAt || null,
  fileUrl: item.fileUrl || "",
  fileName: item.fileName || "",
  originalFileName: item.originalFileName || "",
  fileMime: item.fileMime || "",
  fileSize: item.fileSize || 0,
});

const mapSubmissionForStudent = (submission) => {
  if (!submission) return null;
  const hasMarks =
    submission.marks !== null &&
    submission.marks !== undefined &&
    Number.isFinite(Number(submission.marks));
  const hasGrade = Boolean(String(submission.grade || "").trim());
  const status = hasMarks || hasGrade ? "graded" : "submitted";

  return {
    _id: submission._id,
    id: String(submission._id || ""),
    fileUrl: submission.fileUrl || "",
    fileName: submission.fileName || "",
    originalFileName: submission.originalFileName || submission.fileName || "",
    fileMime: submission.fileMime || "",
    fileSize: submission.fileSize || 0,
    fileType: submission.fileType || "",
    remarks: submission.remarks || "",
    marks: submission.marks ?? null,
    grade: submission.grade || "",
    feedback: submission.feedback || "",
    submittedAt: submission.createdAt || null,
    updatedAt: submission.updatedAt || null,
    status,
  };
};

const mapAssignmentLikeItem = (item, submission = null) => {
  const isQuiz = item.type === "quizzes";
  const dueDate = item.dueDate || null;
  const fileUrl = item.fileUrl || "";
  const originalFileName = item.originalFileName || item.fileName || "";
  const normalizedSubmission = mapSubmissionForStudent(submission);
  const status = normalizedSubmission
    ? normalizedSubmission.status
    : "pending";
  const marks = normalizedSubmission?.marks ?? null;
  const grade = normalizedSubmission?.grade || "";
  const feedback = normalizedSubmission?.feedback || "";
  const submittedAt = normalizedSubmission?.submittedAt || null;
  const message = isQuiz
    ? "Quiz attempt status will appear here."
    : status === "graded"
    ? "Graded by faculty. Check marks and feedback."
    : status === "submitted"
    ? "Submitted successfully. Awaiting faculty grading."
    : buildDueMessage(dueDate);

  return {
    _id: item._id,
    id: String(item._id),
    type: item.type,
    category: isQuiz ? "Quiz" : "Assignment",
    title: item.title || (isQuiz ? "Untitled quiz" : "Untitled assignment"),
    description: item.description || "",
    instructions: item.description || "No instructions available from faculty.",
    status,
    postedAt: item.createdAt || null,
    createdAt: item.createdAt || null,
    dueDate,
    dueAt: dueDate,
    questionCount: item.questionCount || null,
    message,
    cta: isQuiz ? "Open Quiz" : "View Assignment",
    marks,
    totalScore: marks,
    grade,
    feedback,
    submittedAt,
    fileUrl,
    fileName: item.fileName || "",
    originalFileName,
    fileMime: item.fileMime || "",
    fileSize: item.fileSize || 0,
    attachments: fileUrl
      ? [
          {
            name: originalFileName || "Attachment",
            url: fileUrl,
            size: item.fileSize || 0,
            mime: item.fileMime || "",
          },
        ]
      : [],
    submission: normalizedSubmission,
  };
};

const resolveStudentAndCourseIds = async (userId) => {
  const user = await User.findById(userId).select("_id role");
  if (!user || user.role !== "student") {
    return { status: 403, message: "Access denied. Not a student account." };
  }

  const student = await Student.findOne({ user: user._id })
    .select("_id group")
    .populate({
      path: "group",
      select: "courseIds",
      populate: {
        path: "courseIds",
        select: "_id code courseName",
      },
    });

  if (!student) {
    return { status: 404, message: "Student profile not found." };
  }

  let courses = [];
  if (student.group?.courseIds?.length) {
    courses = student.group.courseIds.filter(Boolean);
  }

  if (courses.length === 0) {
    const enrollments = await Enrollment.find({
      student: student._id,
      status: "active",
    }).populate({
      path: "course",
      select: "_id code courseName",
    });

    courses = enrollments.map((row) => row.course).filter(Boolean);
  }

  const courseIds = [
    ...new Set(
      courses
        .map((course) => String(course?._id || ""))
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
    ),
  ];

  return {
    user,
    student,
    courseIds,
  };
};

export const getStudentCourseContent = async (req, res) => {
  try {
    console.log("Received request to fetch student course content", {
      userId: req.userId,
      query: req.query,
    });
    const type = normalizeType(req.query?.type);
    const requestedCourseId = String(req.query?.courseId || "").trim();
 console.log("Normalized query parameters", { type, requestedCourseId });
    if (type && !ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const context = await resolveStudentAndCourseIds(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    let permittedCourseIds = context.courseIds;
    if (requestedCourseId) {
      if (!mongoose.Types.ObjectId.isValid(requestedCourseId)) {
        return res.status(400).json({ message: "Invalid courseId" });
      }
      if (!permittedCourseIds.includes(requestedCourseId)) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        });
      }
      permittedCourseIds = [requestedCourseId];
    }

    if (permittedCourseIds.length === 0) {
      return res.status(200).json({
        message: "No course content found",
        count: 0,
        contentByCourse: {},
        items: [],
      });
    }

    const query = {
      course: { $in: permittedCourseIds },
    };
    if (type) query.type = type;

    const rows = await FacultyCourseContent.find(query)
      .populate({ path: "course", select: "_id code courseName" })
      .populate({
        path: "faculty",
        select: "user",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const assignmentIds = rows
      .filter((row) => row.type === "assignments")
      .map((row) => row._id)
      .filter(Boolean);
    const submissionMap = new Map();

    if (assignmentIds.length > 0) {
      const submissions = await Submission.find({
        assignment: { $in: assignmentIds },
        student: context.user._id,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

      submissions.forEach((submission) => {
        const assignmentId = String(submission.assignment || "");
        if (!assignmentId || submissionMap.has(assignmentId)) return;
        submissionMap.set(assignmentId, submission);
      });
    }

    const contentByCourse = {};
    const items = [];

    rows.forEach((row) => {
      const courseId = String(row.course?._id || row.course || "");
      if (!courseId) return;

      if (!contentByCourse[courseId]) {
        contentByCourse[courseId] = {
          course: row.course
            ? {
                _id: row.course._id,
                code: row.course.code || "N/A",
                courseName: row.course.courseName || "Course",
              }
            : null,
          facultyName: row.faculty?.user?.name || "N/A",
          materials: [],
          syllabus: [],
          questionBanks: [],
          assignments: [],
          quizzes: [],
          combinedAssignments: [],
          counts: {
            materials: 0,
            syllabus: 0,
            questionBanks: 0,
            assignments: 0,
            quizzes: 0,
            
            combinedAssignments: 0,
          },
        };
      }

      const materialItem = mapMaterialItem(row);
      const syllabusItem = mapSyllabusItem(row);
      const questionBankItem = mapQuestionBankItem(row);
      const submission =
        row.type === "assignments"
          ? submissionMap.get(String(row._id || ""))
          : null;
      const assignmentLikeItem = mapAssignmentLikeItem(row, submission);

      if (row.type === "materials") {
        contentByCourse[courseId].materials.push(materialItem);
      } else if (row.type === "syllabus") {
        contentByCourse[courseId].syllabus.push(syllabusItem);
      } else if (row.type === "questionbanks") {
        contentByCourse[courseId].questionBanks.push(questionBankItem);
      } else if (row.type === "assignments") {
        contentByCourse[courseId].assignments.push(assignmentLikeItem);
        contentByCourse[courseId].combinedAssignments.push(assignmentLikeItem);
      } else if (row.type === "quizzes") {
        contentByCourse[courseId].quizzes.push(assignmentLikeItem);
        contentByCourse[courseId].combinedAssignments.push(assignmentLikeItem);
      }

      items.push({
        _id: row._id,
        id: String(row._id),
        type: row.type,
        title: row.title || "",
        description: row.description || "",
        dueDate: row.dueDate || null,
        questionCount: row.questionCount || null,
        fileUrl: row.fileUrl || "",
        fileName: row.fileName || "",
        originalFileName: row.originalFileName || "",
        fileMime: row.fileMime || "",
        fileSize: row.fileSize || 0,
        status: assignmentLikeItem.status,
        marks: assignmentLikeItem.marks,
        totalScore: assignmentLikeItem.totalScore,
        grade: assignmentLikeItem.grade,
        feedback: assignmentLikeItem.feedback,
        submission: assignmentLikeItem.submission,
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null,
        course: row.course
          ? {
              _id: row.course._id,
              code: row.course.code || "N/A",
              courseName: row.course.courseName || "Course",
            }
          : null,
        faculty: {
          name: row.faculty?.user?.name || "N/A",
          email: row.faculty?.user?.email || "",
        },
      });
    });

    Object.values(contentByCourse).forEach((bucket) => {
      bucket.counts.materials = bucket.materials.length;
      bucket.counts.syllabus = bucket.syllabus.length;
      bucket.counts.questionBanks = bucket.questionBanks.length;
      bucket.counts.assignments = bucket.assignments.length;
      bucket.counts.quizzes = bucket.quizzes.length;
      bucket.counts.combinedAssignments = bucket.combinedAssignments.length;
    });

    return res.status(200).json({
      message: "Course content fetched successfully",
      count: items.length,
      contentByCourse,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch student course content",
    });
  }
};
