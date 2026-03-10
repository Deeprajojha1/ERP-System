import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import Enrollment from "../models/Enrollment.js";
import FacultyCourseContent from "../models/FacultyCourseContent.js";
import Submission from "../models/Submission.js";
import Group from "../models/Group.js";
import User from "../models/userModel.js";
import Course from "../models/Course.js";
import ExcelJS from "exceljs";
import { applyUniversityReportWorksheetLayout } from "../utils/universityReportLayout.js";

const normalizeText = (value = "", max = 2000) =>
  String(value || "").trim().slice(0, max);

const toPublicSubmissionUrl = (req, fileName = "") => {
  if (!fileName) return "";
  return `${req.protocol}://${req.get("host")}/uploads/assignment-submissions/${fileName}`;
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_error) {
    // Ignore cleanup failures.
  }
};

const deriveSubmissionStatus = (submission) => {
  const hasMarks =
    submission?.marks !== null &&
    submission?.marks !== undefined &&
    Number.isFinite(Number(submission?.marks));
  const hasGrade = Boolean(String(submission?.grade || "").trim());
  return hasMarks || hasGrade ? "graded" : "submitted";
};

const mapSubmissionItem = (submission, assignment = null, course = null) => {
  if (!submission) return null;
  const status = deriveSubmissionStatus(submission);

  return {
    _id: submission._id,
    id: String(submission._id || ""),
    assignmentId: String(submission.assignment || assignment?._id || ""),
    assignmentTitle: assignment?.title || "Assignment",
    course: course
      ? {
          _id: course._id,
          code: course.code || "N/A",
          courseName: course.courseName || "Course",
        }
      : null,
    student: submission?.student
      ? {
          _id: submission.student._id || submission.student,
          name: submission.student?.name || "Student",
          email: submission.student?.email || "",
        }
      : null,
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
    status,
    submittedAt: submission.createdAt || null,
    gradedAt: status === "graded" ? submission.updatedAt || null : null,
    updatedAt: submission.updatedAt || null,
  };
};

const resolveStudentCourseIds = async (userId) => {
  const student = await Student.findOne({ user: userId })
    .select("_id group")
    .populate({
      path: "group",
      select: "courseIds",
      populate: {
        path: "courseIds",
        select: "_id",
      },
    });

  if (!student) {
    return { status: 404, message: "Student profile not found" };
  }

  let courseIds = [];
  if (student.group?.courseIds?.length) {
    courseIds = student.group.courseIds
      .map((row) => String(row?._id || row || ""))
      .filter((value) => mongoose.Types.ObjectId.isValid(value));
  }

  if (courseIds.length === 0) {
    const enrollments = await Enrollment.find({
      student: student._id,
      status: "active",
    }).select("course");
    courseIds = enrollments
      .map((row) => String(row?.course || ""))
      .filter((value) => mongoose.Types.ObjectId.isValid(value));
  }

  return {
    student,
    courseIds: [...new Set(courseIds)],
  };
};

const resolveFacultyContext = async (userId) => {
  const faculty = await Faculty.findOne({ user: userId }).select("_id");
  if (!faculty) {
    return { status: 404, message: "Faculty profile not found" };
  }
  return { faculty };
};

const isFacultyAssignedToCourse = async ({ facultyId, courseId }) => {
  const assigned = await Group.exists({
    courseFaculty: {
      $elemMatch: {
        course: courseId,
        faculty: facultyId,
      },
    },
  });
  return Boolean(assigned);
};

const normalizeGrade = (value = "") =>
  String(value || "").trim().toUpperCase().slice(0, 20);

const deriveUnitKeyFromAssignment = (item = {}) => {
  const title = String(item?.title || "");
  const description = String(item?.description || "");
  const haystack = `${title} ${description}`;
  const match = haystack.match(/\bunit\s*[-: ]*\s*(\d+)\b/i);
  if (match?.[1]) return `Unit ${match[1]}`;
  return "Unassigned";
};

