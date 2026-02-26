import Exam from "../models/Exam.js";
import Group from "../models/Group.js";
import Student from "../models/Student.js";
import {
  bumpNamespaceVersion,
  getOrSetVersionedJsonCache,
} from "../utils/cacheNamespace.js";

const parseStrengthInput = (strength) => {
  if (strength === undefined || strength === null || strength === "") return null;
  const value = Number(strength);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
};

const resolveStrength = async ({ group, strength }) => {
  const directStrength = parseStrengthInput(strength);
  if (directStrength !== null) return directStrength;
  if (!group) return 0;

  const studentCount = await Student.countDocuments({
    group,
    isDeleted: { $ne: true },
  });

  if (studentCount > 0) return studentCount;

  const groupDoc = await Group.findById(group).select("studentIds");
  if (!groupDoc) return 0;

  return Array.isArray(groupDoc.studentIds) ? groupDoc.studentIds.length : 0;
};

/* ================= GET ALL EXAMS ================= */
export const getAllExams = async (req, res) => {
  try {
    const {
      department,
      semester,
      course,
      group,
      status,
      examType,
      fromDate,
      toDate,
      search,
      noCache,
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (department) query.department = department;
    if (semester) query.semester = Number(semester);
    if (course) query.course = course;
    if (group) query.group = group;
    if (status) query.status = String(status).toUpperCase();
    if (examType) query.examType = String(examType).toUpperCase();

    if (fromDate || toDate) {
      query.examDate = {};
      if (fromDate) query.examDate.$gte = new Date(fromDate);
      if (toDate) query.examDate.$lte = new Date(toDate);
    }

    if (search) {
      const term = String(search).trim();
      query.$or = [
        { examName: { $regex: term, $options: "i" } },
        { subjectCode: { $regex: term, $options: "i" } },
        { subjectName: { $regex: term, $options: "i" } },
      ];
    }

    const queryForKey = {
      department: department || "",
      semester: semester || "",
      course: course || "",
      group: group || "",
      status: status || "",
      examType: examType || "",
      fromDate: fromDate || "",
      toDate: toDate || "",
      search: search || "",
    };

    const payload = await getOrSetVersionedJsonCache({
      namespace: "exams",
      baseKey: `list:${JSON.stringify(queryForKey)}`,
      noCache: noCache === "true",
      fetcher: async () => {
        const exams = await Exam.find(query)
          .sort({ examDate: 1, startTime: 1 })
          .populate("department", "name")
          .populate("course", "code courseName semester")
          .populate("group", "name")
          .populate({
            path: "invigilators",
            select: "employeeId",
            populate: { path: "user", select: "name" },
          });

        return {
          message: "Exams fetched successfully",
          count: exams.length,
          exams,
        };
      },
    });

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= GET EXAM BY ID ================= */
export const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const noCache = req.query.noCache === "true";

    const payload = await getOrSetVersionedJsonCache({
      namespace: "exams",
      baseKey: `by-id:${id}`,
      noCache,
      fetcher: async () => {
        const exam = await Exam.findOne({ _id: id, isDeleted: { $ne: true } })
          .populate("department", "name")
          .populate("course", "code courseName semester")
          .populate("group", "name")
          .populate({
            path: "invigilators",
            select: "employeeId",
            populate: { path: "user", select: "name" },
          });

        if (!exam) return null;
        return { message: "Exam fetched successfully", exam };
      },
    });

    if (!payload) {
      return res.status(404).json({ message: "Exam not found" });
    }

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADD EXAM ================= */
export const addExam = async (req, res) => {
  try {
    const payload = req.body || {};
    if (parseStrengthInput(payload.strength) === null && payload.strength !== undefined && payload.strength !== null && payload.strength !== "") {
      return res.status(400).json({ message: "Strength must be a non-negative number" });
    }
    payload.strength = await resolveStrength(payload);

    const exam = await Exam.create(payload);
    const created = await Exam.findById(exam._id)
      .populate("department", "name")
      .populate("course", "code courseName semester")
      .populate("group", "name")
      .populate({ path: "invigilators", select: "employeeId", populate: { path: "user", select: "name" } });

    await bumpNamespaceVersion("exams");
    return res.status(201).json({
      message: "Exam created successfully",
      exam: created,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE EXAM ================= */
export const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const updatePayload = req.body || {};
    if (
      Object.prototype.hasOwnProperty.call(updatePayload, "strength") &&
      parseStrengthInput(updatePayload.strength) === null &&
      updatePayload.strength !== undefined &&
      updatePayload.strength !== null &&
      updatePayload.strength !== ""
    ) {
      return res.status(400).json({ message: "Strength must be a non-negative number" });
    }

    const hasStrength = Object.prototype.hasOwnProperty.call(updatePayload, "strength");
    const hasGroup = Object.prototype.hasOwnProperty.call(updatePayload, "group");

    if (hasStrength || hasGroup) {
      updatePayload.strength = await resolveStrength(updatePayload);
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updatePayload,
      { new: true, runValidators: true }
    )
      .populate("department", "name")
      .populate("course", "code courseName semester")
      .populate("group", "name")
      .populate({ path: "invigilators", select: "employeeId", populate: { path: "user", select: "name" } });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await bumpNamespaceVersion("exams");
    return res.json({ message: "Exam updated successfully", exam });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE EXAM ================= */
export const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await bumpNamespaceVersion("exams");
    return res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= HARD DELETE EXAM ================= */
export const hardDeleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findByIdAndDelete(id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await bumpNamespaceVersion("exams");
    return res.json({ message: "Exam permanently deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
