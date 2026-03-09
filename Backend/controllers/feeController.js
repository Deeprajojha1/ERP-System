import mongoose from "mongoose";
import crypto from "crypto";
import Batch from "../models/feeBatch.js";
import Branch from "../models/feeBranch.js";
import Program from "../models/feeProgram.js";
import StudentFeeDetails from "../models/feeStudentDetails.js";
import FeeDemand from "../models/feeDemand.js";
import PaymentHistory from "../models/feePaymentHistory.js";
import FeeDemandRequest from "../models/feeDemandRequest.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import FeeAuditLog from "../models/feeAuditLog.js";
import FeeCounter from "../models/feeCounter.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};
const round2 = (value) => Number(Number(value).toFixed(2));
const SAFE_TEXT_RE = /^[a-zA-Z0-9 _./&@()#+-]+$/;
const ACADEMIC_YEAR_RE = /^\d{4}-\d{2}$/;
const ALLOWED_BREAKDOWN_HEADS = new Set([
  "TUITION",
  "HOSTEL",
  "TRANSPORT",
  "EXAM",
  "BACK_EXAM",
  "FINE",
]);
const ALLOWED_PAYMENT_MODES = new Set([
  "UPI",
  "NETBANKING",
  "CARD",
  "CASH",
  "CHEQUE",
  "DD",
  "BANK_TRANSFER",
]);
const ALLOWED_GATEWAYS = new Set(["RAZORPAY", "PAYU", "CASHFREE", "NONE"]);
const MODES_REQUIRING_TXN = new Set(["UPI", "NETBANKING", "CARD", "BANK_TRANSFER"]);
const MODES_REQUIRING_RECEIPT = new Set(["CASH", "CHEQUE", "DD"]);
const ONLINE_PAYMENT_MODES = new Set(["UPI", "NETBANKING", "CARD", "BANK_TRANSFER"]);
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

const getClientIp = (req) =>
  String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim() || String(req.ip || "unknown");

const hashPayload = (payload) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(payload || {}))
    .digest("hex");

const sanitizeText = (value, maxLen = 120) =>
  String(value || "")
    .trim()
    .slice(0, maxLen);

const ensureSafeText = (value, fieldLabel, { allowEmpty = false } = {}) => {
  const normalized = sanitizeText(value);
  if (!allowEmpty && !normalized) {
    throw new Error(`${fieldLabel.toUpperCase()}_REQUIRED`);
  }
  if (normalized && !SAFE_TEXT_RE.test(normalized)) {
    throw new Error(`${fieldLabel.toUpperCase()}_INVALID`);
  }
  return normalized;
};

const sanitizePaymentDetails = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowedKeys = [
    "rrn",
    "bankRef",
    "chequeNo",
    "chequeDate",
    "bankName",
    "note",
  ];
  const cleaned = {};
  for (const key of allowedKeys) {
    if (value[key] == null) continue;
    cleaned[key] = sanitizeText(value[key], 180);
  }
  return cleaned;
};

const getRazorpayConfig = () => ({
  keyId: String(process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || "").trim(),
  keySecret: String(process.env.RAZORPAY_KEY_SECRET || "").trim(),
  webhookSecret: String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim(),
  currency: String(process.env.RAZORPAY_CURRENCY || "INR").trim().toUpperCase(),
});

const isRazorpayConfigured = () => {
  const cfg = getRazorpayConfig();
  return Boolean(cfg.keyId && cfg.keySecret);
};

