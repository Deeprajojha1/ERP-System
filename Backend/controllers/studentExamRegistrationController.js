import mongoose from "mongoose";
import ExamRegistration from "../models/ExamRegistration.js";
import Student from "../models/Student.js";
import Exam from "../models/Exam.js";

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

const buildDefaultSubjects = (exam) => {
  if (!exam) return [];
  if (!exam.subjectCode && !exam.subjectName) return [];
  return [
    {
      course: exam.course?._id || exam.course || null,
      subjectCode: String(exam.subjectCode || "").trim(),
      subjectName: String(exam.subjectName || "").trim(),
    },
  ].filter((item) => item.subjectCode && item.subjectName);
};

const buildRegistrationPayload = ({ body, student, exam }) => {
  const semester = toNumberOrNull(body.semester) ?? student.semester ?? exam.semester ?? null;

  return {
    student: student._id,
    exam: exam._id,
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

    courseName: String(body.courseName || exam.course?.courseName || "").trim(),
    branchName: String(body.branchName || exam.course?.branch || exam.program || "").trim(),
    batchLabel: String(body.batchLabel || student.academicYear || "").trim(),
    academicSession: String(body.academicSession || exam.session || "").trim(),
    year: toNumberOrNull(body.year) ?? (semester ? Math.ceil(semester / 2) : null),
    semester,
    groupName: String(body.groupName || exam.group?.name || student.group?.name || "").trim(),
    examinationCentre: String(body.examinationCentre || exam.block || "").trim(),
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
      : buildDefaultSubjects(exam),
  };
};

const getCurrentStudent = async (userId) => {
  return Student.findOne({ user: userId, isDeleted: { $ne: true } })
    .populate("user", "name email aadharNumber phoneNumber gender DOB")
    .populate("group", "name");
};

/* ================= APPLY EXAM REGISTRATION ================= */
export const applyExamRegistration = async (req, res) => {
  try {
    const payload = req.body || {};
    const { exam: examId } = payload;

    if (!examId) {
      return res.status(400).json({ message: "exam is required" });
    }

    const [student, exam] = await Promise.all([
      getCurrentStudent(req.userId),
      Exam.findOne({ _id: examId, isDeleted: { $ne: true } })
        .populate("course", "code courseName branch")
        .populate("group", "name"),
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const registrationPayload = buildRegistrationPayload({
      body: payload,
      student,
      exam,
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
    registration = await ExamRegistration.findById(registration._id)
      .populate("exam", "examName session examDate startTime endTime block")
      .populate("student", "enrollmentNumber semester academicYear");

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
      .populate("exam", "examName session examDate startTime endTime block")
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
      .populate("exam", "examName session examDate startTime endTime block")
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
    }).populate("exam", "examName session examDate startTime endTime block course group subjectCode subjectName");

    if (!existing) {
      return res.status(404).json({ message: "Exam registration not found" });
    }

    if (existing.registrationStatus === "VERIFIED") {
      return res.status(400).json({
        message: "Registration is already verified and cannot be edited by student",
      });
    }

    const payload = req.body || {};
    const merged = {
      ...existing.toObject(),
      ...payload,
      exam: existing.exam?._id || existing.exam,
    };

    const updatePayload = buildRegistrationPayload({
      body: merged,
      student,
      exam: existing.exam,
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
    )
      .populate("exam", "examName session examDate startTime endTime block")
      .populate("verifiedBy", "name email");

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