const normalizeUnitKey = (value = "") => String(value || "").trim().toLowerCase();

const resolveCourseStudentsForFacultyReport = async ({ userId, role, courseId, groupId }) => {
  let groups = [];
  let groupName = null;

  if (role === "faculty") {
    const facultyDoc = await Faculty.findOne({ user: userId }).select("_id");
    if (!facultyDoc) {
      return { status: 404, message: "Faculty profile not found", students: [], groupName: null };
    }
    
    const groupQuery = {
      courseFaculty: { $elemMatch: { course: courseId, faculty: facultyDoc._id } },
    };
    
    // If groupId specified, filter by that specific group
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      groupQuery._id = groupId;
    }
    
    groups = await Group.find(groupQuery)
      .select("_id name studentIds")
      .lean();
  } else {
    const groupQuery = { courseIds: courseId };
    
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      groupQuery._id = groupId;
    }
    
    groups = await Group.find(groupQuery).select("_id name studentIds").lean();
  }

  // If filtered by groupId and found exactly one group, capture its name
  if (groupId && groups.length === 1) {
    groupName = groups[0].name || null;
  }

  const groupStudentIds = [
    ...new Set(
      groups
        .flatMap((g) => (Array.isArray(g?.studentIds) ? g.studentIds : []))
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  if (groupStudentIds.length === 0) return { students: [], groupName };

  const enrollmentRows = await Enrollment.find({
    course: courseId,
    status: "active",
    student: { $in: groupStudentIds },
  })
    .select("student")
    .lean();

  const enrolledStudentIds = enrollmentRows
    .map((row) => String(row?.student || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const useIds = enrolledStudentIds.length > 0 ? enrolledStudentIds : groupStudentIds;

  const students = await Student.find({ _id: { $in: useIds } })
    .populate("user", "name email")
    .select("_id enrollmentNumber user")
    .lean();

  const mapped = students
    .map((row) => ({
      userId: String(row?.user?._id || "").trim(),
      studentId: String(row?._id || "").trim(),
      name: row?.user?.name || "Student",
      email: row?.user?.email || "",
      enrollmentNumber: row?.enrollmentNumber || "",
    }))
    .filter((row) => row.userId);

  mapped.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return { students: mapped, groupName };
};

export const markMissingAssignmentSubmission = async (req, res) => {
  try {
    const assignmentId = String(req.body?.assignmentId || "").trim();
    const studentId = String(req.body?.studentId || "").trim(); // userId

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const context = await resolveFacultyContext(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    const assignment = await FacultyCourseContent.findOne({
      _id: assignmentId,
      type: "assignments",
    })
      .select("_id title course faculty dueDate")
      .populate({ path: "course", select: "_id code courseName" })
      .lean();
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const dueDate = assignment?.dueDate ? new Date(assignment.dueDate) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: "Assignment due date is missing" });
    }
    if (Date.now() <= dueDate.getTime()) {
      return res.status(400).json({ message: "Cannot mark missing before due date" });
    }

    const assigned = await isFacultyAssignedToCourse({
      facultyId: context.faculty._id,
      courseId: assignment.course?._id || assignment.course,
    });
    const isOwnerFaculty =
      String(assignment.faculty || "") === String(context.faculty._id || "");
    if (!assigned && !isOwnerFaculty) {
      return res.status(403).json({ message: "You are not allowed to grade this assignment" });
    }

    const studentUser = await User.findById(studentId).select("_id role").lean();
    if (!studentUser || studentUser.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentProfile = await Student.findOne({ user: studentId }).select("_id").lean();
    if (!studentProfile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const groupMatch = await Group.exists({
      studentIds: studentProfile._id,
      courseFaculty: {
        $elemMatch: {
          course: assignment.course?._id || assignment.course,
          faculty: context.faculty._id,
        },
      },
    });
    if (!groupMatch && req.role !== "admin" && req.role !== "super_admin") {
      return res.status(403).json({ message: "Student is not mapped to this course" });
    }

    const existing = await Submission.findOne({
      assignment: assignmentId,
      student: studentId,
    })
      .populate({ path: "student", select: "_id name email" })
      .lean();
    if (existing) {
      return res.status(200).json({
        message: "Submission already exists",
        item: mapSubmissionItem(existing, assignment, assignment.course),
      });
    }

    const feedback = normalizeText(req.body?.feedback || "Missing submission", 2000);

    const created = await Submission.create({
      assignment: assignmentId,
      student: studentId,
      fileUrl: "",
      fileName: "",
      originalFileName: "",
      fileMime: "",
      fileSize: 0,
      fileType: "missing",
      remarks: "Missing submission",
      feedback,
    });

    const populated = await Submission.findById(created._id)
      .populate({ path: "student", select: "_id name email" })
      .lean();

    return res.status(201).json({
      message: "Missing submission moved to not graded",
      item: mapSubmissionItem(populated, assignment, assignment.course),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to mark missing submission",
    });
  }
};

export const upsertStudentAssignmentSubmission = async (req, res) => {
  try {
    if (req.role !== "student") {
      await removeUploadedFile(req.file?.path);
      return res.status(403).json({ message: "Only students can submit assignments" });
    }

    const assignmentId = String(req.body?.assignmentId || "").trim();
    const remarks = normalizeText(req.body?.remarks, 2000);

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Valid assignmentId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload your assignment file" });
    }

    const assignment = await FacultyCourseContent.findOne({
      _id: assignmentId,
      type: "assignments",
    })
      .select("_id title course faculty dueDate")
      .populate({ path: "course", select: "_id code courseName" })
      .lean();

    if (!assignment) {
      await removeUploadedFile(req.file?.path);
      return res.status(404).json({ message: "Assignment not found" });
    }

    const context = await resolveStudentCourseIds(req.userId);
    if (context?.status) {
      await removeUploadedFile(req.file?.path);
      return res.status(context.status).json({ message: context.message });
    }

    const assignmentCourseId = String(assignment?.course?._id || assignment?.course || "");
    if (!context.courseIds.includes(assignmentCourseId)) {
      await removeUploadedFile(req.file?.path);
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const dueDateValue = assignment?.dueDate ? new Date(assignment.dueDate) : null;
    const isDeadlinePassed =
      dueDateValue &&
      !Number.isNaN(dueDateValue.getTime()) &&
      dueDateValue.getTime() < Date.now();
    if (isDeadlinePassed) {
      await removeUploadedFile(req.file?.path);
      return res.status(400).json({ message: "Assignment deadline has passed. Submission is closed." });
    }

    const existing = await Submission.findOne({
      assignment: assignment._id,
      student: req.userId,
    });

    if (existing) {
      const alreadyGraded = deriveSubmissionStatus(existing) === "graded";
      if (alreadyGraded) {
        await removeUploadedFile(req.file?.path);
        return res.status(400).json({ message: "This assignment is already graded and cannot be resubmitted" });
      }

      const oldFileName = existing.fileName || "";
      existing.fileUrl = toPublicSubmissionUrl(req, req.file.filename);
      existing.fileName = req.file.filename;
      existing.originalFileName = req.file.originalname || "";
      existing.fileMime = req.file.mimetype || "";
      existing.fileSize = req.file.size || 0;
      existing.fileType = req.file.mimetype || "";
      existing.remarks = remarks;
      await existing.save();

      if (oldFileName && oldFileName !== req.file.filename) {
        const oldFilePath = path.join(path.dirname(req.file.path), oldFileName);
        await removeUploadedFile(oldFilePath);
      }

      return res.status(200).json({
        message: "Assignment resubmitted successfully",
        item: mapSubmissionItem(existing.toObject(), assignment, assignment.course),
      });
    }

    const created = await Submission.create({
      assignment: assignment._id,
      student: req.userId,
      fileUrl: toPublicSubmissionUrl(req, req.file.filename),
      fileName: req.file.filename,
      originalFileName: req.file.originalname || "",
      fileMime: req.file.mimetype || "",
      fileSize: req.file.size || 0,
      fileType: req.file.mimetype || "",
      remarks,
    });

    return res.status(201).json({
      message: "Assignment submitted successfully",
      item: mapSubmissionItem(created.toObject(), assignment, assignment.course),
    });
  } catch (error) {
    await removeUploadedFile(req.file?.path);
    return res.status(500).json({
      message: error.message || "Failed to submit assignment",
    });
  }
};

export const getFacultyAssignmentSubmissions = async (req, res) => {
  try {
    const courseId = String(req.query?.courseId || "").trim();
    const assignmentId = String(req.query?.assignmentId || "").trim();
    const statusFilter = String(req.query?.status || "").trim().toLowerCase();

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Valid courseId is required" });
    }

    if (assignmentId && !mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignmentId" });
    }

    if (statusFilter && statusFilter !== "submitted" && statusFilter !== "graded") {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    const context = await resolveFacultyContext(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    const assignmentQuery = {
      course: courseId,
      faculty: context.faculty._id,
      type: "assignments",
    };
    if (assignmentId) {
      assignmentQuery._id = assignmentId;
    }

    const assignments = await FacultyCourseContent.find(assignmentQuery)
      .select("_id title course")
      .populate({ path: "course", select: "_id code courseName" })
      .lean();
    if (assignments.length === 0) {
      return res.status(200).json({
        message: "Assignment submissions fetched successfully",
        count: 0,
        items: [],
      });
    }

    const assignmentIdList = assignments.map((row) => row._id);
    const assignmentMap = new Map(
      assignments.map((row) => [String(row._id), row])
    );

    const submissions = await Submission.find({
      assignment: { $in: assignmentIdList },
    })
      .populate({ path: "student", select: "_id name email" })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const items = submissions
      .map((row) => {
        const assignmentRow = assignmentMap.get(String(row.assignment || ""));
        return mapSubmissionItem(row, assignmentRow, assignmentRow?.course);
      })
      .filter(Boolean)
      .filter((row) => {
        if (!statusFilter) return true;
        return row.status === statusFilter;
      });

    return res.status(200).json({
      message: "Assignment submissions fetched successfully",
      count: items.length,
      items,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to fetch assignment submissions",
    });
  }
};

export const gradeAssignmentSubmission = async (req, res) => {
  try {
    const submissionId = String(req.params?.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: "Invalid submission id" });
    }

    const marksRaw = req.body?.marks;
    const gradeRaw = req.body?.grade;
    const feedback = normalizeText(req.body?.feedback, 2000);

    const hasMarksValue =
      marksRaw !== undefined &&
      marksRaw !== null &&
      String(marksRaw).trim() !== "";
    const marksValue = hasMarksValue ? Number(marksRaw) : null;
    if (!hasMarksValue) {
      return res.status(400).json({ message: "Marks are required while grading" });
    }
    if (hasMarksValue && (!Number.isFinite(marksValue) || marksValue < 0)) {
      return res.status(400).json({ message: "Marks must be a valid non-negative number" });
    }

    const gradeValue = normalizeGrade(gradeRaw);
    if (!gradeValue && !feedback) {
      return res.status(400).json({ message: "Provide at least grade or feedback with marks" });
    }

    const context = await resolveFacultyContext(req.userId);
    if (context?.status) {
      return res.status(context.status).json({ message: context.message });
    }

    const submission = await Submission.findById(submissionId).lean();
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (deriveSubmissionStatus(submission) === "graded") {
      return res.status(400).json({
        message: "This submission is already graded and cannot be changed",
      });
    }

    const assignment = await FacultyCourseContent.findOne({
      _id: submission.assignment,
      type: "assignments",
    })
      .select("_id title course faculty")
      .populate({ path: "course", select: "_id code courseName" })
      .lean();
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found for this submission" });
    }

    const assigned = await isFacultyAssignedToCourse({
      facultyId: context.faculty._id,
      courseId: assignment.course?._id || assignment.course,
    });
    const isOwnerFaculty =
      String(assignment.faculty || "") === String(context.faculty._id || "");
    if (!assigned && !isOwnerFaculty) {
      return res.status(403).json({ message: "You are not allowed to grade this submission" });
    }

    const update = {
      feedback,
    };
    if (hasMarksValue) update.marks = marksValue;
    if (gradeRaw !== undefined) update.grade = gradeValue;

    const updated = await Submission.findByIdAndUpdate(submissionId, update, {
      new: true,
      runValidators: true,
    })
      .populate({ path: "student", select: "_id name email" })
      .lean();

    return res.status(200).json({
      message: "Submission graded successfully",
      item: mapSubmissionItem(updated, assignment, assignment.course),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to grade submission",
    });
  }
};

export const downloadUnitAwardSheet = async (req, res) => {
  try {
    const courseId = String(req.query?.courseId || "").trim();
    const unit = String(req.query?.unit || "").trim();
    const studentIdFilter = String(req.query?.studentId || "").trim();
    const statusFilter = String(req.query?.status || "").trim().toLowerCase();
    const groupId = String(req.query?.groupId || "").trim();

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Valid courseId is required" });
    }
    if (!unit || normalizeUnitKey(unit) === "all") {
      return res.status(400).json({ message: "Specific unit selection is required" });
    }
    if (
      statusFilter &&
      !["graded", "submitted", "missing", "pending", "all"].includes(statusFilter)
    ) {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    let assignmentQuery = {
      course: courseId,
      type: "assignments",
    };
    if (req.role === "faculty") {
      const context = await resolveFacultyContext(req.userId);
      if (context?.status) {
        return res.status(context.status).json({ message: context.message });
      }
      assignmentQuery = { ...assignmentQuery, faculty: context.faculty._id };
    }

    const assignments = await FacultyCourseContent.find(assignmentQuery)
      .select("_id title description dueDate course")
      .populate({ path: "course", select: "_id code courseName semester department", populate: { path: "department", select: "name" } })
      .lean();

    const targetAssignments = assignments.filter(
      (assignment) => normalizeUnitKey(deriveUnitKeyFromAssignment(assignment)) === normalizeUnitKey(unit)
    );

    if (targetAssignments.length === 0) {
      return res.status(404).json({ message: "No assignments found for selected unit" });
    }

    const assignmentIds = targetAssignments.map((item) => item._id);
    const assignmentDueMap = new Map(
      targetAssignments.map((item) => [String(item._id), item?.dueDate || null])
    );

    const submissions = await Submission.find({
      assignment: { $in: assignmentIds },
    })
      .populate({ path: "student", select: "_id name email" })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const { status, message, students, groupName } = await resolveCourseStudentsForFacultyReport({
      userId: req.userId,
      role: req.role,
      courseId,
      groupId: groupId || undefined,
    });
    if (status) {
      return res.status(status).json({ message });
    }

    let scopedStudents = students;
    if (studentIdFilter) {
      scopedStudents = students.filter((student) => student.userId === studentIdFilter);
    }

    const submissionsByStudent = new Map();
    submissions.forEach((submission) => {
      const userId = String(submission?.student?._id || submission?.student || "").trim();
      if (!userId) return;
      const current = submissionsByStudent.get(userId) || [];
      current.push(submission);
      submissionsByStudent.set(userId, current);
    });

    const now = Date.now();
    const rows = scopedStudents
      .map((student) => {
        const studentSubmissions = submissionsByStudent.get(student.userId) || [];
        const gradedSubmission = studentSubmissions.find(
          (item) => deriveSubmissionStatus(item) === "graded"
        );
        const submittedSubmission = studentSubmissions.find(
          (item) => deriveSubmissionStatus(item) === "submitted"
        );

        const hasPastDueWithoutSubmission = targetAssignments.some((assignment) => {
          const assignmentId = String(assignment?._id || "");
          const dueRaw = assignmentDueMap.get(assignmentId);
          const dueDate = dueRaw ? new Date(dueRaw) : null;
          if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
          if (dueDate.getTime() >= now) return false;
          return !studentSubmissions.some(
            (submission) => String(submission?.assignment || "") === assignmentId
          );
        });

        let statusValue = "Pending";
        let marksValue = "";
        let gradeValue = "";

        if (gradedSubmission) {
          statusValue = "Graded";
          marksValue =
            gradedSubmission?.marks !== null && gradedSubmission?.marks !== undefined
              ? Number(gradedSubmission.marks)
              : 0;
          const rawGrade = String(gradedSubmission?.grade || "").trim();
          gradeValue =
            rawGrade && !["na", "n/a", "none", "-", "null", "undefined"].includes(rawGrade.toLowerCase())
              ? rawGrade
              : "F";
        } else if (submittedSubmission) {
          statusValue = "Submitted";
          marksValue = "";
          gradeValue = "";
        } else if (hasPastDueWithoutSubmission) {
          statusValue = "Missing";
          marksValue = 0;
          gradeValue = "NA";
        }

        return {
          student,
          statusValue,
          marksValue,
          gradeValue,
        };
      })
      .filter((row) => {
        if (!statusFilter || statusFilter === "all") return true;
        return String(row.statusValue || "").toLowerCase() === statusFilter;
      });

    const courseDoc =
      targetAssignments[0]?.course?._id
        ? targetAssignments[0].course
        : await Course.findById(courseId)
            .select("code courseName semester department")
            .populate("department", "name")
            .lean();
    const facultyUser = await User.findById(req.userId).select("name").lean();
    const departmentName = courseDoc?.department?.name
      ? `Department of ${courseDoc.department.name}`
      : "Department - N/A";
    const courseLine = `Course - ${courseDoc?.courseName || courseDoc?.code || "N/A"}${
      courseDoc?.semester ? ` / Semester ${courseDoc.semester}` : ""
    }`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Award Sheet");

    const examLabel = `${courseDoc?.courseName || "N/A"}${
      courseDoc?.semester ? ` - sem ${courseDoc.semester}` : ""
    }`;
    const tableHeaders = [
      "S. No",
      "University Roll no.",
      "Student Name",
      "Marks in figure",
      "Grade",
    ];
    const tableRows = rows.map((row, index) => [
      index + 1,
      row.student?.enrollmentNumber || "",
      row.student?.name || "",
      row.marksValue,
      row.gradeValue,
    ]);

    applyUniversityReportWorksheetLayout({
      worksheet,
      reportTitle: `${unit} Award Sheet`,
      details: [
        {
          label: "Subject Name with Code",
          value: `${courseDoc?.code || "N/A"} ${courseDoc?.courseName || ""}`.trim(),
        },
        { label: "Faculty Name", value: facultyUser?.name || "Faculty" },
        { label: "Exam", value: examLabel },
        { label: "Total Marks", value: "N/A" },
      ],
      headers: tableHeaders,
      rows: tableRows,
      columnWidths: [8, 24, 36, 16, 14],
      header: {
        departmentName,
        courseLine,
      },
    });

    const unitSlug = normalizeUnitKey(unit).replace(/[^a-z0-9]+/g, "-");
    const groupSlug = groupName ? `-${groupName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` : "";
    const fileName = `${String(courseDoc?.code || "course").toLowerCase()}-${unitSlug || "unit"}${groupSlug}-award-sheet.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Failed to generate unit award sheet",
    });
  }
};

