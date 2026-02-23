import mongoose from "mongoose";
import ExamBlueprint from "../models/ExamBlueprint.js";
import ExamPaper from "../models/ExamPaper.js";
import ExamAttempt from "../models/ExamAttempt.js";
import ExamEvaluation from "../models/ExamEvaluation.js";
import Student from "../models/Student.js";
import User from "../models/userModel.js";
import Faculty from "../models/Faculty.js";
import { evaluateQuestion, generatePaperDraft } from "../services/examAiService.js";

const toObjectId = (value) => {
  if (!value) return null;
  return mongoose.Types.ObjectId.isValid(value) ? value : null;
};

const getCurrentStudent = async (userId) =>
  Student.findOne({ user: userId, isDeleted: { $ne: true } });

const resolveTeacherUserId = async (teacherId) => {
  const objectId = toObjectId(teacherId);
  if (!objectId) return null;

  const user = await User.findOne({ _id: objectId, role: "faculty" }).select("_id");
  if (user) return user._id;

  // Backward compatibility: if frontend sends Faculty._id, map to faculty.user
  const faculty = await Faculty.findById(objectId).select("user");
  if (faculty?.user) return faculty.user;

  return null;
};

const getTeacherOwnershipFilter = async (userId, role) => {
  // Admin can manage all blueprints in faculty/admin routes.
  if (role === "admin") {
    return {};
  }

  const filter = { teacherId: userId };
  const faculty = await Faculty.findOne({ user: userId }).select("_id");
  if (faculty?._id) {
    return { $or: [{ teacherId: userId }, { teacherId: faculty._id }] };
  }
  return filter;
};

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeSyllabus = (syllabus) => {
  if (!Array.isArray(syllabus)) return [];

  return syllabus
    .map((item) => {
      if (typeof item === "string") {
        return { unit: item.trim(), topics: [] };
      }

      if (item && typeof item === "object") {
        return {
          unit: String(item.unit || "").trim(),
          topics: Array.isArray(item.topics)
            ? item.topics.map((topic) => String(topic || "").trim()).filter(Boolean)
            : [],
        };
      }

      return null;
    })
    .filter((item) => item && item.unit);
};

const isWithinSchedule = ({ start, end, now }) => now >= start && now <= end;

const hasAttemptTimedOut = ({ startedAt, durationMinutes, now }) => {
  const endTime = new Date(new Date(startedAt).getTime() + Number(durationMinutes || 0) * 60000);
  return now > endTime;
};

const buildAnswerMap = (answers = []) => {
  const map = new Map();
  answers.forEach((item) => {
    if (Number.isFinite(Number(item?.questionIndex))) {
      map.set(Number(item.questionIndex), item);
    }
  });
  return map;
};

