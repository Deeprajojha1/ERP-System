import mongoose from "mongoose";
import ExamRegistration from "../models/ExamRegistration.js";
import Student from "../models/Student.js";
import Group from "../models/Group.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import { uploadImageToCloudinary } from "../config/cloudinaryUpload.js";

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeGender = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (normalized === "MALE") return "MALE";
  if (normalized === "FEMALE") return "FEMALE";
  if (normalized === "TRANSGENDER") return "TRANSGENDER";
  if (normalized === "OTHER") return "OTHER";
  return "";
};

const resolveSubjectsFromGroupAndSemester = async ({ student, semesterValue }) => {
  const targetSemester = toNumberOrNull(semesterValue) ?? student?.semester ?? null;
  const toSubjectRows = (courses = []) =>
    courses
      .filter((course) => {
        if (!course?._id) return false;
        if (!String(course?.code || "").trim() || !String(course?.courseName || "").trim()) return false;
        if (targetSemester && Number(course?.semester) !== Number(targetSemester)) return false;
        return true;
      })
      .map((course) => ({
        course: course?._id || null,
        subjectCode: String(course?.code || "").trim(),
        subjectName: String(course?.courseName || "").trim(),
      }));

  // 1) Enrollment mapped courses (most specific for the student)
  const enrollmentRows = await Enrollment.find({
    student: student?._id,
    status: { $in: ["active", "completed"] },
  })
    .populate("course", "code courseName semester branch")
    .lean();
  const enrollmentCourses = enrollmentRows.map((row) => row?.course).filter(Boolean);
  const enrollmentSubjects = toSubjectRows(enrollmentCourses);
  if (enrollmentSubjects.length) {
    return {
      subjects: enrollmentSubjects,
      primaryCourse: enrollmentCourses[0] || null,
    };
  }

  // 2) Group mapped courses
  if (student?.group?._id) {
    const group = await Group.findById(student.group._id)
      .populate("courseIds", "code courseName semester branch")
      .lean();
    const groupCourses = Array.isArray(group?.courseIds) ? group.courseIds : [];
    const groupSubjects = toSubjectRows(groupCourses);
    if (groupSubjects.length) {
      return {
        subjects: groupSubjects,
        primaryCourse: groupCourses[0] || null,
      };
    }
  }

  // 3) Department + semester fallback (least specific)
  if (student?.department && targetSemester) {
    const courses = await Course.find({
      department: student.department,
      semester: Number(targetSemester),
      isDeleted: { $ne: true },
    })
      .select("code courseName semester branch")
      .lean();
    const fallbackSubjects = toSubjectRows(courses);
    if (fallbackSubjects.length) {
      return {
        subjects: fallbackSubjects,
        primaryCourse: courses[0] || null,
      };
    }
  }

  return { subjects: [], primaryCourse: null };
};

const buildRegistrationPayload = ({ body, student, resolvedSubjects = [], resolvedCourse = null }) => {
  const semester = toNumberOrNull(body.semester) ?? student.semester ?? (resolvedCourse?.semester ?? null);

  return {
    student: student._id,
    registrationStatus: body.registrationStatus || "SUBMITTED",
    rejectionReason: String(body.rejectionReason || "").trim(),

    candidateName: String(body.candidateName || student.user?.name || "").trim(),
    studentNameHindi: String(body.studentNameHindi || "").trim(),
    rollNo: String(body.rollNo || student.enrollmentNumber || "").trim(),
    enrollmentNumber: String(body.enrollmentNumber || student.enrollmentNumber || "").trim(),
    formSerialNumber: String(body.formSerialNumber || "").trim(),
    fatherName: String(body.fatherName || student.fatherName || "").trim(),
    motherName: String(body.motherName || "").trim(),
    studentEmail: String(body.studentEmail || student.user?.email || student.collegeEmail || "").trim().toLowerCase(),
    mobileNumber: String(body.mobileNumber || student.user?.phoneNumber || "").trim(),
    gender: normalizeGender(body.gender || student.user?.gender || ""),
    dateOfBirth: toDateOrNull(body.dateOfBirth || student.user?.DOB),
    fatherPhoneNumber: String(body.fatherPhoneNumber || student.fatherPhoneNumber || "").trim(),
    motherPhoneNumber: String(body.motherPhoneNumber || "").trim(),
    fatherOccupation: String(body.fatherOccupation || "").trim(),
    motherOccupation: String(body.motherOccupation || "").trim(),

    aadharNumber: String(body.aadharNumber || student.user?.aadharNumber || "").trim(),
    academicBankCreditId: String(body.academicBankCreditId || "").trim(),
    apaarId: String(body.apaarId || "").trim(),
    digilockerId: String(body.digilockerId || "").trim(),
    addressLine: String(body.addressLine || "").trim(),
    district: String(body.district || "").trim(),
    pinCode: String(body.pinCode || "").trim(),

    tenthMarksPercent: toNumberOrNull(body.tenthMarksPercent),
    twelfthMarksPercent: toNumberOrNull(body.twelfthMarksPercent),

    courseName: String(body.courseName || resolvedCourse?.courseName || "").trim(),
    branchName: String(body.branchName || resolvedCourse?.branch || student?.program || "").trim(),
    batchLabel: String(body.batchLabel || student.academicYear || "").trim(),
    academicSession: String(body.academicSession || "").trim(),
    year: toNumberOrNull(body.year) ?? (semester ? Math.ceil(semester / 2) : null),
    semester,
    groupName: String(body.groupName || student.group?.name || "").trim(),
    examinationCentre: String(body.examinationCentre || "").trim(),
    photoUrl: String(body.photoUrl || "").trim(),
    thumbImpressionUrl: String(body.thumbImpressionUrl || "").trim(),
    studentSignatureUrl: String(body.studentSignatureUrl || "").trim(),
    declarationAccepted: Boolean(body.declarationAccepted),
    declarationAcceptedAt: body.declarationAccepted
      ? toDateOrNull(body.declarationAcceptedAt) || new Date()
      : null,

    subjects: Array.isArray(body.subjects) && body.subjects.length
      ? body.subjects
          .map((item) => ({
            course: item?.course || null,
            subjectCode: String(item?.subjectCode || "").trim(),
            subjectName: String(item?.subjectName || "").trim(),
          }))
          .filter((item) => item.subjectCode && item.subjectName)
      : resolvedSubjects,
  };
};

