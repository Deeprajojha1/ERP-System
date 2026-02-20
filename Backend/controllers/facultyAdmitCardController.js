import AdmitCard from "../models/AdmitCard.js";
import Exam from "../models/Exam.js";
import Faculty from "../models/Faculty.js";

const getCurrentFaculty = async (userId) => {
  return Faculty.findOne({ user: userId, isDeleted: { $ne: true } });
};

/* ================= GET ISSUED ADMIT CARDS FOR MY INVIGILATION EXAMS ================= */
export const getInvigilatorAdmitCards = async (req, res) => {
  try {
    const { examId, search } = req.query;
    const query = {
      issueStatus: "ISSUED",
      isDeleted: { $ne: true },
    };

    if (req.role === "admin") {
      if (examId) {
        query.exam = examId;
      }
    } else {
      const faculty = await getCurrentFaculty(req.userId);
      if (!faculty) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }

      const examQuery = { invigilators: faculty._id, isDeleted: { $ne: true } };
      if (examId) {
        examQuery._id = examId;
      }

      const assignedExams = await Exam.find(examQuery).select("_id");
      const examIds = assignedExams.map((exam) => exam._id);

      if (!examIds.length) {
        return res.json({
          message: "Admit cards fetched successfully",
          count: 0,
          admitCards: [],
        });
      }

      query.exam = { $in: examIds };
    }

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
      .sort({ issuedAt: -1, createdAt: -1 })
      .populate({
        path: "exam",
        select: "examName session examDate startTime endTime roomNo block invigilators",
      })
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "registration",
        select: "candidateName rollNo enrollmentNumber registrationStatus",
      })
      .populate({
        path: "invigilatorVerification.verifiedByFaculty",
        select: "employeeId designation user",
        populate: { path: "user", select: "name email" },
      });

    return res.json({
      message: "Admit cards fetched successfully",
      count: cards.length,
      admitCards: cards,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= VERIFY STUDENT ENTRY USING ADMIT CARD ================= */
export const verifyStudentAdmitCardAtHall = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark = "" } = req.body || {};
    let faculty = null;
    if (req.role !== "admin") {
      faculty = await getCurrentFaculty(req.userId);
      if (!faculty) {
        return res.status(404).json({ message: "Faculty profile not found" });
      }
    }

    const card = await AdmitCard.findOne({
      _id: id,
      issueStatus: "ISSUED",
      isDeleted: { $ne: true },
    }).populate("exam", "invigilators examName session examDate startTime endTime");

    if (!card) {
      return res.status(404).json({ message: "Issued admit card not found" });
    }

    if (req.role !== "admin") {
      const isAssignedInvigilator = Array.isArray(card.exam?.invigilators)
        && card.exam.invigilators.some(
          (invigilatorId) => String(invigilatorId) === String(faculty._id)
        );

      if (!isAssignedInvigilator) {
        return res.status(403).json({
          message: "Access denied. You are not assigned as invigilator for this exam.",
        });
      }
    }

    card.invigilatorVerification = {
      status: "VERIFIED",
      verifiedByFaculty: faculty?._id || null,
      verifiedByUser: req.userId,
      verifiedAt: new Date(),
      remark: String(remark).trim(),
    };

    await card.save();

    const updated = await AdmitCard.findById(card._id)
      .populate({
        path: "exam",
        select: "examName session examDate startTime endTime roomNo block",
      })
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "registration",
        select: "candidateName rollNo enrollmentNumber registrationStatus",
      })
      .populate({
        path: "invigilatorVerification.verifiedByFaculty",
        select: "employeeId designation user",
        populate: { path: "user", select: "name email" },
      })
      .populate("invigilatorVerification.verifiedByUser", "name email");

    return res.json({
      message: "Student admit card verified successfully",
      admitCard: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
