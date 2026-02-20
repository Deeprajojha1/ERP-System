import mongoose from "mongoose";
import Result from "../models/Result.js";
import Student from "../models/Student.js";

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const round2 = (value) => Number(toNumber(value, 0).toFixed(2));

const getSubjectKey = (subject = {}) => {
  const course = subject?.course ? String(subject.course) : "";
  const code = String(subject?.subjectCode || "").trim();
  const name = String(subject?.subjectName || "").trim();
  return `${course}::${code}::${name}`;
};

const compareAttempts = (a, b) => {
  const aAttempt = toNumber(a?.attemptNo, 1);
  const bAttempt = toNumber(b?.attemptNo, 1);

  if (aAttempt !== bAttempt) return aAttempt - bAttempt;

  const aDate = new Date(a?.resultDate || 0).getTime();
  const bDate = new Date(b?.resultDate || 0).getTime();
  return aDate - bDate;
};

const computeSemesterSummary = (subjects = [], semester) => {
  const totalCredits = round2(
    subjects.reduce((sum, item) => sum + toNumber(item?.credits, 0), 0)
  );

  const earnedCredits = round2(
    subjects.reduce(
      (sum, item) =>
        item?.status === "PASS" ? sum + toNumber(item?.credits, 0) : sum,
      0
    )
  );

  const qualityPoints = subjects.reduce(
    (sum, item) => sum + toNumber(item?.gradePoint, 0) * toNumber(item?.credits, 0),
    0
  );

  const sgpa = totalCredits > 0 ? round2(qualityPoints / totalCredits) : 0;

  const grouped = new Map();
  subjects.forEach((item) => {
    const key = getSubjectKey(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  let totalBack = 0;
  let activeBack = 0;
  let clearedBack = 0;

  grouped.forEach((attempts) => {
    const sorted = [...attempts].sort(compareAttempts);
    const latest = sorted[sorted.length - 1] || {};
    const hasFailure = sorted.some(
      (attempt) => attempt?.status === "FAIL" || attempt?.status === "ABSENT"
    );

    if (!hasFailure) return;

    totalBack += 1;
    if (latest?.status === "FAIL" || latest?.status === "ABSENT") {
      activeBack += 1;
    } else {
      clearedBack += 1;
    }
  });

  return {
    semester,
    sgpa,
    totalCredits,
    earnedCredits,
    totalBack,
    activeBack,
    clearedBack,
  };
};

const computeOverallStatus = (subjects = []) => {
  const grouped = new Map();
  subjects.forEach((item) => {
    const key = getSubjectKey(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  for (const attempts of grouped.values()) {
    const latest = [...attempts].sort(compareAttempts).pop();
    if (!latest || latest.status !== "PASS") {
      return "FAIL";
    }
  }

  return "PASS";
};

const buildCumulativeForStudent = async ({ studentId, currentResultDoc, excludeResultId = null }) => {
  const query = {
    student: studentId,
    isDeleted: { $ne: true },
  };

  if (excludeResultId) {
    query._id = { $ne: excludeResultId };
  }

  const existingResults = await Result.find(query).lean();
  const allResults = [...existingResults, currentResultDoc];

  const semMap = new Map();
  let totalQualityPoints = 0;
  let totalCredits = 0;

  const subjectAttemptMap = new Map();

  allResults.forEach((result) => {
    const summary =
      result?.semesterSummary && Number.isFinite(Number(result.semesterSummary?.totalCredits))
        ? result.semesterSummary
        : computeSemesterSummary(result?.subjects || [], result?.semester);

    const credits = toNumber(summary?.totalCredits, 0);
    const sgpa = toNumber(summary?.sgpa, 0);
    const qualityPoints = sgpa * credits;

    totalCredits += credits;
    totalQualityPoints += qualityPoints;

    const semKey = `${result?.academicYear || ""}-${result?.semester || ""}`;
    semMap.set(semKey, {
      semester: result?.semester,
      academicYear: result?.academicYear || "",
      sgpa,
      totalCredits: credits,
      resultDate: result?.resultDate,
    });

    (result?.subjects || []).forEach((subject) => {
      const key = getSubjectKey(subject);
      const attempt = {
        status: subject?.status,
        attemptNo: toNumber(subject?.attemptNo, 1),
        resultDate: result?.resultDate,
      };

      if (!subjectAttemptMap.has(key)) {
        subjectAttemptMap.set(key, {
          hasFailure: false,
          latest: attempt,
        });
      }

      const entry = subjectAttemptMap.get(key);
      if (attempt.status === "FAIL" || attempt.status === "ABSENT") {
        entry.hasFailure = true;
      }

      if (compareAttempts(entry.latest, attempt) <= 0) {
        entry.latest = attempt;
      }
    });
  });

  let totalBack = 0;
  let activeBack = 0;
  let clearedBack = 0;

  subjectAttemptMap.forEach((entry) => {
    if (!entry.hasFailure) return;

    totalBack += 1;
    if (entry.latest?.status === "FAIL" || entry.latest?.status === "ABSENT") {
      activeBack += 1;
    } else {
      clearedBack += 1;
    }
  });

  const semWiseSgpa = Array.from(semMap.values())
    .sort((a, b) => {
      if (toNumber(a.semester, 0) !== toNumber(b.semester, 0)) {
        return toNumber(a.semester, 0) - toNumber(b.semester, 0);
      }
      return new Date(a.resultDate || 0).getTime() - new Date(b.resultDate || 0).getTime();
    })
    .map((item) => ({
      semester: item.semester,
      academicYear: item.academicYear,
      sgpa: round2(item.sgpa),
      totalCredits: round2(item.totalCredits),
    }));

  return {
    cgpa: totalCredits > 0 ? round2(totalQualityPoints / totalCredits) : 0,
    totalBack,
    activeBack,
    clearedBack,
    semWiseSgpa,
  };
};

/* ================= GET ALL RESULTS ================= */
export const getAllResults = async (req, res) => {
  try {
    const { student, department, semester, academicYear, publishStatus, search } = req.query;

    const query = { isDeleted: { $ne: true } };
    if (student) query.student = student;
    if (department) query.department = department;
    if (semester) query.semester = Number(semester);
    if (academicYear) query.academicYear = academicYear;
    if (publishStatus) query.publishStatus = String(publishStatus).toUpperCase();

    let studentIdsBySearch = null;
    if (search) {
      const term = String(search).trim();
      const students = await Student.find({
        enrollmentNumber: { $regex: term, $options: "i" },
        isDeleted: { $ne: true },
      }).select("_id");

      studentIdsBySearch = students.map((s) => s._id);

      if (!studentIdsBySearch.length) {
        const empty = {
          message: "Results fetched successfully",
          count: 0,
          results: [],
        };
        return res.json(empty);
      }

      query.student = { $in: studentIdsBySearch };
    }

    const results = await Result.find(query)
      .sort({ resultDate: -1, createdAt: -1 })
      .populate({ path: "student", select: "enrollmentNumber user semester", populate: { path: "user", select: "name" } })
      .populate("department", "name")
      .populate("group", "name");

    return res.json({
      message: "Results fetched successfully",
      count: results.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= GET RESULT BY ID ================= */
export const getResultById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate({ path: "student", select: "enrollmentNumber user semester", populate: { path: "user", select: "name" } })
      .populate("department", "name")
      .populate("group", "name")
      .populate("subjects.course", "code courseName credit")
      .populate("subjects.exam");

    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    return res.json({ message: "Result fetched successfully", result });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADD RESULT ================= */
export const addResult = async (req, res) => {
  try {
    const payload = req.body || {};

    const studentExists = await Student.findOne({ _id: payload.student, isDeleted: { $ne: true } });
    if (!studentExists) {
      return res.status(404).json({ message: "Student not found" });
    }

    const existing = await Result.findOne({
      student: payload.student,
      academicYear: payload.academicYear,
      semester: payload.semester,
      isDeleted: { $ne: true },
    });

    if (existing) {
      return res.status(400).json({
        message: "Result for this student, academic year and semester already exists",
      });
    }

    const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
    const semesterSummary = computeSemesterSummary(subjects, payload.semester);
    const overallStatus = computeOverallStatus(subjects);

    const currentResultDoc = {
      ...payload,
      subjects,
      semesterSummary,
      overallStatus,
      resultDate: payload.resultDate ? new Date(payload.resultDate) : new Date(),
    };

    const cumulative = await buildCumulativeForStudent({
      studentId: payload.student,
      currentResultDoc,
    });

    const created = await Result.create({
      ...currentResultDoc,
      cumulative,
    });

    const populated = await Result.findById(created._id)
      .populate({ path: "student", select: "enrollmentNumber user semester", populate: { path: "user", select: "name" } })
      .populate("department", "name")
      .populate("group", "name")
      .populate("subjects.course", "code courseName credit")
      .populate("subjects.exam");

    return res.status(201).json({
      message: "Result created successfully",
      result: populated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE RESULT ================= */
export const updateResult = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Result.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!existing) {
      return res.status(404).json({ message: "Result not found" });
    }

    const nextData = {
      student: req.body.student ?? existing.student,
      department: req.body.department ?? existing.department,
      group: req.body.group ?? existing.group,
      academicYear: req.body.academicYear ?? existing.academicYear,
      semester: req.body.semester ?? existing.semester,
      resultDate: req.body.resultDate ? new Date(req.body.resultDate) : existing.resultDate,
      publishStatus: req.body.publishStatus ?? existing.publishStatus,
      subjects: Array.isArray(req.body.subjects) ? req.body.subjects : existing.subjects,
    };

    const semesterSummary = computeSemesterSummary(nextData.subjects, nextData.semester);
    const overallStatus = computeOverallStatus(nextData.subjects);

    const cumulative = await buildCumulativeForStudent({
      studentId: nextData.student,
      currentResultDoc: {
        ...nextData,
        semesterSummary,
        overallStatus,
      },
      excludeResultId: id,
    });

    const updated = await Result.findByIdAndUpdate(
      id,
      {
        ...nextData,
        semesterSummary,
        overallStatus,
        cumulative,
      },
      { new: true, runValidators: true }
    )
      .populate({ path: "student", select: "enrollmentNumber user semester", populate: { path: "user", select: "name" } })
      .populate("department", "name")
      .populate("group", "name")
      .populate("subjects.course", "code courseName credit")
      .populate("subjects.exam");

    return res.json({ message: "Result updated successfully", result: updated });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= STUDENT RESULT SUMMARY ================= */
export const getStudentResultSummary = async (req, res) => {
  try {
    const { studentId } = req.params;

    const latestResult = await Result.findOne({
      student: studentId,
      isDeleted: { $ne: true },
    }).sort({ resultDate: -1, updatedAt: -1 });

    if (!latestResult) {
      return res.status(404).json({ message: "No result found for student" });
    }

    const cumulative = await buildCumulativeForStudent({
      studentId,
      currentResultDoc: latestResult.toObject(),
      excludeResultId: latestResult._id,
    });

    return res.json({
      message: "Student result summary fetched successfully",
      summary: {
        totalBack: cumulative.totalBack,
        activeBack: cumulative.activeBack,
        clearedBack: cumulative.clearedBack,
        semWiseSgpa: cumulative.semWiseSgpa,
        totalCgpa: cumulative.cgpa,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE RESULT ================= */
export const deleteResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    return res.json({ message: "Result deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= HARD DELETE RESULT ================= */
export const hardDeleteResult = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Result.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    return res.json({ message: "Result permanently deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