const buildRazorpayAuthHeader = () => {
  const { keyId, keySecret } = getRazorpayConfig();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${auth}`;
};

const mapRazorpayMethodToMode = (method = "") => {
  const normalized = String(method || "").toLowerCase().trim();
  if (normalized === "upi") return "UPI";
  if (normalized === "card") return "CARD";
  if (normalized === "netbanking") return "NETBANKING";
  if (normalized === "bank_transfer") return "BANK_TRANSFER";
  return null;
};

const verifyRazorpayPaymentSignature = ({ orderId, paymentId, signature }) => {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) return false;
  const payload = `${String(orderId || "").trim()}|${String(paymentId || "").trim()}`;
  const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
  const provided = String(signature || "").trim().toLowerCase();
  const exp = String(expected || "").trim().toLowerCase();
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(exp, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const verifyRazorpayWebhookSignature = ({ rawBody, signature }) => {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(String(rawBody || ""))
    .digest("hex");
  const provided = String(signature || "").trim().toLowerCase();
  const exp = String(expected || "").trim().toLowerCase();
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(exp, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const callRazorpay = async ({ method = "GET", path = "/", body }) => {
  const url = `${RAZORPAY_API_BASE}${path}`;
  const response = await fetch(url, {
    method: String(method || "GET").toUpperCase(),
    headers: {
      Authorization: buildRazorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.error?.description ||
      data?.error?.reason ||
      data?.message ||
      "Razorpay request failed";
    const err = new Error(message);
    err.statusCode = response.status;
    throw err;
  }
  return data;
};

const maskValue = (value = "", { prefix = 2, suffix = 2 } = {}) => {
  const raw = String(value || "");
  if (!raw) return raw;
  if (raw.length <= prefix + suffix) return "***";
  return `${raw.slice(0, prefix)}***${raw.slice(-suffix)}`;
};

const logFeeAudit = async (req, { action, entityType, entityId, metadata = {} }) => {
  try {
    await FeeAuditLog.create({
      actorUserId: req.userId || null,
      actorRole: String(req.role || "unknown"),
      action,
      entityType,
      entityId: String(entityId || ""),
      metadata: {
        ...metadata,
        hash: hashPayload(metadata),
      },
      ip: getClientIp(req),
      userAgent: sanitizeText(req.headers["user-agent"], 512),
    });
  } catch {
    // Do not fail core operation on audit-log issues.
  }
};

const sanitizeError = (error) => {
  if (error instanceof mongoose.Error.ValidationError) return error.message;
  return "Request failed";
};

const sumBreakdownAmount = (breakdown = []) =>
  round2(breakdown.reduce((sum, item) => sum + Number(item?.amount || 0), 0));

const toNonNegativeNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return round2(num);
};

const computeBenefitAmount = ({ type, value, baseAmount }) => {
  const safeBase = toNonNegativeNumber(baseAmount);
  const safeValue = toNonNegativeNumber(value);
  const normalizedType = String(type || "NONE").toUpperCase();
  if (normalizedType === "PERCENT") {
    return round2(Math.min(safeBase, (safeBase * safeValue) / 100));
  }
  if (normalizedType === "FIXED") {
    return round2(Math.min(safeBase, safeValue));
  }
  return 0;
};

const computeCourseFeeSummary = ({ branch, scholarship, discount }) => {
  const gross = round2(
    (Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : []).reduce(
      (sum, row) => sum + toNonNegativeNumber(row?.baseFee),
      0
    )
  );
  const scholarshipAmount = computeBenefitAmount({
    type: scholarship?.type,
    value: scholarship?.value,
    baseAmount: gross,
  });
  const discountAmount = computeBenefitAmount({
    type: discount?.type,
    value: discount?.value,
    baseAmount: round2(Math.max(0, gross - scholarshipAmount)),
  });
  const net = round2(Math.max(0, gross - scholarshipAmount - discountAmount));
  return {
    courseGrossFee: gross,
    scholarshipAmount,
    discountAmount,
    courseNetFee: net,
    totalPaid: 0,
    remainingFee: net,
  };
};

const applyFeeProfilePaymentDelta = async ({ session, studentMongoId, deltaAmount }) => {
  const profile = await StudentFeeDetails.findById(studentMongoId).session(session);
  if (!profile) return;

  const gross = toNonNegativeNumber(profile?.feeSummary?.courseGrossFee);
  const scholarshipAmount = toNonNegativeNumber(profile?.feeSummary?.scholarshipAmount);
  const discountAmount = toNonNegativeNumber(profile?.feeSummary?.discountAmount);
  const net = toNonNegativeNumber(
    profile?.feeSummary?.courseNetFee > 0
      ? profile?.feeSummary?.courseNetFee
      : Math.max(0, gross - scholarshipAmount - discountAmount)
  );
  const currentPaid = toNonNegativeNumber(profile?.feeSummary?.totalPaid);
  const nextPaid = round2(Math.min(net, Math.max(0, currentPaid + Number(deltaAmount || 0))));

  profile.feeSummary = {
    courseGrossFee: gross,
    scholarshipAmount,
    discountAmount,
    courseNetFee: net,
    totalPaid: nextPaid,
    remainingFee: round2(Math.max(0, net - nextPaid)),
  };

  await profile.save({ session });
};

const recalcDemand = (demand) => {
  demand.totalAmount = round2(Number(demand.totalAmount || 0));
  demand.paidAmount = round2(Number(demand.paidAmount || 0));
  demand.dueAmount = round2(Math.max(0, demand.totalAmount - demand.paidAmount));
  if (demand.dueAmount <= 0) demand.status = "PAID";
  else if (demand.paidAmount > 0) demand.status = "PARTIAL";
  else demand.status = "PENDING";
};

const applyBreakdownPayment = (breakdown = [], amount) => {
  let remaining = round2(amount);
  for (const row of breakdown) {
    if (remaining <= 0) break;
    const amountDue = Math.max(0, round2(Number(row.amount || 0) - Number(row.paid || 0)));
    const pay = round2(Math.min(amountDue, remaining));
    row.paid = round2(Number(row.paid || 0) + pay);
    remaining = round2(remaining - pay);
  }
};

const reverseBreakdownPayment = (breakdown = [], amount) => {
  let remaining = round2(amount);
  for (let i = breakdown.length - 1; i >= 0; i -= 1) {
    if (remaining <= 0) break;
    const paid = round2(Number(breakdown[i].paid || 0));
    const revoke = round2(Math.min(paid, remaining));
    breakdown[i].paid = round2(paid - revoke);
    remaining = round2(remaining - revoke);
  }
};

const getCurrentStudentFeeProfile = async (userId) => {
  const student = await Student.findOne({
    user: userId,
    isDeleted: { $ne: true },
  }).select("enrollmentNumber");

  const normalizedEnrollment = String(student?.enrollmentNumber || "").trim();
  const profileQuery = student
    ? { $or: [{ userId }, { studentId: normalizedEnrollment }] }
    : { userId };

  const profile = await StudentFeeDetails.findOne(profileQuery);

  if (!student && !profile) return null;
  return { student: student || null, profile: profile || null };
};

const normalizeLoose = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getDepartmentNameById = async (departmentId) => {
  if (!departmentId || !isValidId(departmentId)) return "";
  const dept = await Department.findById(departmentId).select("name");
  return String(dept?.name || "").trim();
};

const resolveFeeReferencesFromStudent = async (studentDoc) => {
  if (!studentDoc) return null;

  const studentProgramRaw = String(studentDoc?.program || "").trim();
  const studentProgramNorm = normalizeLoose(studentProgramRaw);
  const departmentId = studentDoc?.department;
  const departmentName = await getDepartmentNameById(departmentId);
  const departmentNorm = normalizeLoose(departmentName);

  const programs = await Program.find().select("_id programName branchIds");
  const matchedProgram =
    programs.find(
      (p) => normalizeLoose(p?.programName || "") === studentProgramNorm
    ) ||
    programs.find((p) =>
      normalizeLoose(p?.programName || "").includes(studentProgramNorm)
    ) ||
    null;
  if (!matchedProgram) return null;

  const branches = await Branch.find({ programId: matchedProgram._id }).select(
    "_id branchName semesterBaseFees programId"
  );
  const matchedBranch =
    branches.find(
      (b) => normalizeLoose(b?.branchName || "") === departmentNorm
    ) ||
    branches.find((b) =>
      normalizeLoose(b?.branchName || "").includes(departmentNorm)
    ) ||
    branches[0] ||
    null;
  if (!matchedBranch) return null;

  const academicYearText = String(studentDoc?.academicYear || "").trim();
  const batchYearCandidate = Number(academicYearText.slice(0, 4));
  const batchQuery = {
    departmentId: studentDoc.department,
    programIds: matchedProgram._id,
  };
  if (Number.isFinite(batchYearCandidate)) {
    batchQuery.batchYear = batchYearCandidate;
  }

  let matchedBatch = await Batch.findOne(batchQuery)
    .sort({ batchYear: -1, createdAt: -1 })
    .select("_id batchYear programIds");

  if (!matchedBatch) {
    matchedBatch = await Batch.findOne({
      departmentId: studentDoc.department,
      programIds: matchedProgram._id,
    })
      .sort({ batchYear: -1, createdAt: -1 })
      .select("_id batchYear programIds");
  }
  if (!matchedBatch) return null;

  return {
    batch: matchedBatch,
    program: matchedProgram,
    branch: matchedBranch,
  };
};

export const ensureStudentFeeProfileForEnrollment = async (studentId) => {
  const enrollment = String(studentId || "").trim();
  if (!enrollment) return null;

  let profile = await StudentFeeDetails.findOne({ studentId: enrollment });
  if (profile) return profile;

  const student = await Student.findOne({
    enrollmentNumber: enrollment,
    isDeleted: { $ne: true },
  }).select("_id user enrollmentNumber semester program department academicYear");
  if (!student?.user) return null;

  profile = await StudentFeeDetails.findOne({ userId: student.user });
  if (profile) return profile;

  const refs = await resolveFeeReferencesFromStudent(student);
  if (!refs?.batch || !refs?.program || !refs?.branch) return null;

  const scholarship = { type: "NONE", value: 0 };
  const discount = { type: "NONE", value: 0 };
  const feeSummary = computeCourseFeeSummary({
    branch: refs.branch,
    scholarship,
    discount,
  });

  return StudentFeeDetails.create({
    userId: student.user,
    studentId: enrollment,
    batchId: refs.batch._id,
    programId: refs.program._id,
    branchId: refs.branch._id,
    currentSemester: Number(student.semester || 1),
    hostelOpted: false,
    transportOpted: false,
    scholarship,
    discount,
    feeSummary,
  });
};

const getNextReceiptNo = async (session) => {
  const now = new Date();
  const key = `receipt:${now.getUTCFullYear()}:${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const row = await FeeCounter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );
  const seq = Number(row?.seq || 1);
  return `RCPT-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(seq).padStart(6, "0")}`;
};