const getCurrentStudent = async (userId) => {
  return Student.findOne({ user: userId, isDeleted: { $ne: true } })
    .populate("user", "name email aadharNumber phoneNumber gender DOB")
    .populate("group", "name");
};

/* ================= UPLOAD EXAM REGISTRATION IMAGE ================= */
export const uploadExamRegistrationImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const fieldType = String(req.body.fieldType || "photo").trim();
    const allowedFields = ["photo", "signature", "thumbImpression"];
    if (!allowedFields.includes(fieldType)) {
      return res.status(400).json({ success: false, message: "Invalid field type" });
    }

    const mime = req.file.mimetype;
    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;

    const timestamp = Date.now();
    const publicId = `exam_reg_${fieldType}_${userId}_${timestamp}`;

    const result = await uploadImageToCloudinary({
      file: dataUri,
      folder: "hu-erp/exam-registration",
      publicId,
    });

    const imageUrl = result?.secure_url || result?.url || result;

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("uploadExamRegistrationImage error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
};

/* ================= APPLY EXAM REGISTRATION ================= */
export const applyExamRegistration = async (req, res) => {
  try {
    const payload = req.body || {};

    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    const resolved = await resolveSubjectsFromGroupAndSemester({
      student,
      semesterValue: payload.semester,
    });

    const registrationPayload = buildRegistrationPayload({
      body: payload,
      student,
      resolvedSubjects: resolved.subjects,
      resolvedCourse: resolved.primaryCourse,
    });

    if (
      !registrationPayload.candidateName ||
      !registrationPayload.rollNo ||
      !registrationPayload.enrollmentNumber ||
      !registrationPayload.fatherName
    ) {
      return res.status(400).json({
        message: "candidateName, rollNo, enrollmentNumber and fatherName are required",
      });
    }

    let registration = await ExamRegistration.create({
      ...registrationPayload,
      registrationStatus: "SUBMITTED",
      verifiedBy: null,
      verifiedAt: null,
    });
    registration = await ExamRegistration.findById(registration._id).populate(
      "student",
      "enrollmentNumber semester academicYear"
    );

    return res.status(201).json({
      message: "Exam registration submitted successfully",
      registration,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= GET MY REGISTRATIONS ================= */
export const getMyExamRegistrations = async (req, res) => {
  try {
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const registrations = await ExamRegistration.find({
      student: student._id,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate("verifiedBy", "name email");

    return res.json({
      message: "Exam registrations fetched successfully",
      count: registrations.length,
      registrations,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= GET MY REGISTRATION BY ID ================= */
export const getMyExamRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const registration = await ExamRegistration.findOne({
      _id: id,
      student: student._id,
      isDeleted: { $ne: true },
    })
      .populate("verifiedBy", "name email");

    if (!registration) {
      return res.status(404).json({ message: "Exam registration not found" });
    }

    return res.json({
      message: "Exam registration fetched successfully",
      registration,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE MY REGISTRATION ================= */
export const updateMyExamRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const existing = await ExamRegistration.findOne({
      _id: id,
      student: student._id,
      isDeleted: { $ne: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Exam registration not found" });
    }

    if (existing.registrationStatus === "VERIFIED") {
      return res.status(400).json({
        message: "Registration is already verified and cannot be edited by student",
      });
    }

    const payload = req.body || {};
    const resolved = await resolveSubjectsFromGroupAndSemester({
      student,
      semesterValue: payload.semester ?? existing.semester,
    });
    const merged = {
      ...existing.toObject(),
      ...payload,
    };

    const updatePayload = buildRegistrationPayload({
      body: merged,
      student,
      resolvedSubjects: resolved.subjects,
      resolvedCourse: resolved.primaryCourse,
    });

    const updated = await ExamRegistration.findByIdAndUpdate(
      id,
      {
        ...updatePayload,
        registrationStatus: "SUBMITTED",
        verifiedBy: null,
        verifiedAt: null,
      },
      { new: true, runValidators: true }
    ).populate("verifiedBy", "name email");

    return res.json({
      message: "Exam registration updated successfully",
      registration: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

