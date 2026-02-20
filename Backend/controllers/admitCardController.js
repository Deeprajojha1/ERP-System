import mongoose from "mongoose";
import AdmitCard from "../models/AdmitCard.js";
import ExamRegistration from "../models/ExamRegistration.js";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const generateAdmitCardNo = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HU-AC-${y}${m}${d}-${rand}`;
};

const buildSnapshotFromRegistration = (registration) => ({
  candidateName: registration.candidateName || "",
  fatherName: registration.fatherName || "",
  motherName: registration.motherName || "",
  rollNo: registration.rollNo || "",
  enrollmentNumber: registration.enrollmentNumber || "",
  courseName: registration.courseName || "",
  branchName: registration.branchName || "",
  batchLabel: registration.batchLabel || "",
  year: registration.year ?? null,
  semester: registration.semester ?? null,
  groupName: registration.groupName || "",
  examinationCentre: registration.examinationCentre || "",
  examSession: registration.academicSession || registration.exam?.session || "",
  photoUrl: registration.photoUrl || "",
  subjects: Array.isArray(registration.subjects)
    ? registration.subjects.map((item) => ({
        subjectCode: String(item?.subjectCode || "").trim(),
        subjectName: String(item?.subjectName || "").trim(),
      })).filter((item) => item.subjectCode && item.subjectName)
    : [],
});

/* ================= GET ALL ADMIT CARDS ================= */
export const getAllAdmitCards = async (req, res) => {
  try {
    const { exam, student, issueStatus, search } = req.query;
    const query = { isDeleted: { $ne: true } };

    if (exam) query.exam = exam;
    if (student) query.student = student;
    if (issueStatus) query.issueStatus = String(issueStatus).toUpperCase();
    if (search) {
      const term = String(search).trim();
      query.$or = [
        { admitCardNo: { $regex: term, $options: "i" } },
        { "snapshot.candidateName": { $regex: term, $options: "i" } },
        { "snapshot.rollNo": { $regex: term, $options: "i" } },
        { "snapshot.enrollmentNumber": { $regex: term, $options: "i" } },
      ];
    }

    const cards = await AdmitCard.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "registration",
        select: "candidateName rollNo enrollmentNumber registrationStatus",
      })
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name" },
      })
      .populate("exam", "examName session examDate")
      .populate("issuedBy", "name email")
      .populate("cancelledBy", "name email");

    return res.json({
      message: "Admit cards fetched successfully",
      count: cards.length,
      admitCards: cards,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= GET ADMIT CARD BY ID ================= */
export const getAdmitCardById = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await AdmitCard.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("registration")
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name" },
      })
      .populate("exam")
      .populate("issuedBy", "name email")
      .populate("cancelledBy", "name email");

    if (!card) {
      return res.status(404).json({ message: "Admit card not found" });
    }

    return res.json({
      message: "Admit card fetched successfully",
      admitCard: card,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ISSUE ADMIT CARD ================= */
export const issueAdmitCard = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const payload = req.body || {};

    const registration = await ExamRegistration.findOne({
      _id: registrationId,
      isDeleted: { $ne: true },
    }).populate("exam", "session");

    if (!registration) {
      return res.status(404).json({ message: "Exam registration not found" });
    }

    const thresholdPercent = toNumber(
      payload.thresholdPercent,
      toNumber(registration?.feeEligibility?.thresholdPercent, 75)
    );
    const paidPercent = toNumber(
      payload.paidPercent,
      toNumber(registration?.feeEligibility?.eligiblePercent, 0)
    );
    const requestedEligibility = payload.isEligible;
    const isEligible = typeof requestedEligibility === "boolean"
      ? requestedEligibility
      : paidPercent >= thresholdPercent;

    if (!isEligible) {
      return res.status(400).json({
        message: "Student is not eligible for admit card issuance",
        eligibility: {
          thresholdPercent,
          paidPercent,
          isEligible,
        },
      });
    }

    const snapshot = buildSnapshotFromRegistration(registration);
    if (!snapshot.candidateName || !snapshot.rollNo || !snapshot.enrollmentNumber) {
      return res.status(400).json({
        message: "Registration is incomplete. Candidate name, roll no and enrollment no are required.",
      });
    }

    const existing = await AdmitCard.findOne({
      registration: registration._id,
      isDeleted: { $ne: true },
    });

    const commonUpdate = {
      issueStatus: "ISSUED",
      issuedBy: req.userId || null,
      issuedAt: new Date(),
      holdReason: "",
      eligibilitySnapshot: {
        thresholdPercent,
        paidPercent,
        isEligible: true,
        source: payload.source === "FEE_MODULE" ? "FEE_MODULE" : "MANUAL",
        checkedAt: new Date(),
      },
      snapshot,
    };

    let admitCard;
    if (existing) {
      admitCard = await AdmitCard.findByIdAndUpdate(
        existing._id,
        commonUpdate,
        { new: true, runValidators: true }
      )
        .populate("registration")
        .populate("student")
        .populate("exam")
        .populate("issuedBy", "name email");
    } else {
      admitCard = await AdmitCard.create({
        registration: registration._id,
        student: registration.student,
        exam: registration.exam,
        admitCardNo: generateAdmitCardNo(),
        ...commonUpdate,
      });
      admitCard = await AdmitCard.findById(admitCard._id)
        .populate("registration")
        .populate("student")
        .populate("exam")
        .populate("issuedBy", "name email");
    }

    return res.status(201).json({
      message: "Admit card issued successfully",
      admitCard,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= HOLD ADMIT CARD ================= */
export const holdAdmitCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { holdReason = "" } = req.body || {};

    const updated = await AdmitCard.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      {
        issueStatus: "HOLD",
        holdReason: String(holdReason).trim(),
      },
      { new: true, runValidators: true }
    )
      .populate("registration")
      .populate("student")
      .populate("exam");

    if (!updated) {
      return res.status(404).json({ message: "Admit card not found" });
    }

    return res.json({
      message: "Admit card moved to hold successfully",
      admitCard: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= CANCEL ADMIT CARD ================= */
export const cancelAdmitCard = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await AdmitCard.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      {
        issueStatus: "CANCELLED",
        cancelledBy: req.userId || null,
        cancelledAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate("registration")
      .populate("student")
      .populate("exam")
      .populate("cancelledBy", "name email");

    if (!updated) {
      return res.status(404).json({ message: "Admit card not found" });
    }

    return res.json({
      message: "Admit card cancelled successfully",
      admitCard: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE ADMIT CARD ================= */
export const deleteAdmitCard = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await AdmitCard.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ message: "Admit card not found" });
    }

    return res.json({ message: "Admit card deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