/* ================= MASTER: PROGRAM/BATCH/BRANCH ================= */
export const createFeeProgram = async (req, res) => {
  try {
    const { programName, durationYears, totalSemesters, branchIds = [] } = req.body || {};
    if (!programName || !durationYears || !totalSemesters) {
      return res.status(400).json({ message: "programName, durationYears, totalSemesters are required" });
    }
    const safeProgramName = ensureSafeText(programName, "program_name");
    const years = toNum(durationYears);
    const sems = toNum(totalSemesters);
    if (Number.isNaN(years) || Number.isNaN(sems) || years < 1 || years > 10 || sems < 1 || sems > 20) {
      return res.status(400).json({ message: "Invalid durationYears or totalSemesters" });
    }

    const program = await Program.create({
      programName: safeProgramName,
      durationYears: years,
      totalSemesters: sems,
      branchIds: Array.isArray(branchIds) ? branchIds : [],
    });
    await logFeeAudit(req, {
      action: "FEE_PROGRAM_CREATED",
      entityType: "Program",
      entityId: program._id,
      metadata: { programName: program.programName, durationYears: years, totalSemesters: sems },
    });

    return res.status(201).json({ message: "Fee program created successfully", data: program });
  } catch (error) {
    if (String(error?.message || "").includes("_INVALID") || String(error?.message || "").includes("_REQUIRED")) {
      return res.status(400).json({ message: "Invalid program name" });
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Program already exists" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeProgrammes = async (req, res) => {
  try {
    const programmes = await Program.find()
      .populate("branchIds", "branchName semesterBaseFees")
      .sort({ createdAt: -1 });
    return res.status(200).json({ message: "Fee programmes retrieved", data: programmes });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createFeeBatch = async (req, res) => {
  try {
    const { batchYear, programIds, departmentId } = req.body || {};
    if (!batchYear || !Array.isArray(programIds) || !programIds.length || !departmentId) {
      return res.status(400).json({ message: "batchYear, programIds and departmentId are required" });
    }
    if (!isValidId(departmentId) || programIds.some((p) => !isValidId(p))) {
      return res.status(400).json({ message: "Invalid ids in request" });
    }

    const created = await Batch.create({
      batchYear: toNum(batchYear),
      programIds,
      departmentId,
    });
    await logFeeAudit(req, {
      action: "FEE_BATCH_CREATED",
      entityType: "Batch",
      entityId: created._id,
      metadata: { batchYear: Number(batchYear), departmentId, programCount: programIds.length },
    });
    return res.status(201).json({ message: "Fee batch created successfully", data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Batch already exists for this year and department" });
    }
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeBatches = async (req, res) => {
  try {
    const { programId, departmentId, batchYear } = req.query || {};
    const query = {};

    if (programId) {
      if (!isValidId(programId)) return res.status(400).json({ message: "Invalid programId" });
      query.programIds = programId;
    }
    if (departmentId) {
      if (!isValidId(departmentId)) return res.status(400).json({ message: "Invalid departmentId" });
      query.departmentId = departmentId;
    }
    if (batchYear) {
      const year = toNum(batchYear);
      if (Number.isNaN(year)) return res.status(400).json({ message: "Invalid batchYear" });
      query.batchYear = year;
    }

    const rawLimit = Number(req.query?.limit || 200);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.floor(rawLimit))) : 200;

    const rows = await Batch.find(query)
      .sort({ batchYear: -1, createdAt: -1 })
      .limit(limit)
      .populate("programIds", "programName")
      .populate("departmentId", "name code");

    return res.status(200).json({ message: "Fee batches retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createFeeBranch = async (req, res) => {
  try {
    const { programId, branchName, semesterBaseFees, hostelYearlyFee = 0, transportYearlyFee = 0 } = req.body || {};
    if (!programId || !branchName || !Array.isArray(semesterBaseFees) || !semesterBaseFees.length) {
      return res.status(400).json({ message: "programId, branchName, semesterBaseFees are required" });
    }
    if (!isValidId(programId)) return res.status(400).json({ message: "Invalid programId" });

    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ message: "Program not found" });

    const safeBranchName = ensureSafeText(branchName, "branch_name");
    const branch = await Branch.create({
      programId,
      branchName: safeBranchName,
      semesterBaseFees,
      hostelYearlyFee: Math.max(0, round2(Number(hostelYearlyFee || 0))),
      transportYearlyFee: Math.max(0, round2(Number(transportYearlyFee || 0))),
    });

    await Program.findByIdAndUpdate(programId, { $addToSet: { branchIds: branch._id } });
    await logFeeAudit(req, {
      action: "FEE_BRANCH_CREATED",
      entityType: "Branch",
      entityId: branch._id,
      metadata: {
        programId,
        branchName: branch.branchName,
        semesterCount: Array.isArray(semesterBaseFees) ? semesterBaseFees.length : 0,
      },
    });
    return res.status(201).json({ message: "Fee branch created successfully", data: branch });
  } catch (error) {
    if (String(error?.message || "").includes("_INVALID") || String(error?.message || "").includes("_REQUIRED")) {
      return res.status(400).json({ message: "Invalid branch name" });
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Branch already exists" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= STUDENT FEE PROFILE ================= */
export const createStudentFeeDetails = async (req, res) => {
  try {
    const {
      userId,
      studentId,
      batchId,
      programId,
      branchId,
      currentSemester,
      hostelOpted = false,
      transportOpted = false,
      scholarship = { type: "NONE", value: 0 },
      discount = { type: "NONE", value: 0 },
    } = req.body || {};
    if (!userId || !studentId || !batchId || !programId || !branchId || !currentSemester) {
      return res.status(400).json({ message: "userId, studentId, batchId, programId, branchId, currentSemester are required" });
    }
    if (![userId, batchId, programId, branchId].every(isValidId)) {
      return res.status(400).json({ message: "Invalid ids provided" });
    }
    const safeStudentId = ensureSafeText(studentId, "student_id");
    const semester = toNum(currentSemester);
    if (Number.isNaN(semester) || semester < 1 || semester > 20) {
      return res.status(400).json({ message: "Invalid currentSemester" });
    }
    const [batch, program, branch, student] = await Promise.all([
      Batch.findById(batchId).select("_id programIds"),
      Program.findById(programId).select("_id"),
      Branch.findById(branchId).select("_id programId semesterBaseFees"),
      Student.findOne({ user: userId, isDeleted: { $ne: true } }).select("_id"),
    ]);
    if (!batch || !program || !branch || !student) {
      return res.status(404).json({ message: "Invalid fee profile references" });
    }
    if (!batch.programIds.some((id) => String(id) === String(programId))) {
      return res.status(400).json({ message: "Program does not belong to selected batch" });
    }
    if (String(branch.programId) !== String(programId)) {
      return res.status(400).json({ message: "Branch does not belong to selected program" });
    }

    const normalizedScholarship = {
      type: ["NONE", "PERCENT", "FIXED"].includes(String(scholarship?.type || "NONE"))
        ? String(scholarship?.type || "NONE")
        : "NONE",
      value: Math.max(0, round2(Number(scholarship?.value || 0))),
    };
    const normalizedDiscount = {
      type: ["NONE", "PERCENT", "FIXED"].includes(String(discount?.type || "NONE"))
        ? String(discount?.type || "NONE")
        : "NONE",
      value: Math.max(0, round2(Number(discount?.value || 0))),
    };
    const feeSummary = computeCourseFeeSummary({
      branch,
      scholarship: normalizedScholarship,
      discount: normalizedDiscount,
    });

    const created = await StudentFeeDetails.create({
      userId,
      studentId: safeStudentId,
      batchId,
      programId,
      branchId,
      currentSemester: semester,
      hostelOpted: Boolean(hostelOpted),
      transportOpted: Boolean(transportOpted),
      scholarship: normalizedScholarship,
      discount: normalizedDiscount,
      feeSummary,
    });
    await logFeeAudit(req, {
      action: "FEE_STUDENT_PROFILE_CREATED",
      entityType: "StudentFeeDetails",
      entityId: created._id,
      metadata: {
        studentId: created.studentId,
        batchId,
        programId,
        branchId,
        currentSemester: semester,
      },
    });
    return res.status(201).json({ message: "Student fee details created successfully", data: created });
  } catch (error) {
    if (String(error?.message || "").includes("_INVALID") || String(error?.message || "").includes("_REQUIRED")) {
      return res.status(400).json({ message: "Invalid studentId format" });
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Student fee details already exist" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId, programId, batchId, branchId, userId } = req.query || {};
    const query = {};

    if (studentId) query.studentId = String(studentId).trim();
    if (programId) {
      if (!isValidId(programId)) return res.status(400).json({ message: "Invalid programId" });
      query.programId = programId;
    }
    if (batchId) {
      if (!isValidId(batchId)) return res.status(400).json({ message: "Invalid batchId" });
      query.batchId = batchId;
    }
    if (branchId) {
      if (!isValidId(branchId)) return res.status(400).json({ message: "Invalid branchId" });
      query.branchId = branchId;
    }
    if (userId) {
      if (!isValidId(userId)) return res.status(400).json({ message: "Invalid userId" });
      query.userId = userId;
    }

    const rawLimit = Number(req.query?.limit || 150);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.floor(rawLimit))) : 150;

    const rows = await StudentFeeDetails.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email")
      .populate("programId", "programName")
      .populate("branchId", "branchName")
      .populate("batchId", "batchYear");

    return res.status(200).json({ message: "Student fee details retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const updateStudentFeeDetailsBenefits = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid fee student details id" });

    const scholarship = req.body?.scholarship;
    const discount = req.body?.discount;

    if (!scholarship && !discount) {
      return res.status(400).json({ message: "scholarship or discount payload is required" });
    }

    const normalizeBenefit = (value) => {
      const type = String(value?.type || "NONE").toUpperCase();
      const validType = ["NONE", "PERCENT", "FIXED"].includes(type) ? type : "NONE";
      const amount = Math.max(0, round2(Number(value?.value || 0)));
      return { type: validType, value: amount };
    };

    const update = {};
    if (scholarship) update.scholarship = normalizeBenefit(scholarship);
    if (discount) update.discount = normalizeBenefit(discount);

    const profile = await StudentFeeDetails.findById(id).populate("branchId", "semesterBaseFees");
    if (!profile) return res.status(404).json({ message: "Student fee details not found" });

    if (update.scholarship) profile.scholarship = update.scholarship;
    if (update.discount) profile.discount = update.discount;

    const computedSummary = computeCourseFeeSummary({
      branch: profile.branchId,
      scholarship: profile.scholarship,
      discount: profile.discount,
    });
    const existingPaid = toNonNegativeNumber(profile?.feeSummary?.totalPaid);
    const cappedPaid = round2(Math.min(existingPaid, computedSummary.courseNetFee));
    profile.feeSummary = {
      ...computedSummary,
      totalPaid: cappedPaid,
      remainingFee: round2(Math.max(0, computedSummary.courseNetFee - cappedPaid)),
    };

    await profile.save();

    const updated = await StudentFeeDetails.findById(id)
      .populate("userId", "name email")
      .populate("programId", "programName")
      .populate("branchId", "branchName")
      .populate("batchId", "batchYear");

    if (!updated) return res.status(404).json({ message: "Student fee details not found" });

    await logFeeAudit(req, {
      action: "FEE_STUDENT_PROFILE_BENEFITS_UPDATED",
      entityType: "StudentFeeDetails",
      entityId: updated._id,
      metadata: {
        studentId: String(updated.studentId || ""),
        scholarship: update.scholarship || undefined,
        discount: update.discount || undefined,
      },
    });

    return res.status(200).json({ message: "Student fee benefits updated", data: updated });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= DEMANDS ================= */
export const createFeeDemand = async (req, res) => {
  try {
    let { studentMongoId, studentId, academicYear, semesterNo, breakdown, dueDate } = req.body || {};
    if (!studentId || !academicYear || !semesterNo || !Array.isArray(breakdown) || !breakdown.length || !dueDate) {
      return res.status(400).json({
        message: "studentId, academicYear, semesterNo, breakdown and dueDate are required",
      });
    }
    const safeStudentId = ensureSafeText(studentId, "student_id");
    const safeAcademicYear = sanitizeText(academicYear, 16);
    if (!ACADEMIC_YEAR_RE.test(safeAcademicYear)) {
      return res.status(400).json({ message: "Invalid academicYear format. Use YYYY-YY" });
    }
    const semester = toNum(semesterNo);
    if (Number.isNaN(semester) || semester < 1 || semester > 20) {
      return res.status(400).json({ message: "Invalid semesterNo" });
    }
    const dueDateObj = new Date(dueDate);
    if (Number.isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid dueDate" });
    }
    let profile = null;
    if (studentMongoId && isValidId(studentMongoId)) {
      profile = await StudentFeeDetails.findById(studentMongoId).select("_id studentId");
    }
    if (!profile) {
      profile = await ensureStudentFeeProfileForEnrollment(safeStudentId);
      studentMongoId = profile?._id;
    }

    if (!profile) return res.status(404).json({ message: "Student fee profile not found" });
    if (String(profile.studentId) !== String(safeStudentId)) {
      return res.status(400).json({ message: "studentId does not match student profile" });
    }

    const headSet = new Set();
    for (const row of breakdown) {
      const amt = toNum(row?.amount);
      if (Number.isNaN(amt) || amt < 0) return res.status(400).json({ message: "Invalid breakdown amount" });
      const head = String(row?.head || "").toUpperCase();
      if (!ALLOWED_BREAKDOWN_HEADS.has(head)) {
        return res.status(400).json({ message: "Invalid breakdown head" });
      }
      if (headSet.has(head)) {
        return res.status(400).json({ message: "Duplicate breakdown head is not allowed" });
      }
      headSet.add(head);
    }

    const totalAmount = sumBreakdownAmount(breakdown);
    const doc = await FeeDemand.create({
      studentMongoId,
      studentId: safeStudentId,
      academicYear: safeAcademicYear,
      semesterNo: semester,
      breakdown: breakdown.map((b) => ({ head: String(b.head).toUpperCase(), amount: round2(Number(b.amount)), paid: 0 })),
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate: dueDateObj,
      status: "PENDING",
    });
    await logFeeAudit(req, {
      action: "FEE_DEMAND_CREATED",
      entityType: "FeeDemand",
      entityId: doc._id,
      metadata: {
        studentId: doc.studentId,
        academicYear: doc.academicYear,
        semesterNo: doc.semesterNo,
        totalAmount: doc.totalAmount,
      },
    });

    return res.status(201).json({ message: "Fee demand created successfully", data: doc });
  } catch (error) {
    if (String(error?.message || "").includes("_INVALID") || String(error?.message || "").includes("_REQUIRED")) {
      return res.status(400).json({ message: "Invalid demand payload" });
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Demand already exists for this student/semester/year" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const generateFeeDemandFromProfile = async (req, res) => {
  try {
    const {
      studentId,
      academicYear,
      semesterNo,
      dueDate,
      hostelAmount = 0,
      transportAmount = 0,
    } = req.body || {};

    if (!studentId || !academicYear || !semesterNo || !dueDate) {
      return res.status(400).json({
        message: "studentId, academicYear, semesterNo and dueDate are required",
      });
    }

    const safeStudentId = ensureSafeText(studentId, "student_id");
    const safeAcademicYear = sanitizeText(academicYear, 16);
    if (!ACADEMIC_YEAR_RE.test(safeAcademicYear)) {
      return res.status(400).json({ message: "Invalid academicYear format. Use YYYY-YY" });
    }
    const semester = toNum(semesterNo);
    if (Number.isNaN(semester) || semester < 1 || semester > 20) {
      return res.status(400).json({ message: "Invalid semesterNo" });
    }
    const dueDateObj = new Date(dueDate);
    if (Number.isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid dueDate" });
    }

    const profile = await ensureStudentFeeProfileForEnrollment(safeStudentId);
    if (!profile) return res.status(404).json({ message: "Student fee profile not found" });

    const branch = await Branch.findById(profile.branchId).select("semesterBaseFees");
    const semesterRow = (Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : []).find(
      (row) => Number(row?.semesterNo) === Number(semester)
    );
    if (!semesterRow) {
      return res.status(400).json({ message: "Semester base fee is not configured for selected branch/semester" });
    }

    const grossSemesterFee = round2(Number(semesterRow.baseFee || 0));
    const courseGross = round2(
      (Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : []).reduce(
        (sum, row) => sum + Number(row?.baseFee || 0),
        0
      )
    );
    const courseNet = round2(Number(profile?.feeSummary?.courseNetFee || 0));
    const ratio = courseGross > 0 ? Math.min(1, Math.max(0, courseNet / courseGross)) : 1;
    const netTuition = round2(grossSemesterFee * ratio);

    const heads = [{ head: "TUITION", amount: netTuition }];
    const hostelFee = round2(Math.max(0, Number(hostelAmount || 0)));
    const transportFee = round2(Math.max(0, Number(transportAmount || 0)));
    if (profile.hostelOpted && hostelFee > 0) heads.push({ head: "HOSTEL", amount: hostelFee });
    if (profile.transportOpted && transportFee > 0) heads.push({ head: "TRANSPORT", amount: transportFee });

    const totalAmount = sumBreakdownAmount(heads);
    const doc = await FeeDemand.create({
      studentMongoId: profile._id,
      studentId: safeStudentId,
      academicYear: safeAcademicYear,
      semesterNo: semester,
      breakdown: heads.map((item) => ({
        head: item.head,
        amount: round2(Number(item.amount || 0)),
        paid: 0,
      })),
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate: dueDateObj,
      status: "PENDING",
    });

    await logFeeAudit(req, {
      action: "FEE_DEMAND_GENERATED",
      entityType: "FeeDemand",
      entityId: doc._id,
      metadata: {
        studentId: doc.studentId,
        academicYear: doc.academicYear,
        semesterNo: doc.semesterNo,
        totalAmount: doc.totalAmount,
      },
    });

    return res.status(201).json({ message: "Fee demand generated successfully", data: doc });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Demand already exists for this student/semester/year" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeDemandRequests = async (req, res) => {
  try {
    const { status, studentId } = req.query || {};
    const query = {};
    if (status) query.status = String(status).toUpperCase();
    if (studentId) query.studentId = String(studentId).trim();
    const rawLimit = Number(req.query?.limit || 200);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.floor(rawLimit))) : 200;

    const rows = await FeeDemandRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("approvedByUserId", "name email")
      .populate("linkedDemandId", "academicYear semesterNo totalAmount dueAmount status");
    return res.status(200).json({ message: "Fee demand requests retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const approveFeeDemandRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid request id" });

    const request = await FeeDemandRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Demand request not found" });
    if (String(request.status) !== "PENDING") {
      return res.status(400).json({ message: "Only pending request can be approved" });
    }

    const dueDate = req.body?.dueDate || request.dueDate || new Date();
    const generated = await (async () => {
      const safeStudentId = String(request.studentId || "").trim();
      const profile = await ensureStudentFeeProfileForEnrollment(safeStudentId);
      if (!profile) throw new Error("PROFILE_NOT_FOUND");

      const branch = await Branch.findById(profile.branchId).select("semesterBaseFees");
      const semesterRow = (Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : []).find(
        (row) => Number(row?.semesterNo) === Number(request.semesterNo)
      );
      if (!semesterRow) throw new Error("SEMESTER_FEE_NOT_CONFIGURED");

      const grossSemesterFee = round2(Number(semesterRow.baseFee || 0));
      const courseGross = round2(
        (Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : []).reduce(
          (sum, row) => sum + Number(row?.baseFee || 0),
          0
        )
      );
      const courseNet = round2(Number(profile?.feeSummary?.courseNetFee || 0));
      const ratio = courseGross > 0 ? Math.min(1, Math.max(0, courseNet / courseGross)) : 1;
      const netTuition = round2(grossSemesterFee * ratio);

      const heads = [{ head: "TUITION", amount: netTuition }];
      const hostelFee = round2(Math.max(0, Number(request.hostelAmount || 0)));
      const transportFee = round2(Math.max(0, Number(request.transportAmount || 0)));
      if (profile.hostelOpted && hostelFee > 0) heads.push({ head: "HOSTEL", amount: hostelFee });
      if (profile.transportOpted && transportFee > 0) heads.push({ head: "TRANSPORT", amount: transportFee });

      const dueDateObj = new Date(dueDate);
      const totalAmount = sumBreakdownAmount(heads);
      return FeeDemand.create({
        studentMongoId: profile._id,
        studentId: safeStudentId,
        academicYear: String(request.academicYear || "").trim(),
        semesterNo: Number(request.semesterNo),
        breakdown: heads.map((item) => ({
          head: item.head,
          amount: round2(Number(item.amount || 0)),
          paid: 0,
        })),
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        dueDate: dueDateObj,
        status: "PENDING",
      });
    })();

    request.status = "APPROVED";
    request.approvedByUserId = req.userId || null;
    request.approvedAt = new Date();
    request.linkedDemandId = generated._id;
    await request.save();

    await logFeeAudit(req, {
      action: "FEE_DEMAND_REQUEST_APPROVED",
      entityType: "FeeDemandRequest",
      entityId: request._id,
      metadata: {
        studentId: request.studentId,
        academicYear: request.academicYear,
        semesterNo: request.semesterNo,
        demandId: generated._id,
      },
    });

    return res.status(200).json({ message: "Demand request approved and demand generated", data: request });
  } catch (error) {
    if (error.message === "PROFILE_NOT_FOUND") return res.status(404).json({ message: "Student fee profile not found" });
    if (error.message === "SEMESTER_FEE_NOT_CONFIGURED") {
      return res.status(400).json({ message: "Semester base fee is not configured for selected student profile" });
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Demand already exists for this student/semester/year" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const rejectFeeDemandRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid request id" });
    const request = await FeeDemandRequest.findById(id);
    if (!request) return res.status(404).json({ message: "Demand request not found" });
    if (String(request.status) !== "PENDING") {
      return res.status(400).json({ message: "Only pending request can be rejected" });
    }
    request.status = "REJECTED";
    request.rejectedAt = new Date();
    request.approvedByUserId = req.userId || null;
    await request.save();
    return res.status(200).json({ message: "Demand request rejected", data: request });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeDemands = async (req, res) => {
  try {
    const { studentId, academicYear, studentMongoId } = req.query;
    const filter = {};
    if (studentId) filter.studentId = String(studentId).trim();
    if (academicYear) filter.academicYear = String(academicYear).trim();
    if (studentMongoId) {
      if (!isValidId(studentMongoId)) return res.status(400).json({ message: "Invalid studentMongoId" });
      filter.studentMongoId = studentMongoId;
    }

    const rawLimit = Number(req.query?.limit || 150);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.floor(rawLimit))) : 150;
    const demands = await FeeDemand.find(filter).sort({ createdAt: -1 }).limit(limit);
    return res.status(200).json({ message: "Fee demands retrieved", data: demands });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= PAYMENTS (SECURE) ================= */
const allowedTransitions = {
  CREATED: ["PENDING", "SUCCESS", "FAILED", "CANCELLED"],
  PENDING: ["SUCCESS", "FAILED", "CANCELLED"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const {
      demandId,
      amount,
      mode,
      transactionId,
      gateway = "NONE",
      paymentDetails = {},
      receiptNo,
      createdBy = "ACCOUNTS",
    } = req.body || {};

    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const amountNum = toNum(amount);
    if (!demandId || Number.isNaN(amountNum) || amountNum <= 0 || !mode) {
      return res.status(400).json({ message: "demandId, amount and mode are required" });
    }
    if (!isValidId(demandId)) return res.status(400).json({ message: "Invalid demandId" });
    const safeMode = String(mode || "").toUpperCase();
    if (!ALLOWED_PAYMENT_MODES.has(safeMode)) {
      return res.status(400).json({ message: "Invalid payment mode" });
    }
    const safeGateway = String(gateway || "NONE").toUpperCase();
    if (!ALLOWED_GATEWAYS.has(safeGateway)) {
      return res.status(400).json({ message: "Invalid payment gateway" });
    }
    const safeCreatedBy = String(createdBy || "ACCOUNTS").toUpperCase();
    if (!["STUDENT", "ACCOUNTS", "SYSTEM"].includes(safeCreatedBy)) {
      return res.status(400).json({ message: "Invalid createdBy value" });
    }
    if (String(req.role || "").toLowerCase() === "student" && safeCreatedBy !== "STUDENT") {
      return res.status(403).json({ message: "Students can only create student-originated payments" });
    }
    if (String(req.role || "").toLowerCase() !== "student" && safeCreatedBy === "STUDENT") {
      return res.status(400).json({ message: "createdBy STUDENT is only allowed for student APIs" });
    }
    const safeTransactionId = sanitizeText(transactionId, 120);
    let safeReceiptNo = sanitizeText(receiptNo, 120);
    if (MODES_REQUIRING_TXN.has(safeMode) && !safeTransactionId) {
      return res.status(400).json({ message: "transactionId is required for this payment mode" });
    }
    const idempotencyKey = String(req.headers["x-idempotency-key"] || req.body?.idempotencyKey || "").trim();
    if (!idempotencyKey) return res.status(400).json({ message: "x-idempotency-key header is required" });
    if (!/^[a-zA-Z0-9:_-]{16,100}$/.test(idempotencyKey)) {
      return res.status(400).json({ message: "Invalid x-idempotency-key format" });
    }
    const safePaymentDetails = sanitizePaymentDetails(paymentDetails);

    let output = null;
    let auditMeta = null;
    await session.withTransaction(async () => {
      const existing = await PaymentHistory.findOne({ idempotencyKey }).session(session);
      if (existing) {
        output = existing;
        return;
      }

      const demand = await FeeDemand.findById(demandId).session(session);
      if (!demand) throw new Error("DEMAND_NOT_FOUND");
      if (amountNum > demand.dueAmount) throw new Error("AMOUNT_EXCEEDS_DUE");

      const initialStatus = ONLINE_PAYMENT_MODES.has(safeMode) ? "PENDING" : "SUCCESS";

      const created = await PaymentHistory.create(
        [{
          studentId: demand.studentId,
          demandId,
          amount: round2(amountNum),
          mode: safeMode,
          status: initialStatus,
          transactionId: safeTransactionId || undefined,
          idempotencyKey,
          gateway: safeGateway,
          paymentDetails: safePaymentDetails,
          receiptNo:
            MODES_REQUIRING_RECEIPT.has(safeMode)
              ? (safeReceiptNo || (await getNextReceiptNo(session)))
              : (safeReceiptNo || undefined),
          paidAt: new Date(),
          createdBy: safeCreatedBy,
          verifiedBy: req.userId || null,
        }],
        { session }
      );

      output = created[0];

      if (initialStatus === "SUCCESS") {
        demand.paidAmount = round2(Number(demand.paidAmount || 0) + amountNum);
        applyBreakdownPayment(demand.breakdown, amountNum);
        recalcDemand(demand);
        await demand.save({ session });
        await applyFeeProfilePaymentDelta({
          session,
          studentMongoId: demand.studentMongoId,
          deltaAmount: amountNum,
        });
      }

      auditMeta = {
        action: "FEE_PAYMENT_CREATED",
        entityType: "FeePaymentHistory",
        entityId: output?._id,
        metadata: {
          demandId: String(demandId),
          amount: round2(amountNum),
          mode: safeMode,
          status: initialStatus,
          createdBy: safeCreatedBy,
          idempotencyKeyDigest: hashPayload({ idempotencyKey }),
        },
      };
    });
    if (auditMeta?.entityId) await logFeeAudit(req, auditMeta);

    return res.status(201).json({ message: "Payment recorded successfully", data: output });
  } catch (error) {
    if (error.message === "DEMAND_NOT_FOUND") return res.status(404).json({ message: "Fee demand not found" });
    if (error.message === "AMOUNT_EXCEEDS_DUE") return res.status(400).json({ message: "Payment amount exceeds due amount" });
    if (error?.code === 11000) return res.status(409).json({ message: "Duplicate transaction/idempotency key/receipt" });
    return res.status(500).json({ message: sanitizeError(error) });
  } finally {
    session.endSession();
  }
};

export const updatePaymentStatus = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { paymentId } = req.params;
    const nextStatus = String(req.body?.status || "").toUpperCase();
    if (!isValidId(paymentId)) return res.status(400).json({ message: "Invalid paymentId" });
    if (!nextStatus) return res.status(400).json({ message: "status is required" });

    let updated = null;
    let auditMeta = null;
    await session.withTransaction(async () => {
      const payment = await PaymentHistory.findById(paymentId).session(session);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      const fromStatus = String(payment.status || "");
      const allowed = allowedTransitions[fromStatus] || [];
      if (!allowed.includes(nextStatus)) throw new Error("INVALID_TRANSITION");

      if ((fromStatus === "CREATED" || fromStatus === "PENDING") && nextStatus === "SUCCESS") {
        const demand = await FeeDemand.findById(payment.demandId).session(session);
        if (!demand) throw new Error("DEMAND_NOT_FOUND");
        if (Number(payment.amount || 0) > Number(demand.dueAmount || 0)) {
          throw new Error("AMOUNT_EXCEEDS_DUE");
        }

        demand.paidAmount = round2(Number(demand.paidAmount || 0) + Number(payment.amount || 0));
        applyBreakdownPayment(demand.breakdown, Number(payment.amount || 0));
        recalcDemand(demand);
        await demand.save({ session });
        await applyFeeProfilePaymentDelta({
          session,
          studentMongoId: demand.studentMongoId,
          deltaAmount: Number(payment.amount || 0),
        });
      }

      if (fromStatus === "SUCCESS" && nextStatus === "REFUNDED") {
        const demand = await FeeDemand.findById(payment.demandId).session(session);
        if (!demand) throw new Error("DEMAND_NOT_FOUND");

        demand.paidAmount = round2(Math.max(0, Number(demand.paidAmount || 0) - Number(payment.amount || 0)));
        reverseBreakdownPayment(demand.breakdown, Number(payment.amount || 0));
        recalcDemand(demand);
        await demand.save({ session });
        await applyFeeProfilePaymentDelta({
          session,
          studentMongoId: demand.studentMongoId,
          deltaAmount: -Number(payment.amount || 0),
        });
      }

      payment.status = nextStatus;
      payment.verifiedBy = req.userId || null;
      updated = await payment.save({ session });
      auditMeta = {
        action: "FEE_PAYMENT_STATUS_UPDATED",
        entityType: "FeePaymentHistory",
        entityId: paymentId,
        metadata: {
          fromStatus,
          toStatus: nextStatus,
          demandId: String(payment.demandId || ""),
          amount: Number(payment.amount || 0),
        },
      };
    });
    if (auditMeta?.entityId) await logFeeAudit(req, auditMeta);

    return res.status(200).json({ message: "Payment status updated successfully", data: updated });
  } catch (error) {
    if (error.message === "PAYMENT_NOT_FOUND") return res.status(404).json({ message: "Payment not found" });
    if (error.message === "DEMAND_NOT_FOUND") return res.status(404).json({ message: "Demand not found" });
    if (error.message === "AMOUNT_EXCEEDS_DUE") return res.status(400).json({ message: "Payment amount exceeds due amount" });
    if (error.message === "INVALID_TRANSITION") return res.status(400).json({ message: "Invalid payment status transition" });
    return res.status(500).json({ message: sanitizeError(error) });
  } finally {
    session.endSession();
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { studentId, demandId, status } = req.query;
    const filter = {};
    if (studentId) filter.studentId = String(studentId).trim();
    if (demandId) {
      if (!isValidId(demandId)) return res.status(400).json({ message: "Invalid demandId" });
      filter.demandId = demandId;
    }
    if (status) filter.status = String(status).toUpperCase();
    const rawLimit = Number(req.query?.limit || 100);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.floor(rawLimit))) : 100;

    const rows = await PaymentHistory.find(filter)
      .select("studentId demandId amount mode status transactionId gateway receiptNo paidAt createdAt createdBy verifiedBy")
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("demandId", "academicYear semesterNo totalAmount dueAmount");

    const safeRows = rows.map((item) => {
      const row = item.toObject();
      if (row.transactionId) {
        row.transactionId = maskValue(row.transactionId, { prefix: 2, suffix: 2 });
      }
      if (row.receiptNo) {
        row.receiptNo = maskValue(row.receiptNo, { prefix: 0, suffix: 4 });
      }
      return row;
    });

    return res.status(200).json({ message: "Payment history retrieved", data: safeRows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= STUDENT-ONLY SAFE VIEWS ================= */
export const getMyFeeProfile = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) {
      return res.status(404).json({ message: "Student fee profile not found" });
    }

    const profile = await StudentFeeDetails.findById(current.profile._id)
      .populate("programId", "programName")
      .populate("branchId", "branchName semesterBaseFees hostelYearlyFee transportYearlyFee")
      .populate("batchId", "batchYear")
      .populate("userId", "name email");

    if (!profile) return res.status(404).json({ message: "Student fee profile not found" });

    const semRows = Array.isArray(profile?.branchId?.semesterBaseFees)
      ? profile.branchId.semesterBaseFees
      : [];
    const yearlyMap = new Map();
    semRows.forEach((row) => {
      const semesterNo = Number(row?.semesterNo || 0);
      if (!semesterNo) return;
      const yearNo = Math.ceil(semesterNo / 2);
      const current = yearlyMap.get(yearNo) || { yearNo, tuitionFee: 0 };
      current.tuitionFee = round2(current.tuitionFee + Number(row?.baseFee || 0));
      yearlyMap.set(yearNo, current);
    });
    const hostelYearlyFee = round2(Number(profile?.branchId?.hostelYearlyFee || 0));
    const transportYearlyFee = round2(Number(profile?.branchId?.transportYearlyFee || 0));
    const yearWise = Array.from(yearlyMap.values())
      .sort((a, b) => a.yearNo - b.yearNo)
      .map((row) => {
        const hostelFee = profile?.hostelOpted ? hostelYearlyFee : 0;
        const transportFee = profile?.transportOpted ? transportYearlyFee : 0;
        const total = round2(Number(row.tuitionFee || 0) + hostelFee + transportFee);
        return {
          yearNo: row.yearNo,
          tuitionFee: round2(Number(row.tuitionFee || 0)),
          hostelFee,
          transportFee,
          totalFee: total,
        };
      });

    return res.status(200).json({
      message: "My fee profile retrieved",
      data: profile,
      yearlyBreakdown: yearWise,
    });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getMyFeeDemands = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const rawLimit = Number(req.query?.limit || 100);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(300, Math.floor(rawLimit))) : 100;
    const demands = await FeeDemand.find({ studentMongoId: current.profile._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    return res.status(200).json({ message: "My fee demands retrieved", data: demands });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getMyPaymentHistory = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const rawLimit = Number(req.query?.limit || 100);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(300, Math.floor(rawLimit))) : 100;
    const rows = await PaymentHistory.find({ studentId: current.profile.studentId })
      .select("studentId demandId amount mode status transactionId gateway receiptNo paidAt createdAt createdBy")
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("demandId", "academicYear semesterNo totalAmount dueAmount");

    const safeRows = rows.map((item) => {
      const row = item.toObject();
      if (row.transactionId) {
        const raw = String(row.transactionId);
        row.transactionId = raw.length > 6 ? `${raw.slice(0, 2)}***${raw.slice(-2)}` : "***";
      }
      if (row.receiptNo) {
        const raw = String(row.receiptNo);
        row.receiptNo = raw.length > 4 ? `***${raw.slice(-4)}` : "***";
      }
      return row;
    });

    return res.status(200).json({ message: "My payment history retrieved", data: safeRows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createMyPayment = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const demandId = req.body?.demandId;
    if (!demandId || !isValidId(demandId)) {
      return res.status(400).json({ message: "Valid demandId is required" });
    }
    const demand = await FeeDemand.findById(demandId).select("studentMongoId");
    if (!demand) return res.status(404).json({ message: "Fee demand not found" });
    if (String(demand.studentMongoId) !== String(current.profile._id)) {
      return res.status(403).json({ message: "You can only pay your own fee demand" });
    }

    req.body = {
      ...req.body,
      createdBy: "STUDENT",
    };
    if (!req.headers["x-idempotency-key"] && req.body?.idempotencyKey) {
      req.headers["x-idempotency-key"] = String(req.body.idempotencyKey);
    }

    return createPayment(req, res);
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createMyFeeDemandRequest = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const { academicYear, semesterNo, dueDate, hostelAmount = 0, transportAmount = 0, note = "" } = req.body || {};
    if (!academicYear || !semesterNo) {
      return res.status(400).json({ message: "academicYear and semesterNo are required" });
    }
    const safeAcademicYear = sanitizeText(academicYear, 16);
    if (!ACADEMIC_YEAR_RE.test(safeAcademicYear)) {
      return res.status(400).json({ message: "Invalid academicYear format. Use YYYY-YY" });
    }
    const semester = toNum(semesterNo);
    if (Number.isNaN(semester) || semester < 1 || semester > 20) {
      return res.status(400).json({ message: "Invalid semesterNo" });
    }
    const dueDateObj = dueDate ? new Date(dueDate) : null;
    if (dueDate && Number.isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid dueDate" });
    }

    const doc = await FeeDemandRequest.create({
      studentMongoId: current.profile._id,
      studentId: current.profile.studentId,
      academicYear: safeAcademicYear,
      semesterNo: semester,
      dueDate: dueDateObj || null,
      hostelAmount: round2(Math.max(0, Number(hostelAmount || 0))),
      transportAmount: round2(Math.max(0, Number(transportAmount || 0))),
      note: sanitizeText(note, 500),
      status: "PENDING",
      createdByUserId: req.userId || null,
    });

    return res.status(201).json({ message: "Demand request submitted", data: doc });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "A pending demand request already exists for selected year/semester" });
    }
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= RAZORPAY (STUDENT) ================= */
export const createMyRazorpayOrder = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Razorpay is not configured" });
    }

    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const demandId = String(req.body?.demandId || "").trim();
    const amountNum = round2(toNum(req.body?.amount));
    if (!demandId || !isValidId(demandId)) {
      return res.status(400).json({ message: "Valid demandId is required" });
    }
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const demand = await FeeDemand.findById(demandId).select("_id studentMongoId dueAmount studentId");
    if (!demand) return res.status(404).json({ message: "Fee demand not found" });
    if (String(demand.studentMongoId) !== String(current.profile._id)) {
      return res.status(403).json({ message: "You can only create orders for your own demand" });
    }
    if (amountNum > Number(demand.dueAmount || 0)) {
      return res.status(400).json({ message: "Order amount cannot exceed due amount" });
    }

    const { currency, keyId } = getRazorpayConfig();
    const amountPaise = Math.round(amountNum * 100);
    const receipt = `fee_${String(demand._id).slice(-8)}_${Date.now()}`;
    const order = await callRazorpay({
      method: "POST",
      path: "/orders",
      body: {
        amount: amountPaise,
        currency,
        receipt,
        notes: {
          demandId: String(demand._id),
          studentId: String(demand.studentId || ""),
          userId: String(req.userId || ""),
        },
      },
    });

    await logFeeAudit(req, {
      action: "FEE_RAZORPAY_ORDER_CREATED",
      entityType: "FeeDemand",
      entityId: demand._id,
      metadata: {
        demandId: String(demand._id),
        amount: amountNum,
        currency,
        razorpayOrderId: String(order?.id || ""),
      },
    });

    return res.status(201).json({
      message: "Razorpay order created",
      data: {
        keyId,
        demandId: String(demand._id),
        amount: amountNum,
        currency,
        order,
      },
    });
  } catch (error) {
    const status = Number(error?.statusCode || 0);
    if (status >= 400 && status < 500) {
      return res.status(status).json({ message: sanitizeError(error) });
    }
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const verifyMyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Razorpay is not configured" });
    }

    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const demandId = String(req.body?.demandId || "").trim();
    const orderId = String(req.body?.razorpay_order_id || "").trim();
    const paymentId = String(req.body?.razorpay_payment_id || "").trim();
    const signature = String(req.body?.razorpay_signature || "").trim();
    if (!demandId || !orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "demandId, razorpay_order_id, razorpay_payment_id, razorpay_signature are required" });
    }
    if (!isValidId(demandId)) {
      return res.status(400).json({ message: "Invalid demandId" });
    }
    if (!verifyRazorpayPaymentSignature({ orderId, paymentId, signature })) {
      return res.status(401).json({ message: "Invalid Razorpay payment signature" });
    }

    const gatewayPayment = await callRazorpay({
      method: "GET",
      path: `/payments/${encodeURIComponent(paymentId)}`,
    });
    const gatewayStatus = String(gatewayPayment?.status || "").toLowerCase();
    if (!["captured", "authorized"].includes(gatewayStatus)) {
      return res.status(400).json({ message: "Razorpay payment is not captured/authorized" });
    }
    if (String(gatewayPayment?.order_id || "") !== orderId) {
      return res.status(400).json({ message: "Razorpay order/payment mismatch" });
    }

    const mode = mapRazorpayMethodToMode(gatewayPayment?.method);
    if (!mode) {
      return res.status(400).json({ message: "Unsupported Razorpay payment method for fee ledger" });
    }

    const amountNum = round2(Number(gatewayPayment?.amount || 0) / 100);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid Razorpay payment amount" });
    }

    let output = null;
    let auditMeta = null;
    await session.withTransaction(async () => {
      const existing = await PaymentHistory.findOne({ transactionId: paymentId }).session(session);
      if (existing) {
        output = existing;
        return;
      }

      const demand = await FeeDemand.findById(demandId).session(session);
      if (!demand) throw new Error("DEMAND_NOT_FOUND");
      if (String(demand.studentMongoId) !== String(current.profile._id)) {
        throw new Error("FORBIDDEN_DEMAND");
      }
      if (amountNum > Number(demand.dueAmount || 0)) throw new Error("AMOUNT_EXCEEDS_DUE");

      const created = await PaymentHistory.create(
        [{
          studentId: demand.studentId,
          demandId: demand._id,
          amount: amountNum,
          mode,
          status: "SUCCESS",
          transactionId: paymentId,
          idempotencyKey: `rzp_${paymentId}`,
          gateway: "RAZORPAY",
          paymentDetails: {
            orderId,
            signatureDigest: hashPayload({ signature }),
            method: String(gatewayPayment?.method || ""),
          },
          paidAt: new Date(),
          createdBy: "STUDENT",
          verifiedBy: req.userId || null,
        }],
        { session }
      );

      demand.paidAmount = round2(Number(demand.paidAmount || 0) + amountNum);
      applyBreakdownPayment(demand.breakdown, amountNum);
      recalcDemand(demand);
      await demand.save({ session });
      await applyFeeProfilePaymentDelta({
        session,
        studentMongoId: demand.studentMongoId,
        deltaAmount: amountNum,
      });

      output = created[0];
      auditMeta = {
        action: "FEE_RAZORPAY_PAYMENT_VERIFIED",
        entityType: "FeePaymentHistory",
        entityId: output?._id,
        metadata: {
          demandId: String(demand._id),
          amount: amountNum,
          mode,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        },
      };
    });

    if (auditMeta?.entityId) await logFeeAudit(req, auditMeta);
    return res.status(200).json({ message: "Razorpay payment verified and recorded", data: output });
  } catch (error) {
    if (error.message === "DEMAND_NOT_FOUND") return res.status(404).json({ message: "Fee demand not found" });
    if (error.message === "FORBIDDEN_DEMAND") return res.status(403).json({ message: "You can only verify your own fee demand" });
    if (error.message === "AMOUNT_EXCEEDS_DUE") return res.status(400).json({ message: "Payment amount exceeds due amount" });
    const status = Number(error?.statusCode || 0);
    if (status >= 400 && status < 500) {
      return res.status(status).json({ message: sanitizeError(error) });
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Duplicate Razorpay payment" });
    return res.status(500).json({ message: sanitizeError(error) });
  } finally {
    session.endSession();
  }
};

export const handleRazorpayWebhook = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const signature = String(req.headers["x-razorpay-signature"] || "").trim();
    const rawBody = String(req.rawBody || "");
    if (!signature || !rawBody) {
      return res.status(400).json({ message: "Webhook signature/body missing" });
    }
    if (!verifyRazorpayWebhookSignature({ rawBody, signature })) {
      return res.status(401).json({ message: "Invalid Razorpay webhook signature" });
    }

    const event = String(req.body?.event || "").trim();
    if (event !== "payment.captured") {
      return res.status(200).json({ message: "Webhook ignored" });
    }

    const paymentEntity = req.body?.payload?.payment?.entity || {};
    const paymentId = String(paymentEntity?.id || "").trim();
    const orderId = String(paymentEntity?.order_id || "").trim();
    const demandId = String(paymentEntity?.notes?.demandId || "").trim();
    const gatewayStatus = String(paymentEntity?.status || "").toLowerCase();
    const mode = mapRazorpayMethodToMode(paymentEntity?.method);
    const amountNum = round2(Number(paymentEntity?.amount || 0) / 100);

    if (!paymentId || !demandId || !isValidId(demandId) || !mode || gatewayStatus !== "captured" || amountNum <= 0) {
      return res.status(200).json({ message: "Webhook accepted (insufficient payload for settlement)" });
    }

    let created = null;
    await session.withTransaction(async () => {
      const existing = await PaymentHistory.findOne({ transactionId: paymentId }).session(session);
      if (existing) {
        created = existing;
        return;
      }

      const demand = await FeeDemand.findById(demandId).session(session);
      if (!demand) return;
      if (amountNum > Number(demand.dueAmount || 0)) return;

      const inserted = await PaymentHistory.create(
        [{
          studentId: demand.studentId,
          demandId: demand._id,
          amount: amountNum,
          mode,
          status: "SUCCESS",
          transactionId: paymentId,
          idempotencyKey: `rzp_wh_${paymentId}`,
          gateway: "RAZORPAY",
          paymentDetails: {
            orderId,
            source: "webhook",
            method: String(paymentEntity?.method || ""),
          },
          paidAt: new Date(),
          createdBy: "SYSTEM",
          verifiedBy: null,
        }],
        { session }
      );

      demand.paidAmount = round2(Number(demand.paidAmount || 0) + amountNum);
      applyBreakdownPayment(demand.breakdown, amountNum);
      recalcDemand(demand);
      await demand.save({ session });
      await applyFeeProfilePaymentDelta({
        session,
        studentMongoId: demand.studentMongoId,
        deltaAmount: amountNum,
      });
      created = inserted[0];
    });

    if (created?._id) {
      await FeeAuditLog.create({
        actorUserId: null,
        actorRole: "system",
        action: "FEE_RAZORPAY_WEBHOOK_CAPTURED",
        entityType: "FeePaymentHistory",
        entityId: String(created._id),
        metadata: {
          paymentId,
          demandId,
          amount: amountNum,
          hash: hashPayload({ paymentId, demandId, amountNum }),
        },
        ip: getClientIp(req),
        userAgent: sanitizeText(req.headers["user-agent"], 512),
      });
    }

    return res.status(200).json({ message: "Webhook processed" });
  } catch {
    return res.status(400).json({ message: "Invalid Razorpay webhook payload" });
  } finally {
    session.endSession();
  }
};

/* ================= ADMIN V2 STUBS (BULK/REPORTS/ANALYTICS/CALENDAR) ================= */
const respondNotImplemented = (res, feature) =>
  res.status(501).json({
    message: `${feature} is not implemented yet`,
    data: null,
  });

export const getFeeBulkTemplate = async (req, res) =>
  respondNotImplemented(res, "Fee bulk template API");

export const uploadFeeBulkFile = async (req, res) =>
  respondNotImplemented(res, "Fee bulk upload API");

export const getFeeBulkJobs = async (req, res) =>
  respondNotImplemented(res, "Fee bulk jobs list API");

export const getFeeBulkJobById = async (req, res) =>
  respondNotImplemented(res, "Fee bulk job details API");

export const retryFeeBulkJob = async (req, res) =>
  respondNotImplemented(res, "Fee bulk retry API");

export const createFeeReportExport = async (req, res) =>
  respondNotImplemented(res, "Fee report export create API");

export const getFeeReportExports = async (req, res) =>
  respondNotImplemented(res, "Fee report exports list API");

export const getFeeReportExportById = async (req, res) =>
  respondNotImplemented(res, "Fee report export details API");

export const downloadFeeReportExport = async (req, res) =>
  respondNotImplemented(res, "Fee report export download API");

export const shareFeeReportExport = async (req, res) =>
  respondNotImplemented(res, "Fee report export share API");

export const getFinancialSummary = async (req, res) =>
  respondNotImplemented(res, "Financial summary analytics API");

export const getFinancialProgramBreakup = async (req, res) =>
  respondNotImplemented(res, "Financial program breakup analytics API");

export const getFinancialCashflow = async (req, res) =>
  respondNotImplemented(res, "Financial cashflow analytics API");

export const getStudentAnalyticsOverview = async (req, res) =>
  respondNotImplemented(res, "Student analytics overview API");

export const getStudentStatusDistribution = async (req, res) =>
  respondNotImplemented(res, "Student status distribution API");

export const getStudentSegments = async (req, res) =>
  respondNotImplemented(res, "Student segments analytics API");

export const getStudentAnalyticsList = async (req, res) =>
  respondNotImplemented(res, "Student analytics list API");

export const createFeeCalendarEvent = async (req, res) =>
  respondNotImplemented(res, "Fee calendar create API");

export const getFeeCalendarEvents = async (req, res) =>
  respondNotImplemented(res, "Fee calendar list API");

export const updateFeeCalendarEvent = async (req, res) =>
  respondNotImplemented(res, "Fee calendar update API");

export const deleteFeeCalendarEvent = async (req, res) =>
  respondNotImplemented(res, "Fee calendar delete API");

export const signFeePaymentRequest = async (req, res) =>
  respondNotImplemented(res, "Fee payment sign API");