/* ================= STUDENT - LIST AVAILABLE EXAMS ================= */
export const getPublishedExamsForStudent = async (req, res) => {
  try {
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const blueprints = await ExamBlueprint.find({
      isDeleted: { $ne: true },
      status: "PUBLISHED",
    })
      .sort({ scheduleStart: 1, createdAt: -1 })
      .populate("teacherId", "name email");

    if (!blueprints.length) {
      return res.json({
        message: "Published exams fetched successfully",
        count: 0,
        exams: [],
      });
    }

    const blueprintIds = blueprints.map((item) => item._id);
    const attempts = await ExamAttempt.find({
      student: student._id,
      blueprintId: { $in: blueprintIds },
    }).sort({ createdAt: -1, attemptNumber: -1 });

    const attemptsByBlueprint = attempts.reduce((acc, item) => {
      const key = String(item.blueprintId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const now = new Date();
    const exams = blueprints.map((blueprint) => {
      const key = String(blueprint._id);
      const rows = attemptsByBlueprint[key] || [];
      const activeAttempt = rows.find((item) => item.status === "IN_PROGRESS") || null;
      const latestAttempt = rows[0] || null;
      const latestEvaluatedAttempt =
        rows.find((item) => item.status === "EVALUATED") || null;

      const withinSchedule = isWithinSchedule({
        start: blueprint.scheduleStart,
        end: blueprint.scheduleEnd,
        now,
      });

      const attemptsUsed = rows.length;
      const maxAttempts = 2;
      const canAttempt = Boolean(activeAttempt) || (withinSchedule && attemptsUsed < maxAttempts);

      return {
        _id: blueprint._id,
        title: blueprint.title,
        subject: blueprint.subject,
        examType: blueprint.examType,
        durationMinutes: blueprint.durationMinutes,
        totalMarks: blueprint.totalMarks,
        scheduleStart: blueprint.scheduleStart,
        scheduleEnd: blueprint.scheduleEnd,
        teacher: blueprint.teacherId
          ? {
              _id: blueprint.teacherId._id,
              name: blueprint.teacherId.name,
              email: blueprint.teacherId.email,
            }
          : null,
        attemptsUsed,
        maxAttempts,
        hasActiveAttempt: Boolean(activeAttempt),
        activeAttemptId: activeAttempt?._id || null,
        latestAttemptId: latestAttempt?._id || null,
        latestEvaluatedAttemptId: latestEvaluatedAttempt?._id || null,
        canAttempt,
      };
    });

    return res.json({
      message: "Published exams fetched successfully",
      count: exams.length,
      exams,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN/TEACHER - CREATE BLUEPRINT ================= */
export const createExamBlueprint = async (req, res) => {
  try {
    const payload = req.body || {};
    const examType = String(payload.examType || "").toUpperCase();
    const teacherUserId = await resolveTeacherUserId(payload.teacherId);

    if (!payload.teacherId) {
      return res.status(400).json({ message: "teacherId is required" });
    }
    if (!examType) {
      return res.status(400).json({ message: "examType is required (MID_TERM, END_TERM, UNIT_TEST)" });
    }
    if (!teacherUserId) {
      return res.status(400).json({ message: "teacherId must be a valid faculty user" });
    }

    const created = await ExamBlueprint.create({
      ...payload,
      examType,
      // Admin creates exam shell. Teacher fills units + syllabus later.
      numberOfUnits: null,
      syllabus: [],
      createdBy: req.userId,
      teacherId: teacherUserId,
      status: payload.status || "DRAFT",
    });

    return res.status(201).json({
      message: "Exam blueprint created successfully",
      blueprint: created,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN/TEACHER - GET BLUEPRINTS ================= */
export const getExamBlueprints = async (req, res) => {
  try {
    const { teacherId, status, search, examType } = req.query;
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);
    const query = { isDeleted: { $ne: true }, ...ownerFilter };

    if (teacherId) query.teacherId = teacherId;
    if (status) query.status = String(status).toUpperCase();
    if (examType) query.examType = String(examType).toUpperCase();
    if (search) {
      const term = String(search).trim();
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { subject: { $regex: term, $options: "i" } },
      ];
    }

    const blueprints = await ExamBlueprint.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email role")
      .populate("teacherId", "name email role");

    return res.json({
      message: "Exam blueprints fetched successfully",
      count: blueprints.length,
      blueprints,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN/TEACHER - GET BLUEPRINT BY ID ================= */
export const getExamBlueprintById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);
    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
      ...ownerFilter,
    })
      .populate("createdBy", "name email role")
      .populate("teacherId", "name email role");

    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found" });
    }

    return res.json({
      message: "Exam blueprint fetched successfully",
      blueprint,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN - UPDATE BLUEPRINT ================= */
export const updateExamBlueprint = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const updatePayload = { ...payload };

    if (Object.prototype.hasOwnProperty.call(updatePayload, "examType")) {
      updatePayload.examType = String(updatePayload.examType || "").toUpperCase();
    }
    // Teacher should manage syllabus data via faculty syllabus endpoint.
    delete updatePayload.syllabus;
    delete updatePayload.numberOfUnits;

    const updated = await ExamBlueprint.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updatePayload,
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email role")
      .populate("teacherId", "name email role");

    if (!updated) {
      return res.status(404).json({ message: "Exam blueprint not found" });
    }

    return res.json({
      message: "Exam blueprint updated successfully",
      blueprint: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= TEACHER - ADD/UPDATE SYLLABUS ================= */
export const upsertExamSyllabus = async (req, res) => {
  try {
    const { id } = req.params;
    const numberOfUnits = Number(req.body?.numberOfUnits);
    const syllabus = normalizeSyllabus(req.body?.syllabus);
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);

    if (!Number.isInteger(numberOfUnits) || numberOfUnits < 1) {
      return res.status(400).json({ message: "numberOfUnits must be a positive integer" });
    }
    if (!syllabus.length) {
      return res.status(400).json({ message: "syllabus is required and must contain at least one unit" });
    }
    if (syllabus.length > numberOfUnits) {
      return res.status(400).json({ message: "syllabus units cannot exceed numberOfUnits" });
    }

    const updated = await ExamBlueprint.findOneAndUpdate(
      {
        _id: id,
        isDeleted: { $ne: true },
        ...ownerFilter,
      },
      { numberOfUnits, syllabus },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Exam blueprint not found for teacher" });
    }

    return res.json({
      message: "Syllabus updated successfully",
      blueprint: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= TEACHER - GENERATE PAPER VIA AI ================= */
export const generateExamPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);

    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
      ...ownerFilter,
    });

    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found for teacher" });
    }

    const latestPaper = await ExamPaper.findOne({ blueprintId: blueprint._id }).sort({ version: -1 });
    const version = latestPaper ? Number(latestPaper.version || 1) + 1 : 1;

    const questions = await generatePaperDraft({ blueprint });
    if (!questions.length) {
      return res.status(400).json({ message: "Unable to generate paper. Add valid section configuration." });
    }

    const paper = await ExamPaper.create({
      blueprintId: blueprint._id,
      generatedBy: "AI",
      reviewedByTeacher: false,
      questions,
      version,
    });

    return res.status(201).json({
      message: "Question paper generated successfully",
      paper,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= TEACHER - GET LATEST PAPER ================= */
export const getExamPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);
    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
      ...ownerFilter,
    });

    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found for teacher" });
    }

    const paper = await ExamPaper.findOne({ blueprintId: id }).sort({ version: -1 });
    if (!paper) {
      return res.status(404).json({ message: "Question paper not found" });
    }

    return res.json({
      message: "Question paper fetched successfully",
      paper,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= TEACHER - REVIEW PAPER ================= */
export const reviewExamPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { questions } = req.body || {};
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);

    const paper = await ExamPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Question paper not found" });
    }

    const blueprint = await ExamBlueprint.findOne({
      _id: paper.blueprintId,
      isDeleted: { $ne: true },
      ...ownerFilter,
    });

    if (!blueprint) {
      return res.status(403).json({ message: "You cannot review this paper" });
    }

    const updated = await ExamPaper.findByIdAndUpdate(
      paperId,
      {
        questions: Array.isArray(questions) && questions.length ? questions : paper.questions,
        reviewedByTeacher: true,
      },
      { new: true, runValidators: true }
    );

    return res.json({
      message: "Question paper reviewed successfully",
      paper: updated,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN - PUBLISH BLUEPRINT ================= */
export const publishExamBlueprint = async (req, res) => {
  try {
    const { id } = req.params;
    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found" });
    }

    const paper = await ExamPaper.findOne({ blueprintId: id }).sort({ version: -1 });
    if (!paper) {
      return res.status(400).json({ message: "Generate question paper before publishing" });
    }

    if (!paper.reviewedByTeacher) {
      return res.status(400).json({ message: "Teacher must review paper before publishing" });
    }

    blueprint.status = "PUBLISHED";
    await blueprint.save();

    return res.json({
      message: "Exam published successfully",
      blueprint,
      paperId: paper._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN - CLOSE BLUEPRINT ================= */
export const closeExamBlueprint = async (req, res) => {
  try {
    const { id } = req.params;
    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found" });
    }

    blueprint.status = "CLOSED";
    await blueprint.save();

    return res.json({
      message: "Exam blueprint closed successfully",
      blueprint,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= ADMIN - SOFT DELETE BLUEPRINT ================= */
export const deleteExamBlueprint = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ExamBlueprint.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true, status: "CLOSED" },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ message: "Exam blueprint not found" });
    }

    return res.json({
      message: "Exam blueprint deleted successfully",
      blueprint: deleted,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= TEACHER - STUDENT SCORES ================= */
export const getExamStudentScores = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;
    const ownerFilter = await getTeacherOwnershipFilter(req.userId, req.role);

    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
      ...ownerFilter,
    });

    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found for teacher" });
    }

    const attemptQuery = { blueprintId: id };
    if (studentId) {
      const mappedStudentId = toObjectId(studentId);
      if (!mappedStudentId) {
        return res.status(400).json({ message: "Invalid studentId" });
      }
      attemptQuery.student = mappedStudentId;
    }

    const attempts = await ExamAttempt.find(attemptQuery)
      .sort({ createdAt: -1 })
      .populate({
        path: "student",
        select: "enrollmentNumber user",
        populate: { path: "user", select: "name email" },
      });

    const attemptIds = attempts.map((item) => item._id);
    const evaluations = await ExamEvaluation.find({ attemptId: { $in: attemptIds } });
    const evalMap = new Map(evaluations.map((item) => [String(item.attemptId), item]));

    const scoreRows = attempts.map((attempt) => {
      const score = evalMap.get(String(attempt._id));
      return {
        attemptId: attempt._id,
        attemptNumber: attempt.attemptNumber || 1,
        student: attempt.student,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalAwarded: score?.totalAwarded ?? null,
        totalMax: score?.totalMax ?? null,
        perQuestion: score?.perQuestion ?? [],
      };
    });

    return res.json({
      message: "Exam student scores fetched successfully",
      count: scoreRows.length,
      scores: scoreRows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= STUDENT - START ATTEMPT ================= */
export const startExamAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const maxAttempts = 2;
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const blueprint = await ExamBlueprint.findOne({
      _id: id,
      isDeleted: { $ne: true },
      status: "PUBLISHED",
    });
    if (!blueprint) {
      return res.status(404).json({ message: "Published exam not found" });
    }

    const now = new Date();
    if (!isWithinSchedule({ start: blueprint.scheduleStart, end: blueprint.scheduleEnd, now })) {
      return res.status(400).json({ message: "Exam can only be attempted during scheduled window" });
    }

    const paper = await ExamPaper.findOne({ blueprintId: id }).sort({ version: -1 });
    if (!paper) {
      return res.status(400).json({ message: "Question paper is not available" });
    }

    const attempts = await ExamAttempt.find({ blueprintId: id, student: student._id })
      .sort({ attemptNumber: -1, createdAt: -1 });
    const activeAttempt = attempts.find((item) => item.status === "IN_PROGRESS");
    if (activeAttempt) {
      const activePaper = await ExamPaper.findById(activeAttempt.paperId);
      return res.json({
        message: "Exam attempt already in progress",
        attempt: activeAttempt,
        paper: activePaper
          ? {
              _id: activePaper._id,
              version: activePaper.version,
              questions: activePaper.questions.map((q, idx) => ({
                questionIndex: idx,
                sectionType: q.sectionType,
                questionText: q.questionText,
                options: q.options || [],
                marks: q.marks,
              })),
            }
          : null,
      });
    }
    if (attempts.length >= maxAttempts) {
      return res.status(400).json({ message: "Maximum 2 attempts allowed for this exam" });
    }
    const attemptNumber = attempts.length + 1;

    const attempt = await ExamAttempt.create({
      blueprintId: blueprint._id,
      paperId: paper._id,
      student: student._id,
      attemptNumber,
      startedAt: now,
      status: "IN_PROGRESS",
      answers: [],
    });

    return res.status(201).json({
      message: "Exam attempt started successfully",
      attempt,
      paper: {
        _id: paper._id,
        version: paper.version,
        questions: paper.questions.map((q, idx) => ({
          questionIndex: idx,
          sectionType: q.sectionType,
          questionText: q.questionText,
          options: q.options || [],
          marks: q.marks,
        })),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const message = String(error?.message || "");
      if (message.includes("blueprintId_1_student_1")) {
        return res.status(500).json({
          message:
            "Legacy unique index blocks multiple attempts. Drop index blueprintId_1_student_1 from examattempts collection.",
        });
      }
      return res.status(400).json({ message: "Unable to create attempt. Maximum attempts may have been reached." });
    }
    return res.status(500).json({ message: error.message });
  }
};

/* ================= STUDENT - SAVE ANSWER ================= */
export const saveExamAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionIndex, answerText = "", selectedOption = "" } = req.body || {};

    if (!Number.isFinite(Number(questionIndex)) || Number(questionIndex) < 0) {
      return res.status(400).json({ message: "Valid questionIndex is required" });
    }

    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      student: student._id,
    });
    if (!attempt) {
      return res.status(404).json({ message: "Exam attempt not found" });
    }
    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "Cannot update answers after submission" });
    }

    const blueprint = await ExamBlueprint.findById(attempt.blueprintId);
    if (!blueprint) {
      return res.status(404).json({ message: "Exam blueprint not found" });
    }

    const now = new Date();
    if (!isWithinSchedule({ start: blueprint.scheduleStart, end: blueprint.scheduleEnd, now })) {
      return res.status(400).json({ message: "Exam schedule window is closed" });
    }
    if (hasAttemptTimedOut({ startedAt: attempt.startedAt, durationMinutes: blueprint.durationMinutes, now })) {
      return res.status(400).json({ message: "Exam duration is over. Please submit attempt." });
    }

    const answerMap = buildAnswerMap(attempt.answers);
    answerMap.set(Number(questionIndex), {
      questionIndex: Number(questionIndex),
      answerText: String(answerText || ""),
      selectedOption: String(selectedOption || ""),
    });

    const answers = Array.from(answerMap.values()).sort(
      (a, b) => Number(a.questionIndex) - Number(b.questionIndex)
    );

    const updated = await ExamAttempt.findByIdAndUpdate(
      attemptId,
      { answers },
      { new: true, runValidators: true }
    );

    return res.json({
      message: "Answer saved successfully",
      attempt: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const evaluateAttempt = async ({ paper, answers }) => {
  const answerMap = buildAnswerMap(answers);
  let totalAwarded = 0;
  let totalMax = 0;
  const perQuestion = [];

  for (let index = 0; index < (paper?.questions || []).length; index += 1) {
    const question = paper.questions[index];
    const answer = answerMap.get(index) || {};
    const evaluated = await evaluateQuestion({ question, answer });
    const maxMarks = Number(question?.marks || 0);
    totalAwarded += Number(evaluated.awardedMarks || 0);
    totalMax += maxMarks;
    perQuestion.push({
      questionIndex: index,
      awardedMarks: Number(evaluated.awardedMarks || 0),
      maxMarks,
      isCorrect: Boolean(evaluated.isCorrect),
      feedback: String(evaluated.feedback || ""),
      expectedAnswer: String(evaluated.expectedAnswer || ""),
      studentAnswer: String(evaluated.studentAnswer || ""),
    });
  }

  return {
    totalAwarded: Number(totalAwarded.toFixed(2)),
    totalMax: Number(totalMax.toFixed(2)),
    perQuestion,
  };
};

/* ================= STUDENT - SUBMIT ATTEMPT ================= */
export const submitExamAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      student: student._id,
    });
    if (!attempt) {
      return res.status(404).json({ message: "Exam attempt not found" });
    }

    if (attempt.status === "EVALUATED") {
      const evaluation = await ExamEvaluation.findOne({ attemptId: attempt._id });
      return res.json({
        message: "Attempt already submitted and evaluated",
        attempt,
        evaluation,
      });
    }

    const paper = await ExamPaper.findById(attempt.paperId);
    if (!paper) {
      return res.status(404).json({ message: "Question paper not found" });
    }

    const evaluationData = await evaluateAttempt({
      paper,
      answers: attempt.answers || [],
    });

    await ExamEvaluation.findOneAndUpdate(
      { attemptId: attempt._id },
      {
        attemptId: attempt._id,
        totalAwarded: evaluationData.totalAwarded,
        totalMax: evaluationData.totalMax,
        perQuestion: evaluationData.perQuestion,
        evaluatedBy: "AI",
      },
      { upsert: true, new: true, runValidators: true }
    );

    const updatedAttempt = await ExamAttempt.findByIdAndUpdate(
      attempt._id,
      {
        status: "EVALUATED",
        submittedAt: attempt.submittedAt || new Date(),
      },
      { new: true, runValidators: true }
    );

    const evaluation = await ExamEvaluation.findOne({ attemptId: attempt._id });

    return res.json({
      message: "Exam submitted and evaluated successfully",
      attempt: updatedAttempt,
      evaluation,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/* ================= STUDENT - GET RESULT ================= */
export const getMyExamResult = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const student = await getCurrentStudent(req.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      student: student._id,
    }).populate("blueprintId", "title subject durationMinutes totalMarks scheduleStart scheduleEnd");

    if (!attempt) {
      return res.status(404).json({ message: "Exam attempt not found" });
    }

    const evaluation = await ExamEvaluation.findOne({ attemptId: attempt._id });
    if (!evaluation) {
      return res.status(404).json({ message: "Evaluation is not ready yet" });
    }

    return res.json({
      message: "Exam result fetched successfully",
      attempt,
      evaluation,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
