import AdmitCard from "../models/AdmitCard.js";
import Student from "../models/Student.js";

const getCurrentStudent = async (userId) => {
  return Student.findOne({ user: userId, isDeleted: { $ne: true } });
};

/* ================= GET MY ADMIT CARDS ================= */
export const getMyAdmitCards = async (req, res) => {
  try {
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const cards = await AdmitCard.find({
      student: student._id,
      issueStatus: "ISSUED",
      isDeleted: { $ne: true },
    })
      .sort({ issuedAt: -1, createdAt: -1 })
      .populate({
        path: "exam",
        select: "examName session examDate startTime endTime block",
      })
      .populate({
        path: "registration",
        select: "registrationStatus candidateName rollNo enrollmentNumber",
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

/* ================= GET MY ADMIT CARD BY ID ================= */
export const getMyAdmitCardById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const card = await AdmitCard.findOne({
      _id: id,
      student: student._id,
      issueStatus: "ISSUED",
      isDeleted: { $ne: true },
    })
      .populate({
        path: "exam",
        select: "examName session examDate startTime endTime block",
      })
      .populate({
        path: "registration",
        select: "registrationStatus candidateName rollNo enrollmentNumber",
      });

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

