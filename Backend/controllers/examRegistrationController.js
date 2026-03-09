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
    registrationStatus: body.registrationStatus || "DRAFT",
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

    feeEligibility: {
      isEligible: Boolean(body?.feeEligibility?.isEligible),
      eligiblePercent: toNumberOrNull(body?.feeEligibility?.eligiblePercent) ?? 0,
      thresholdPercent: toNumberOrNull(body?.feeEligibility?.thresholdPercent) ?? 75,
      eligibilityCheckedAt: body?.feeEligibility?.eligibilityCheckedAt
        ? new Date(body.feeEligibility.eligibilityCheckedAt)
        : null,
      eligibilitySource: body?.feeEligibility?.eligibilitySource || "NONE",
    },
  };
};

/* ================= GET ALL REGISTRATIONS ================= */
export const getAllExamRegistrations = async (req, res) => {
  try {
    const { exam, student, registrationStatus, search } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (exam) query.exam = exam;
    if (student) query.student = student;
    if (registrationStatus) query.registrationStatus = String(registrationStatus).toUpperCase();

    if (search) {
      const term = String(search).trim();
      query.$or = [
        { candidateName: { $regex: term, $options: "i" } },
        { rollNo: { $regex: term, $options: "i" } },
        { enrollmentNumber: { $regex: term, $options: "i" } },
      ];
    }

    const registrations = await ExamRegistration.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "student",
        select: "enrollmentNumber semester academicYear fatherName group user",
        populate: [
          { path: "user", select: "name aadharNumber phoneNumber" },
          { path: "group", select: "name" },
        ],
      })
      .populate({
        path: "exam",
        select: "examName session semester examDate block subjectCode subjectName course group",
        populate: [
          { path: "course", select: "code courseName branch" },
          { path: "group", select: "name" },
        ],
      })
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

/* ================= GET REGISTRATION BY ID ================= */
export const getExamRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;

    const registration = await ExamRegistration.findOne({
      _id: id,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "student",
        select: "enrollmentNumber semester academicYear fatherName group user",
        populate: [
          { path: "user", select: "name aadharNumber phoneNumber" },
          { path: "group", select: "name" },
        ],
      })
      .populate({
        path: "exam",
        select: "examName session semester examDate block subjectCode subjectName course group",
        populate: [
          { path: "course", select: "code courseName branch" },
          { path: "group", select: "name" },
        ],
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

/* ================= ADD REGISTRATION ================= */
export const addExamRegistration = async (req, res) => {
  try {
    const payload = req.body || {};
    const { student: studentId, exam: examId } = payload;

    if (!studentId || !examId) {
      return res.status(400).json({ message: "student and exam are required" });
    }

    const [student, exam] = await Promise.all([
      Student.findOne({ _id: studentId, isDeleted: { $ne: true } })
        .populate("user", "name email aadharNumber phoneNumber gender DOB")
        .populate("group", "name"),
      Exam.findOne({ _id: examId, isDeleted: { $ne: true } })
        .populate("course", "code courseName branch")
        .populate("group", "name"),
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const existing = await ExamRegistration.findOne({
      student: student._id,
      exam: exam._id,
      isDeleted: { $ne: true },
    });
    if (existing) {
      return res.status(400).json({ message: "Registration already exists for this student and exam" });
    }

    const createPayload = buildRegistrationPayload({ body: payload, student, exam });

    if (!createPayload.candidateName || !createPayload.rollNo || !createPayload.enrollmentNumber || !createPayload.fatherName) {
      return res.status(400).json({
        message: "candidateName, rollNo, enrollmentNumber and fatherName are required",
      });
    }

    const created = await ExamRegistration.create(createPayload);
    const registration = await ExamRegistration.findById(created._id)
      .populate("student")
      .populate("exam")
      .populate("verifiedBy", "name email");

    return res.status(201).json({
      message: "Exam registration created successfully",
      registration,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE REGISTRATION ================= */
export const updateExamRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const existing = await ExamRegistration.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!existing) {
      return res.status(404).json({ message: "Exam registration not found" });
    }

    const updateData = { ...payload };

    if (payload.registrationStatus) {
      const nextStatus = String(payload.registrationStatus).toUpperCase();
      updateData.registrationStatus = nextStatus;
      if (nextStatus === "VERIFIED") {
        updateData.verifiedBy = req.userId || null;
        updateData.verifiedAt = new Date();
        updateData.rejectionReason = "";
      }
      if (nextStatus === "REJECTED") {
        updateData.verifiedBy = null;
        updateData.verifiedAt = null;
      }
      if (nextStatus === "DRAFT" || nextStatus === "SUBMITTED") {
        updateData.verifiedBy = null;
        updateData.verifiedAt = null;
        updateData.rejectionReason = "";
      }
    }

    const updated = await ExamRegistration.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("student")
      .populate("exam")
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

/* ================= DELETE REGISTRATION ================= */
export const deleteExamRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ExamRegistration.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ message: "Exam registration not found" });
    }

    return res.json({ message: "Exam registration deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

