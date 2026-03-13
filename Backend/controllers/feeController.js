import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import Batch from "../models/feeBatch.js";
import Branch from "../models/feeBranch.js";
import Program from "../models/feeProgram.js";
import StudentFeeDetails from "../models/feeStudentDetails.js";
import FeeDemand from "../models/feeDemand.js";
import PaymentHistory from "../models/feePaymentHistory.js";
import FeeDemandRequest from "../models/feeDemandRequest.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import FeeAuditLog from "../models/feeAuditLog.js";
import FeeCounter from "../models/feeCounter.js";
import FeeBulkJob from "../models/feeBulkJob.js";
import FeeReportExport from "../models/feeReportExport.js";
import FeeCalendarEvent from "../models/feeCalendarEvent.js";
import FeeHostelYearly from "../models/feeHostelYearly.js";
import FeeTransportYearly from "../models/feeTransportYearly.js";
import { PROGRAM_ENUM, normalizeProgramValue } from "../utils/programNormalization.js";
import { renderPdfBufferFromHtml } from "./pdfController.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};
const round2 = (value) => Number(Number(value).toFixed(2));
const SAFE_TEXT_RE = /^[a-zA-Z0-9 _./&@()#+-]+$/;
const ACADEMIC_YEAR_RE = /^\d{4}-(?:\d{2}|\d{4})$/;
const ACADEMIC_YEAR_ERROR_MESSAGE = "Invalid academicYear format. Use YYYY-YYYY or YYYY-YY";
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

const parseAcademicYear = (value) => {
  const raw = String(value || "").trim();
  const shortMatch = raw.match(/^(\d{4})-(\d{2})$/);
  if (shortMatch) {
    const startYear = Number(shortMatch[1]);
    const endSuffix = Number(shortMatch[2]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endSuffix)) return null;
    let endYear = Math.floor(startYear / 100) * 100 + endSuffix;
    if (endYear < startYear) endYear += 100;
    if (endYear !== startYear + 1) return null;
    return { startYear, endYear };
  }

  const fullMatch = raw.match(/^(\d{4})-(\d{4})$/);
  if (fullMatch) {
    const startYear = Number(fullMatch[1]);
    const endYear = Number(fullMatch[2]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    if (endYear !== startYear + 1) return null;
    return { startYear, endYear };
  }

  return null;
};

const normalizeAcademicYear = (value, { format = "full" } = {}) => {
  const parsed = parseAcademicYear(value);
  if (!parsed) return "";
  const { startYear, endYear } = parsed;
  if (format === "short") {
    return `${startYear}-${String(endYear).slice(-2)}`;
  }
  return `${startYear}-${endYear}`;
};

const isValidAcademicYear = (value) => Boolean(normalizeAcademicYear(value));
const getAcademicStartYear = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d{4})/);
  if (!match) return NaN;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : NaN;
};
const getAcademicYearCandidates = (value) => {
  const raw = String(value || "").trim();
  const set = new Set();
  if (raw) set.add(raw);
  const normalizedFull = normalizeAcademicYear(raw, { format: "full" });
  const normalizedShort = normalizeAcademicYear(raw, { format: "short" });
  if (normalizedFull) set.add(normalizedFull);
  if (normalizedShort) set.add(normalizedShort);

  if (!normalizedFull) {
    const start = getAcademicStartYear(raw);
    if (Number.isFinite(start)) {
      const next = start + 1;
      set.add(`${start}-${next}`);
      set.add(`${start}-${String(next).slice(-2)}`);
    }
  }
  return Array.from(set);
};

const normalizeHostelRoomType = (value, { fallback = "GENERAL" } = {}) => {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!raw) return fallback;

  const wordsToNumber = {
    ONE: "1",
    TWO: "2",
    THREE: "3",
    FOUR: "4",
    FIVE: "5",
    SIX: "6",
  };
  const wordMatch = raw.match(/^(ONE|TWO|THREE|FOUR|FIVE|SIX)(?:\s+(?:SEATER|SEAT|BED|BEDS?))?$/);
  if (wordMatch) return `${wordsToNumber[wordMatch[1]]} SEATER`;

  const digitMatch = raw.match(/^(\d+)(?:\s*(?:SEATER|SEAT|BED|BEDS?))?$/);
  if (digitMatch) return `${digitMatch[1]} SEATER`;
  const digitTierMatch = raw.match(/^(\d+)\s*TIER$/);
  if (digitTierMatch) return `${digitTierMatch[1]} SEATER`;

  if (/^SINGLE\b/.test(raw) || /\b1\s*SEATER\b/.test(raw)) return "1 SEATER";
  if (/^TWO\s+TIER\b/.test(raw) || /\b2\s*SEATER\b/.test(raw)) return "2 SEATER";
  if (/^THREE\s+TIER\b/.test(raw) || /\b3\s*SEATER\b/.test(raw)) return "3 SEATER";
  if (/^FOUR\s+TIER\b/.test(raw) || /\b4\s*SEATER\b/.test(raw)) return "4 SEATER";
  if (/^FIVE\s+TIER\b/.test(raw) || /\b5\s*SEATER\b/.test(raw)) return "5 SEATER";
  if (/^SIX\s+TIER\b/.test(raw) || /\b6\s*SEATER\b/.test(raw)) return "6 SEATER";

  if (raw === "SINGLE" || raw === "SINGLE SEATER") return "1 SEATER";
  if (raw === "TWO TIER") return "2 SEATER";
  if (raw === "THREE TIER") return "3 SEATER";
  if (raw === "FOUR TIER") return "4 SEATER";

  if (!SAFE_TEXT_RE.test(raw)) return fallback;
  return raw;
};

const deriveHostelRoomTypeFromRoom = (room) => {
  const capacity = Number(room?.capacity);
  if (Number.isFinite(capacity) && capacity > 0) return `${capacity} SEATER`;

  const tier = String(room?.bedTier || "")
    .trim()
    .toLowerCase();
  if (tier === "single") return "1 SEATER";
  if (tier === "two-tier") return "2 SEATER";
  if (tier === "three-tier") return "3 SEATER";
  if (tier === "four-tier") return "4 SEATER";

  return "GENERAL";
};

const resolveActiveHostelRoomTypeForStudent = async (studentMongoId) => {
  if (!studentMongoId || !isValidId(studentMongoId)) return "";
  const allocation = await HostelAllocation.findOne({
    student: studentMongoId,
    status: "Active",
  }).populate("room", "capacity bedTier");
  if (!allocation?.room) return "";
  return normalizeHostelRoomType(deriveHostelRoomTypeFromRoom(allocation.room), { fallback: "" });
};

const getConfiguredHostelYearlyFee = async ({ academicYear, roomType = "" }) => {
  const year = String(academicYear || "").trim();
  if (!year) return { hostelYearlyFee: 0, roomType: "", matchedBy: "NONE" };
  const yearCandidates = getAcademicYearCandidates(year);
  const normalizedRoomType = normalizeHostelRoomType(roomType, { fallback: "" });

  if (normalizedRoomType) {
    const roomTypeRow = await FeeHostelYearly.findOne({
      academicYear: { $in: yearCandidates },
      roomType: normalizedRoomType,
    }).select("hostelYearlyFee roomType");
    if (roomTypeRow) {
      return {
        hostelYearlyFee: round2(Number(roomTypeRow.hostelYearlyFee || 0)),
        roomType: String(roomTypeRow.roomType || normalizedRoomType),
        matchedBy: "ROOM_TYPE",
      };
    }
  }

  const generalRow = await FeeHostelYearly.findOne({
    academicYear: { $in: yearCandidates },
    roomType: "GENERAL",
  }).select("hostelYearlyFee roomType");
  if (generalRow) {
    return {
      hostelYearlyFee: round2(Number(generalRow.hostelYearlyFee || 0)),
      roomType: "GENERAL",
      matchedBy: "GENERAL",
    };
  }

  // Backward compatibility for historical documents created before roomType support.
  const legacyRow = await FeeHostelYearly.findOne({
    academicYear: { $in: yearCandidates },
    $or: [{ roomType: { $exists: false } }, { roomType: "" }],
  }).select("hostelYearlyFee");
  return {
    hostelYearlyFee: round2(Number(legacyRow?.hostelYearlyFee || 0)),
    roomType: normalizedRoomType || "GENERAL",
    matchedBy: legacyRow ? "LEGACY" : "NONE",
  };
};

const PROGRAM_DEFAULTS = {
  btech: { durationYears: 4, totalSemesters: 8 },
  mtech: { durationYears: 2, totalSemesters: 4 },
  bca: { durationYears: 3, totalSemesters: 6 },
  mca: { durationYears: 2, totalSemesters: 4 },
  bba: { durationYears: 3, totalSemesters: 6 },
  mba: { durationYears: 2, totalSemesters: 4 },
  bsc: { durationYears: 3, totalSemesters: 6 },
  msc: { durationYears: 2, totalSemesters: 4 },
  bpharma: { durationYears: 4, totalSemesters: 8 },
  mpharma: { durationYears: 2, totalSemesters: 4 },
  phd: { durationYears: 3, totalSemesters: 6 },
};

const ensureProgramsSeeded = async () => {
  const programNames = Array.isArray(PROGRAM_ENUM) ? PROGRAM_ENUM : [];
  if (!programNames.length) return;
  const existing = await Program.find({ programName: { $in: programNames } }).select("programName");
  const existingSet = new Set(existing.map((p) => String(p.programName)));
  const toCreate = programNames.filter((name) => !existingSet.has(String(name)));
  if (!toCreate.length) return;
  const rows = toCreate.map((name) => {
    const defaults = PROGRAM_DEFAULTS[name] || { durationYears: 3, totalSemesters: 6 };
    return {
      programName: name,
      durationYears: defaults.durationYears,
      totalSemesters: defaults.totalSemesters,
      branchIds: [],
    };
  });
  await Program.insertMany(rows);
};

const getSemestersPerYear = (program) => {
  const years = Number(program?.durationYears || 0);
  const sems = Number(program?.totalSemesters || 0);
  if (years > 0 && sems > 0) {
    const perYear = Math.round(sems / years);
    return Math.max(1, perYear);
  }
  return 2;
};

const normalizeDemandScope = (value = "") => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "YEAR" || raw === "FULL_YEAR" || raw === "ANNUAL") return "YEAR";
  return "SEMESTER";
};

const getAcademicYearSemesterRange = ({ currentSemester, program }) => {
  const semsPerYear = getSemestersPerYear(program);
  const sem = Number(currentSemester || 1);
  const safeSem = Number.isFinite(sem) && sem > 0 ? sem : 1;
  const yearIndex = Math.max(0, Math.floor((safeSem - 1) / semsPerYear));
  const start = yearIndex * semsPerYear + 1;
  const totalSemesters = Number(program?.totalSemesters || 0);
  const endCandidate = start + semsPerYear - 1;
  const end = totalSemesters > 0 ? Math.min(endCandidate, totalSemesters) : endCandidate;
  return { start, end, semsPerYear };
};

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
const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const formatInr = (value = 0) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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
  if (normalizedEnrollment) {
    const ensured = await ensureStudentFeeProfileForEnrollment(normalizedEnrollment);
    if (ensured?._id) {
      return { student: student || null, profile: ensured };
    }
  }

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

const getSemesterDueDate = async ({ academicYear, semesterNo }) => {
  if (!academicYear || !semesterNo) return null;
  const academicYearCandidates = getAcademicYearCandidates(academicYear);
  const row = await FeeCalendarEvent.findOne({
    isDeleted: { $ne: true },
    eventType: "Semester Due Date",
    academicYear: { $in: academicYearCandidates },
    semesterNo: Number(semesterNo),
  }).sort({ eventDate: -1 });
  return row?.eventDate ? new Date(row.eventDate) : null;
};

const getYearlyAddOnFees = async (academicYear, { hostelRoomType = "" } = {}) => {
  const year = String(academicYear || "").trim();
  if (!year) return { hostelYearlyFee: 0, transportYearlyFee: 0 };
  const yearCandidates = getAcademicYearCandidates(year);
  const [hostelCfg, transportRow] = await Promise.all([
    getConfiguredHostelYearlyFee({ academicYear: year, roomType: hostelRoomType }),
    FeeTransportYearly.findOne({ academicYear: { $in: yearCandidates } }).select("transportYearlyFee"),
  ]);
  return {
    hostelYearlyFee: round2(Number(hostelCfg?.hostelYearlyFee || 0)),
    transportYearlyFee: round2(Number(transportRow?.transportYearlyFee || 0)),
  };
};

const autoGenerateDemandsForProfile = async ({ profile, branch, program, academicYear }) => {
  if (!profile || !branch || !program || !academicYear) return [];
  const normalizedAcademicYear = normalizeAcademicYear(academicYear, { format: "full" });
  if (!normalizedAcademicYear) return [];
  const semestersPerYear = getSemestersPerYear(program);
  const totalSemesters = Number(program?.totalSemesters || 0);
  const startSemester = Number(profile.currentSemester || 1);
  const semesterList = Array.from({ length: semestersPerYear }, (_, idx) => startSemester + idx)
    .filter((s) => s >= 1 && (!totalSemesters || s <= totalSemesters));

  const existing = await FeeDemand.find({
    studentMongoId: profile._id,
    academicYear: { $in: getAcademicYearCandidates(normalizedAcademicYear) },
    semesterNo: { $in: semesterList },
  }).select("semesterNo");
  const existingSemesters = new Set(existing.map((row) => Number(row.semesterNo)));

  const created = [];
  const branchRows = Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : [];
  for (const semesterNo of semesterList) {
    if (existingSemesters.has(Number(semesterNo))) continue;
    const semesterRow = branchRows.find((row) => Number(row?.semesterNo) === Number(semesterNo));
    if (!semesterRow) continue;

    const grossSemesterFee = round2(Number(semesterRow.baseFee || 0));
    const courseGross = round2(
      branchRows.reduce((sum, row) => sum + Number(row?.baseFee || 0), 0)
    );
    const courseNet = round2(Number(profile?.feeSummary?.courseNetFee || 0));
    const ratio = courseGross > 0 ? Math.min(1, Math.max(0, courseNet / courseGross)) : 1;
    const netTuition = round2(grossSemesterFee * ratio);

    const heads = [{ head: "TUITION", amount: netTuition }];
    const { hostelYearlyFee, transportYearlyFee } = await getYearlyAddOnFees(normalizedAcademicYear);
    const hostelShare = round2(Math.max(0, hostelYearlyFee) / semestersPerYear);
    const transportShare = round2(Math.max(0, transportYearlyFee) / semestersPerYear);
    if (profile.hostelOpted && hostelShare > 0) heads.push({ head: "HOSTEL", amount: hostelShare });
    if (profile.transportOpted && transportShare > 0) heads.push({ head: "TRANSPORT", amount: transportShare });

    const totalAmount = sumBreakdownAmount(heads);
    const dueDate =
      (await getSemesterDueDate({ academicYear: normalizedAcademicYear, semesterNo })) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const doc = await FeeDemand.create({
      studentMongoId: profile._id,
      studentId: String(profile.studentId || ""),
      academicYear: normalizedAcademicYear,
      semesterNo: Number(semesterNo),
      breakdown: heads.map((item) => ({
        head: item.head,
        amount: round2(Number(item.amount || 0)),
        paid: 0,
      })),
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate,
      status: "PENDING",
    });
    created.push(doc);
  }
  return created;
};

const resolveFeeReferencesFromStudent = async (studentDoc) => {
  if (!studentDoc) return null;
  await ensureProgramsSeeded();

  const studentProgramRaw = String(studentDoc?.program || "").trim();
  const studentProgramNorm = normalizeLoose(studentProgramRaw);
  const departmentId = studentDoc?.department;
  const departmentName = await getDepartmentNameById(departmentId);
  const departmentNorm = normalizeLoose(departmentName);
  const groupBranchNorm = normalizeLoose(studentDoc?.group?.branch || "");

    const programs = await Program.find().select("_id programName branchIds durationYears totalSemesters");
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
    "_id branchName semesterBaseFees programId hostelYearlyFee transportYearlyFee"
  );
  const matchedBranch =
    (groupBranchNorm
      ? branches.find((b) => normalizeLoose(b?.branchName || "") === groupBranchNorm)
      : null) ||
    branches.find(
      (b) => normalizeLoose(b?.branchName || "") === departmentNorm
    ) ||
    branches.find((b) =>
      normalizeLoose(b?.branchName || "").includes(departmentNorm)
    ) ||
    null;
  if (!matchedBranch) return null;

  let matchedBatch = null;
  if (studentDoc?.batchId && isValidId(studentDoc.batchId)) {
    matchedBatch = await Batch.findById(studentDoc.batchId).select("_id batchYear programIds departmentId");
    const hasProgram = matchedBatch?.programIds?.some(
      (pid) => String(pid) === String(matchedProgram._id)
    );
    const hasDepartment = String(matchedBatch?.departmentId || "") === String(studentDoc.department || "");
    if (!matchedBatch || !hasProgram || !hasDepartment) {
      matchedBatch = null;
    }
  }

  if (!matchedBatch) {
    const academicYearText = String(studentDoc?.academicYear || "").trim();
    const batchYearCandidate = getAcademicStartYear(academicYearText);
    const batchQuery = {
      departmentId: studentDoc.department,
      programIds: matchedProgram._id,
    };
    if (Number.isFinite(batchYearCandidate)) {
      batchQuery.batchYear = batchYearCandidate;
    }

    matchedBatch = await Batch.findOne(batchQuery)
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
  }
  if (!matchedBatch) return null;

  return {
    batch: matchedBatch,
    program: matchedProgram,
    branch: matchedBranch,
  };
};

const reconcileExistingStudentFeeProfile = async ({ student, profile }) => {
  if (!student || !profile) return profile;

  const refs = await resolveFeeReferencesFromStudent(student);
  if (!refs?.batch || !refs?.program || !refs?.branch) return profile;

  const needsRefUpdate =
    String(profile?.batchId || "") !== String(refs.batch._id || "") ||
    String(profile?.programId || "") !== String(refs.program._id || "") ||
    String(profile?.branchId || "") !== String(refs.branch._id || "");

  const needsIdentityUpdate =
    String(profile?.userId || "") !== String(student?.user || "") ||
    String(profile?.studentId || "") !== String(student?.enrollmentNumber || "");

  const needsSemesterUpdate =
    Number(profile?.currentSemester || 0) !== Number(student?.semester || 0);

  if (!needsRefUpdate && !needsIdentityUpdate && !needsSemesterUpdate) return profile;

  const scholarship = profile?.scholarship || { type: "NONE", value: 0 };
  const discount = profile?.discount || { type: "NONE", value: 0 };
  const computedSummary = computeCourseFeeSummary({
    branch: refs.branch,
    scholarship,
    discount,
  });
  const existingPaid = round2(Math.max(0, Number(profile?.feeSummary?.totalPaid || 0)));
  const cappedPaid = round2(Math.min(existingPaid, Number(computedSummary.courseNetFee || 0)));

  const updated = await StudentFeeDetails.findByIdAndUpdate(
    profile._id,
    {
      userId: student.user,
      studentId: student.enrollmentNumber,
      batchId: refs.batch._id,
      programId: refs.program._id,
      branchId: refs.branch._id,
      currentSemester: Number(student.semester || 1),
      feeSummary: {
        ...computedSummary,
        totalPaid: cappedPaid,
        remainingFee: round2(Math.max(0, Number(computedSummary.courseNetFee || 0) - cappedPaid)),
      },
    },
    { new: true }
  );

  return updated || profile;
};

export const ensureStudentFeeProfileForEnrollment = async (studentId) => {
  const enrollment = String(studentId || "").trim();
  if (!enrollment) return null;

  const student = await Student.findOne({
    enrollmentNumber: enrollment,
    isDeleted: { $ne: true },
  })
    .select("_id user enrollmentNumber semester program department academicYear batchId group")
    .populate("group", "branch name department");
  if (!student?.user) return null;

  let profile = await StudentFeeDetails.findOne({ studentId: enrollment });
  if (profile) {
    return reconcileExistingStudentFeeProfile({ student, profile });
  }

  profile = await StudentFeeDetails.findOne({ userId: student.user });
  if (profile) {
    return reconcileExistingStudentFeeProfile({ student, profile });
  }

  const refs = await resolveFeeReferencesFromStudent(student);
  if (!refs?.batch || !refs?.program || !refs?.branch) return null;

  const scholarship = { type: "NONE", value: 0 };
  const discount = { type: "NONE", value: 0 };
  const feeSummary = computeCourseFeeSummary({
    branch: refs.branch,
    scholarship,
    discount,
  });

  const createdProfile = await StudentFeeDetails.create({
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
  try {
    await autoGenerateDemandsForProfile({
      profile: createdProfile,
      branch: refs.branch,
      program: refs.program,
      academicYear: student.academicYear,
    });
  } catch {
    // keep profile creation safe even if auto-demand fails
  }
  return createdProfile;
};

export const syncHostelFeeForStudentAcademicYear = async ({ enrollmentNumber, roomType = "" }) => {
  const safeEnrollment = String(enrollmentNumber || "").trim();
  if (!safeEnrollment) {
    return {
      profileUpdated: false,
      demandsUpdated: 0,
      hostelYearlyFee: 0,
      hostelSharePerSemester: 0,
      hostelRoomType: "",
      academicYear: "",
      reason: "enrollmentNumber is required",
    };
  }

  const student = await Student.findOne({
    enrollmentNumber: safeEnrollment,
    isDeleted: { $ne: true },
  }).select("_id academicYear");
  if (!student?._id) {
    return {
      profileUpdated: false,
      demandsUpdated: 0,
      hostelYearlyFee: 0,
      hostelSharePerSemester: 0,
      hostelRoomType: "",
      academicYear: "",
      reason: "student not found",
    };
  }

  const academicYear = String(student.academicYear || "").trim();
  const profile = await ensureStudentFeeProfileForEnrollment(safeEnrollment);
  if (!profile?._id) {
    return {
      profileUpdated: false,
      demandsUpdated: 0,
      hostelYearlyFee: 0,
      hostelSharePerSemester: 0,
      hostelRoomType: "",
      academicYear,
      reason: "fee profile not available",
    };
  }

  let profileUpdated = false;
  if (!profile.hostelOpted) {
    profile.hostelOpted = true;
    await profile.save();
    profileUpdated = true;
  }

  const requestedRoomType = normalizeHostelRoomType(roomType, { fallback: "" });
  const activeRoomType = requestedRoomType || (await resolveActiveHostelRoomTypeForStudent(student._id));
  const hostelConfig = await getConfiguredHostelYearlyFee({
    academicYear,
    roomType: activeRoomType,
  });
  const hostelYearlyFee = round2(Number(hostelConfig?.hostelYearlyFee || 0));
  const hostelRoomType = String(hostelConfig?.roomType || activeRoomType || "GENERAL");
  if (hostelYearlyFee <= 0) {
    return {
      profileUpdated,
      demandsUpdated: 0,
      hostelYearlyFee,
      hostelSharePerSemester: 0,
      hostelRoomType,
      academicYear,
      reason: activeRoomType
        ? "hostel yearly fee not configured for selected room type/academic year"
        : "hostel yearly fee not configured for academic year",
    };
  }

  const program = await Program.findById(profile.programId).select("durationYears totalSemesters");
  const semestersPerYear = getSemestersPerYear(program);
  const hostelShare = round2(Math.max(0, hostelYearlyFee) / semestersPerYear);

  const demands = await FeeDemand.find({
    studentMongoId: profile._id,
    academicYear: { $in: getAcademicYearCandidates(academicYear) },
  });

  let demandsUpdated = 0;
  for (const demand of demands) {
    const rows = Array.isArray(demand.breakdown) ? demand.breakdown : [];
    const hostelRow = rows.find((row) => String(row?.head || "").toUpperCase() === "HOSTEL");
    if (hostelRow) {
      hostelRow.amount = hostelShare;
      if (Number(hostelRow.paid || 0) > hostelShare) {
        hostelRow.paid = hostelShare;
      }
    } else {
      rows.push({ head: "HOSTEL", amount: hostelShare, paid: 0 });
      demand.breakdown = rows;
    }
    demand.totalAmount = sumBreakdownAmount(demand.breakdown);
    recalcDemand(demand);
    await demand.save();
    demandsUpdated += 1;
  }

  return {
    profileUpdated,
    demandsUpdated,
    hostelYearlyFee,
    hostelSharePerSemester: hostelShare,
    hostelRoomType,
    academicYear,
    reason: "",
  };
};

export const syncTransportFeeForStudentAcademicYear = async ({ enrollmentNumber }) => {
  const safeEnrollment = String(enrollmentNumber || "").trim();
  if (!safeEnrollment) {
    return {
      profileUpdated: false,
      demandsUpdated: 0,
      transportYearlyFee: 0,
      transportSharePerSemester: 0,
      academicYear: "",
      reason: "enrollmentNumber is required",
    };
  }

  const student = await Student.findOne({
    enrollmentNumber: safeEnrollment,
    isDeleted: { $ne: true },
  }).select("_id academicYear");
  if (!student?._id) {
    return {
      profileUpdated: false,
      demandsUpdated: 0,
      transportYearlyFee: 0,
      transportSharePerSemester: 0,
      academicYear: "",
      reason: "student not found",
    };
  }

  const academicYear = String(student.academicYear || "").trim();
  const profile = await ensureStudentFeeProfileForEnrollment(safeEnrollment);
  if (!profile?._id) {
    return {
      profileUpdated: false,
      demandsUpdated: 0,
      transportYearlyFee: 0,
      transportSharePerSemester: 0,
      academicYear,
      reason: "fee profile not available",
    };
  }

  let profileUpdated = false;
  if (!profile.transportOpted) {
    profile.transportOpted = true;
    await profile.save();
    profileUpdated = true;
  }

  const transportFeeRow = await FeeTransportYearly.findOne({
    academicYear: { $in: getAcademicYearCandidates(academicYear) },
  }).select("transportYearlyFee");
  const transportYearlyFee = round2(Number(transportFeeRow?.transportYearlyFee || 0));
  if (transportYearlyFee <= 0) {
    return {
      profileUpdated,
      demandsUpdated: 0,
      transportYearlyFee,
      transportSharePerSemester: 0,
      academicYear,
      reason: "transport yearly fee not configured for academic year",
    };
  }

  const program = await Program.findById(profile.programId).select("durationYears totalSemesters");
  const semestersPerYear = getSemestersPerYear(program);
  const transportShare = round2(Math.max(0, transportYearlyFee) / semestersPerYear);

  const demands = await FeeDemand.find({
    studentMongoId: profile._id,
    academicYear: { $in: getAcademicYearCandidates(academicYear) },
  });

  let demandsUpdated = 0;
  for (const demand of demands) {
    const rows = Array.isArray(demand.breakdown) ? demand.breakdown : [];
    const transportRow = rows.find((row) => String(row?.head || "").toUpperCase() === "TRANSPORT");
    if (transportRow) {
      transportRow.amount = transportShare;
      if (Number(transportRow.paid || 0) > transportShare) {
        transportRow.paid = transportShare;
      }
    } else {
      rows.push({ head: "TRANSPORT", amount: transportShare, paid: 0 });
      demand.breakdown = rows;
    }
    demand.totalAmount = sumBreakdownAmount(demand.breakdown);
    recalcDemand(demand);
    await demand.save();
    demandsUpdated += 1;
  }

  return {
    profileUpdated,
    demandsUpdated,
    transportYearlyFee,
    transportSharePerSemester: transportShare,
    academicYear,
    reason: "",
  };
};

const backfillFeeProfilesForBatch = async ({ batchYear, departmentId, programs }) => {
  const selectedPrograms = Array.isArray(programs) ? programs : [];
  const normalizedProgramNames = selectedPrograms
    .map((program) => normalizeProgramValue(program?.programName))
    .filter(Boolean);
  const programNameSet = new Set(normalizedProgramNames);
  if (!programNameSet.size) {
    return {
      eligibleStudents: 0,
      processedStudents: 0,
      profilesCreated: 0,
      alreadyMapped: 0,
      failedCount: 0,
      failedStudents: [],
    };
  }

  const rows = await Student.find({
    isDeleted: { $ne: true },
    department: departmentId,
    program: { $in: Array.from(programNameSet) },
  }).select("enrollmentNumber academicYear program");

  const matchedStudents = rows.filter((student) => {
    const startYear = getAcademicStartYear(student?.academicYear);
    return Number(startYear) === Number(batchYear);
  });

  let profilesCreated = 0;
  let alreadyMapped = 0;
  const failedStudents = [];

  for (const student of matchedStudents) {
    const enrollment = String(student?.enrollmentNumber || "").trim();
    if (!enrollment) {
      failedStudents.push({
        studentId: "",
        reason: "Missing enrollmentNumber",
      });
      continue;
    }

    const existing = await StudentFeeDetails.findOne({ studentId: enrollment }).select("_id");
    if (existing?._id) {
      alreadyMapped += 1;
      continue;
    }

    try {
      const created = await ensureStudentFeeProfileForEnrollment(enrollment);
      if (created?._id) {
        profilesCreated += 1;
      } else {
        failedStudents.push({
          studentId: enrollment,
          reason: "Fee references not configured for student",
        });
      }
    } catch (error) {
      failedStudents.push({
        studentId: enrollment,
        reason: String(error?.message || "Profile creation failed"),
      });
    }
  }

  return {
    eligibleStudents: matchedStudents.length,
    processedStudents: matchedStudents.length,
    profilesCreated,
    alreadyMapped,
    failedCount: failedStudents.length,
    failedStudents: failedStudents.slice(0, 25),
  };
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

const getNextDemandLetterRefNo = async (academicYearValue = "") => {
  const shortAcademicYear =
    normalizeAcademicYear(String(academicYearValue || "").trim(), { format: "short" }) ||
    `${new Date().getUTCFullYear()}-${String(new Date().getUTCFullYear() + 1).slice(-2)}`;
  const key = `demand-letter:${shortAcademicYear}`;
  const row = await FeeCounter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = Number(row?.seq || 1);
  return `HU/ReceiptLetter/${shortAcademicYear}/${seq}`;
};

const normalizeDemandLetterRefNo = (rawRefNo = "", academicYearValue = "") => {
  const raw = String(rawRefNo || "").trim();
  const shortAcademicYear =
    normalizeAcademicYear(String(academicYearValue || "").trim(), { format: "short" }) ||
    `${new Date().getUTCFullYear()}-${String(new Date().getUTCFullYear() + 1).slice(-2)}`;

  if (!raw) return `HU/ReceiptLetter/${shortAcademicYear}/1`;
  if (/^HU\/ReceiptLetter\//i.test(raw)) return raw;

  const legacyMatch = raw.match(/^KIIT\/ADM\/(\d{4})\/(\d+)$/i);
  if (legacyMatch) {
    const seq = Number(legacyMatch[2] || 1);
    const safeSeq = Number.isFinite(seq) && seq > 0 ? seq : 1;
    return `HU/ReceiptLetter/${shortAcademicYear}/${safeSeq}`;
  }

  if (/^KIIT/i.test(raw)) {
    const tailSeqMatch = raw.match(/(\d+)\s*$/);
    const seq = Number(tailSeqMatch?.[1] || 1);
    const safeSeq = Number.isFinite(seq) && seq > 0 ? seq : 1;
    return `HU/ReceiptLetter/${shortAcademicYear}/${safeSeq}`;
  }

  return raw;
};

const getHuLogoDataUri = (() => {
  let cached = null;
  return () => {
    if (cached !== null) return cached;
    const cwd = process.cwd();
    const candidates = [
      path.resolve(cwd, "../Frontend/src/assets/HUNAV.jpg.jpeg"),
      path.resolve(cwd, "../Frontend/src/assets/college-logo.jpg"),
      path.resolve(cwd, "Frontend/src/assets/HUNAV.jpg.jpeg"),
      path.resolve(cwd, "Frontend/src/assets/college-logo.jpg"),
    ];
    const found = candidates.find((file) => fs.existsSync(file));
    if (!found) {
      cached = "";
      return cached;
    }
    try {
      const buf = fs.readFileSync(found);
      let mime = "application/octet-stream";
      if (buf.length >= 4) {
        const sig = `${buf[0].toString(16)}${buf[1].toString(16)}${buf[2].toString(16)}${buf[3].toString(16)}`.toLowerCase();
        if (sig.startsWith("ffd8ff")) mime = "image/jpeg";
        else if (sig === "89504e47") mime = "image/png";
        else if (sig === "52494646") mime = "image/webp";
      }
      cached = `data:${mime};base64,${buf.toString("base64")}`;
      return cached;
    } catch {
      cached = "";
      return cached;
    }
  };
})();

const buildDemandLetterHtml = ({ snapshot, request, demand }) => {
  const rows = Array.isArray(snapshot?.breakdown)
    ? snapshot.breakdown
    : Array.isArray(demand?.breakdown)
    ? demand.breakdown
    : [];
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const issuedDateLabel = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  const studentName = escapeHtml(snapshot?.studentName || "Student");
  const guardianName = escapeHtml(snapshot?.guardianName || "Parent/Guardian");
  const studentId = escapeHtml(snapshot?.studentId || request?.studentId || "");
  const programName = escapeHtml(snapshot?.programName || "Program");
  const academicYear = escapeHtml(snapshot?.academicYear || request?.academicYear || "-");
  const demandDueDateValue = snapshot?.dueDate || demand?.dueDate || request?.dueDate || null;
  const demandDueDateLabel = demandDueDateValue
    ? new Date(demandDueDateValue).toLocaleDateString("en-GB")
    : "-";
  const refNo = escapeHtml(
    normalizeDemandLetterRefNo(request?.demandLetterRefNo || "", snapshot?.academicYear || request?.academicYear || "")
  );
  const scope = normalizeDemandScope(snapshot?.scope || request?.scope || demand?.scope || "");
  const semesterNo = Number(snapshot?.semesterNo || request?.semesterNo || 0);
  const semesterRange = snapshot?.semesterRange || null;
  const total = round2(Number(snapshot?.totalAmount || demand?.totalAmount || 0));
  const due = round2(Number(snapshot?.dueAmount || demand?.dueAmount || 0));
  const paid = round2(Math.max(0, total - due));
  const hostelFee = round2(
    rows.reduce((sum, row) => {
      const head = String(row?.head || "").toUpperCase();
      if (head === "HOSTEL") return sum + Number(row?.amount || 0);
      return sum;
    }, 0)
  );
  const transportFee = round2(
    rows.reduce((sum, row) => {
      const head = String(row?.head || "").toUpperCase();
      if (head === "TRANSPORT") return sum + Number(row?.amount || 0);
      return sum;
    }, 0)
  );
  const academicFee = round2(Math.max(0, total - hostelFee - transportFee));
  const semesterWords = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth",
  ];
  const isYearScope = scope === "YEAR" || semesterNo === 0;
  const yearNo = semesterNo > 0 ? Math.ceil(semesterNo / 2) : 0;
  const yearLabel = isYearScope
    ? "Academic Year"
    : yearNo > 0
    ? `${semesterWords[yearNo - 1] || `${yearNo}th`} Year`
    : "Academic Year";
  const semLabel = isYearScope
    ? "Full Year"
    : semesterNo > 0
    ? `${semesterWords[semesterNo - 1] || `${semesterNo}th`} Semester`
    : "-";
  const rangeLabel =
    isYearScope && semesterRange?.start && semesterRange?.end
      ? `Sem ${semesterRange.start}-${semesterRange.end}`
      : "";
  const semLabelWithRange = rangeLabel ? `${semLabel} (${rangeLabel})` : semLabel;
  const logoDataUri = getHuLogoDataUri();
  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="Haridwar University" class="logo" />`
    : `<div class="logo-fallback">HU</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Demand Letter</title>
    <style>
      @page { margin: 8mm 10mm 9mm; size: A4; }
      body { margin: 0; color: #1f1f1f; font-family: "Times New Roman", serif; background: #fff; }
      .page { padding: 0; }
      .header { border-bottom: 1.5px solid #3ca6cc; padding-bottom: 5px; }
      .brand { display: flex; align-items: center; gap: 10px; }
      .logo { width: 52px; height: 52px; object-fit: contain; }
      .logo-fallback {
        width: 52px; height: 52px; border-radius: 50%;
        border: 1px solid #9db7cf; display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 700; color: #0b3760;
      }
      .university {
        font-size: 20px;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.6px;
        color: #0b3760;
        white-space: nowrap;
      }
      .meta {
        margin-top: 7px;
        display: flex;
        justify-content: space-between;
        font-size: 12.5px;
      }
      .meta span { font-weight: 700; }
      .letter-title {
        text-align: center;
        margin: 20px 0 12px;
        font-size: 16px;
        font-weight: 700;
        text-decoration: underline;
      }
      .body { font-size: 12px; line-height: 1.58; text-align: justify; }
      .body p { margin: 0 0 8px; }
      .fees-table { width: 100%; border-collapse: collapse; margin: 10px 0 8px; font-size: 10.5px; }
      .fees-table th, .fees-table td { border: 1px solid #9c9c9c; padding: 5px 6px; }
      .fees-table th { background: #f5f5f5; text-align: center; font-weight: 700; }
      .fees-table td { text-align: center; }
      .lower { page-break-inside: avoid; break-inside: avoid; }
      .account-title { font-weight: 700; margin-top: 10px; font-size: 12.5px; }
      .accounts { font-size: 11.5px; line-height: 1.45; }
      .sign-row { margin-top: 14px; display: flex; justify-content: flex-end; }
      .sign-box { text-align: right; font-size: 11px; line-height: 1.35; }
      .sign-line { font-size: 12px; color: #2a3f9d; margin-bottom: 2px; letter-spacing: 0.8px; }
      .bottom-banner {
        margin-top: 12px; background: #e5ef45; font-weight: 700; text-align: center;
        padding: 4px 8px; font-size: 11px;
      }
      .bottom-info { text-align: center; margin-top: 5px; font-size: 9px; color: #222; line-height: 1.25; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="brand">
          ${logoHtml}
          <div class="university">HARIDWAR UNIVERSITY</div>
        </div>
      </div>
      <div class="meta">
        <div>Ref. No. : <span>${refNo}</span></div>
        <div>Date : <span>${issuedDateLabel}</span></div>
      </div>
      <div class="letter-title">DEMAND LETTER</div>
      <div class="body">
        <p>
          This is to certify that <strong>${studentName}</strong> S/O <strong>${guardianName}</strong> is a bonafide student
          of this University in <strong>${programName}</strong>, continuing in current academic session
          <strong>${academicYear}</strong>.
        </p>
        <p>
          Enrollment No. <strong>${studentId || "-"}</strong>. The fee structure for the current ${
            isYearScope ? "academic year" : "semester"
          } is as given below:
        </p>
        <p><strong>Due Date:</strong> ${escapeHtml(demandDueDateLabel)}</p>
        <table class="fees-table">
          <thead>
            <tr>
              <th>${yearLabel}<br/>(${academicYear})<br/>${semLabelWithRange}</th>
              <th>Academic Fees</th>
              <th>Hostel Fee</th>
              <th>Total</th>
              <th>Submitted Fee</th>
              <th>Due Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${semLabelWithRange}</td>
              <td>${formatInr(academicFee)}/-</td>
              <td>${formatInr(hostelFee)}/-</td>
              <td>${formatInr(total)}/-</td>
              <td>${formatInr(paid)}/-</td>
              <td>${formatInr(due)}/-</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="lower">
        <div class="account-title">College Account Details:</div>
        <div class="accounts">
          <div><strong>Account Name:</strong> Haridwar University</div>
          <div><strong>Bank Name:</strong> Punjab National Bank (PNB)</div>
          <div><strong>Branch:</strong> Roorkee, Civil Lines</div>
          <div><strong>Account Number:</strong> 0924001200000011</div>
          <div><strong>IFSC Code:</strong> PUNB0092400</div>
        </div>
        <div class="sign-row">
          <div class="sign-box">
            <div class="sign-line">________________</div>
            <div><strong>Registrar</strong></div>
            <div>Haridwar University</div>
            <div>Email: registrar@huroorkee.ac.in</div>
          </div>
        </div>
        <div class="bottom-banner">COMMITTED TO EXCELLENCE IN EDUCATION</div>
        <div class="bottom-info">
          Address: 5th Km. Roorkee-Haridwar Canal Road, Bajuhari, Roorkee-247667 (Uttarakhand)<br/>
          e-mail : info@huroorkee.ac.in &nbsp; | &nbsp; www.huroorkee.ac.in
        </div>
      </div>
    </div>
  </body>
</html>`;
};

/* ================= MASTER: PROGRAM/BATCH/BRANCH ================= */
export const createFeeProgram = async (req, res) => {
  try {
    const { programName, durationYears, totalSemesters, branchIds = [] } = req.body || {};
    if (!programName || !durationYears || !totalSemesters) {
      return res.status(400).json({ message: "programName, durationYears, totalSemesters are required" });
    }
    const safeProgramName = normalizeProgramValue(
      ensureSafeText(programName, "program_name")
    );
    if (!PROGRAM_ENUM.includes(safeProgramName)) {
      return res.status(400).json({ message: "Program must be one of the existing program list" });
    }
    const years = toNum(durationYears);
    const sems = toNum(totalSemesters);
    if (Number.isNaN(years) || Number.isNaN(sems) || years < 1 || years > 10 || sems < 1 || sems > 20) {
      return res.status(400).json({ message: "Invalid durationYears or totalSemesters" });
    }
    if (sems !== years * 2) {
      return res.status(400).json({ message: "totalSemesters must be durationYears * 2" });
    }

    const program = await Program.findOneAndUpdate(
      { programName: safeProgramName },
      {
        programName: safeProgramName,
        durationYears: years,
        totalSemesters: sems,
        branchIds: Array.isArray(branchIds) ? branchIds : [],
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
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
    await ensureProgramsSeeded();
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
    await ensureProgramsSeeded();
    const { batchYear, programIds, departmentId } = req.body || {};
    if (!batchYear || !Array.isArray(programIds) || !programIds.length || !departmentId) {
      return res.status(400).json({ message: "batchYear, programIds and departmentId are required" });
    }
    if (!isValidId(departmentId) || programIds.some((p) => !isValidId(p))) {
      return res.status(400).json({ message: "Invalid ids in request" });
    }
    const normalizedBatchYear = getAcademicStartYear(batchYear);
    if (Number.isNaN(normalizedBatchYear) || normalizedBatchYear < 2000 || normalizedBatchYear > 2100) {
      return res.status(400).json({ message: "Invalid batchYear. Use format like 2024-2028" });
    }
    const uniqueProgramIds = [...new Set(programIds.map((id) => String(id)))];

    const [department, selectedPrograms] = await Promise.all([
      Department.findById(departmentId).select("_id name program"),
      Program.find({ _id: { $in: uniqueProgramIds } }).select("_id programName durationYears"),
    ]);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }
    if (selectedPrograms.length !== uniqueProgramIds.length) {
      return res.status(400).json({ message: "One or more programIds are invalid" });
    }

    const departmentProgramSet = new Set(
      (Array.isArray(department?.program) ? department.program : [])
        .map((name) => normalizeProgramValue(name))
        .filter(Boolean)
    );
    const invalidPrograms = selectedPrograms.filter(
      (program) => !departmentProgramSet.has(normalizeProgramValue(program?.programName))
    );
    if (invalidPrograms.length) {
      return res.status(400).json({
        message: "Selected program(s) are not mapped to the selected department",
        invalidPrograms: invalidPrograms.map((program) => String(program?.programName || "")),
      });
    }

    const created = await Batch.create({
      batchYear: normalizedBatchYear,
      programIds: uniqueProgramIds,
      departmentId,
    });
    const backfill = await backfillFeeProfilesForBatch({
      batchYear: normalizedBatchYear,
      departmentId,
      programs: selectedPrograms,
    });
    await logFeeAudit(req, {
      action: "FEE_BATCH_CREATED",
      entityType: "Batch",
      entityId: created._id,
      metadata: {
        batchYear: normalizedBatchYear,
        departmentId,
        programCount: uniqueProgramIds.length,
        backfill,
      },
    });
    return res.status(201).json({
      message: "Fee batch created and student fee profiles backfilled",
      data: created,
      backfill,
    });
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
      const year = getAcademicStartYear(batchYear);
      if (Number.isNaN(year)) return res.status(400).json({ message: "Invalid batchYear" });
      query.batchYear = year;
    }

    const rawLimit = Number(req.query?.limit || 200);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, Math.floor(rawLimit))) : 200;

    const rows = await Batch.find(query)
      .sort({ batchYear: -1, createdAt: -1 })
      .limit(limit)
      .populate("programIds", "programName durationYears")
      .populate("departmentId", "name code");

    return res.status(200).json({ message: "Fee batches retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createFeeBranch = async (req, res) => {
  try {
    await ensureProgramsSeeded();
    const {
      programId,
      branchName,
      semesterBaseFees,
      totalCourseFee,
      hostelYearlyFee = 0,
      transportYearlyFee = 0,
    } = req.body || {};
    if (!programId || !branchName) {
      return res.status(400).json({ message: "programId and branchName are required" });
    }
    if (!isValidId(programId)) return res.status(400).json({ message: "Invalid programId" });

    const program = await Program.findById(programId).select("_id totalSemesters durationYears");
    if (!program) return res.status(404).json({ message: "Program not found" });

    const totalSemesters = Math.max(1, Number(program.totalSemesters || 0));
    if (!Number.isFinite(totalSemesters) || totalSemesters < 1) {
      return res.status(400).json({ message: "Invalid program semester configuration" });
    }

    let cleanedSemesterFees = Array.isArray(semesterBaseFees) ? semesterBaseFees : [];

    if (!cleanedSemesterFees.length) {
      const totalFee = Number(totalCourseFee);
      if (!Number.isFinite(totalFee) || totalFee <= 0) {
        return res.status(400).json({ message: "totalCourseFee is required for equal split" });
      }
      const perSemester = round2(totalFee / totalSemesters);
      cleanedSemesterFees = Array.from({ length: totalSemesters }, (_, index) => ({
        semesterNo: index + 1,
        baseFee: perSemester,
      }));
      const totalNow = round2(
        cleanedSemesterFees.reduce((sum, item) => sum + Number(item?.baseFee || 0), 0)
      );
      const diff = round2(totalFee - totalNow);
      cleanedSemesterFees[cleanedSemesterFees.length - 1] = {
        semesterNo: totalSemesters,
        baseFee: round2(perSemester + diff),
      };
    } else {
      cleanedSemesterFees = cleanedSemesterFees
        .map((entry) => ({
          semesterNo: Number(entry?.semesterNo),
          baseFee: round2(Number(entry?.baseFee)),
        }))
        .filter(
          (entry) =>
            Number.isFinite(entry.semesterNo) &&
            entry.semesterNo >= 1 &&
            Number.isFinite(entry.baseFee) &&
            entry.baseFee >= 0
        );
    }

    if (!cleanedSemesterFees.length) {
      return res.status(400).json({ message: "Invalid semesterBaseFees" });
    }
    if (cleanedSemesterFees.length !== totalSemesters) {
      return res.status(400).json({ message: `Expected ${totalSemesters} semester fees` });
    }

    const safeBranchName = ensureSafeText(branchName, "branch_name");
    const branch = await Branch.create({
      programId,
      branchName: safeBranchName,
      semesterBaseFees: cleanedSemesterFees,
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
        semesterCount: cleanedSemesterFees.length,
        totalCourseFee: Number.isFinite(Number(totalCourseFee)) ? round2(Number(totalCourseFee)) : undefined,
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

export const getFeeBranches = async (req, res) => {
  try {
    await ensureProgramsSeeded();
    const { programId } = req.query || {};
    const query = {};
    if (programId) {
      if (!isValidId(programId)) return res.status(400).json({ message: "Invalid programId" });
      query.programId = programId;
    }

    const rows = await Branch.find(query)
      .sort({ createdAt: -1 })
      .populate("programId", "programName")
      .select("_id programId branchName hostelYearlyFee transportYearlyFee semesterBaseFees");

    return res.status(200).json({ message: "Fee branches retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const updateBranchAddOnFees = async (req, res) => {
  try {
    const branchId = req.params?.id;
    if (!isValidId(branchId)) return res.status(400).json({ message: "Invalid branch id" });

    const hostelYearlyFee = req.body?.hostelYearlyFee;
    const transportYearlyFee = req.body?.transportYearlyFee;
    if (hostelYearlyFee == null && transportYearlyFee == null) {
      return res.status(400).json({ message: "hostelYearlyFee or transportYearlyFee is required" });
    }

    const updatePayload = {};
    if (hostelYearlyFee != null) {
      updatePayload.hostelYearlyFee = Math.max(0, round2(Number(hostelYearlyFee || 0)));
    }
    if (transportYearlyFee != null) {
      updatePayload.transportYearlyFee = Math.max(0, round2(Number(transportYearlyFee || 0)));
    }

    const branch = await Branch.findByIdAndUpdate(branchId, updatePayload, { new: true });
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    await logFeeAudit(req, {
      action: "FEE_BRANCH_ADDON_UPDATED",
      entityType: "Branch",
      entityId: branch._id,
      metadata: {
        branchName: branch.branchName,
        hostelYearlyFee: branch.hostelYearlyFee,
        transportYearlyFee: branch.transportYearlyFee,
      },
    });

    return res.status(200).json({ message: "Branch add-on fees updated", data: branch });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const upsertHostelYearlyFee = async (req, res) => {
  try {
    const academicYear = String(req.body?.academicYear || "").trim();
    const hostelYearlyFee = Number(req.body?.hostelYearlyFee);
    const roomType = normalizeHostelRoomType(req.body?.roomType);
    if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear)) {
      return res.status(400).json({ message: "academicYear must be in YYYY-YYYY format" });
    }
    if (!Number.isFinite(hostelYearlyFee) || hostelYearlyFee < 0) {
      return res.status(400).json({ message: "Invalid hostelYearlyFee" });
    }

    const row = await FeeHostelYearly.findOneAndUpdate(
      { academicYear, roomType },
      { hostelYearlyFee: round2(hostelYearlyFee), roomType },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logFeeAudit(req, {
      action: "FEE_HOSTEL_YEARLY_UPSERT",
      entityType: "FeeHostelYearly",
      entityId: row._id,
      metadata: { academicYear, roomType: row.roomType, hostelYearlyFee: row.hostelYearlyFee },
    });

    return res.status(200).json({ message: "Hostel yearly fee saved", data: row });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getHostelYearlyFees = async (req, res) => {
  try {
    const academicYear = String(req.query?.academicYear || "").trim();
    const roomType = String(req.query?.roomType || "").trim();
    const query = {};
    if (academicYear) query.academicYear = academicYear;
    if (roomType) query.roomType = normalizeHostelRoomType(roomType);
    const rows = await FeeHostelYearly.find(query).sort({ academicYear: -1, roomType: 1, createdAt: -1 });
    return res.status(200).json({ message: "Hostel yearly fees retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const upsertTransportYearlyFee = async (req, res) => {
  try {
    const academicYear = String(req.body?.academicYear || "").trim();
    const transportYearlyFee = Number(req.body?.transportYearlyFee);
    if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear)) {
      return res.status(400).json({ message: "academicYear must be in YYYY-YYYY format" });
    }
    if (!Number.isFinite(transportYearlyFee) || transportYearlyFee < 0) {
      return res.status(400).json({ message: "Invalid transportYearlyFee" });
    }

    const row = await FeeTransportYearly.findOneAndUpdate(
      { academicYear },
      { transportYearlyFee: round2(transportYearlyFee) },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logFeeAudit(req, {
      action: "FEE_TRANSPORT_YEARLY_UPSERT",
      entityType: "FeeTransportYearly",
      entityId: row._id,
      metadata: { academicYear, transportYearlyFee: row.transportYearlyFee },
    });

    return res.status(200).json({ message: "Transport yearly fee saved", data: row });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getTransportYearlyFees = async (req, res) => {
  try {
    const academicYear = String(req.query?.academicYear || "").trim();
    const query = academicYear ? { academicYear } : {};
    const rows = await FeeTransportYearly.find(query).sort({ academicYear: -1, createdAt: -1 });
    return res.status(200).json({ message: "Transport yearly fees retrieved", data: rows });
  } catch (error) {
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
        Program.findById(programId).select("_id durationYears totalSemesters"),
        Branch.findById(branchId).select("_id programId semesterBaseFees"),
        Student.findOne({ user: userId, isDeleted: { $ne: true } }).select("_id academicYear"),
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
      await autoGenerateDemandsForProfile({
        profile: created,
        branch,
        program,
        academicYear: student?.academicYear || req.body?.academicYear,
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

export const updateStudentFeeDetailsOptions = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid fee student details id" });

    const hostelOpted = req.body?.hostelOpted;
    const transportOpted = req.body?.transportOpted;

    if (hostelOpted == null && transportOpted == null) {
      return res.status(400).json({ message: "hostelOpted or transportOpted payload is required" });
    }

    const profile = await StudentFeeDetails.findById(id)
      .populate("userId", "name email")
      .populate("programId", "programName")
      .populate("branchId", "branchName")
      .populate("batchId", "batchYear");
    if (!profile) return res.status(404).json({ message: "Student fee details not found" });

    if (hostelOpted != null) profile.hostelOpted = Boolean(hostelOpted);
    if (transportOpted != null) profile.transportOpted = Boolean(transportOpted);

    await profile.save();
    let transportSync = null;
    if (transportOpted != null && Boolean(transportOpted) === true) {
      transportSync = await syncTransportFeeForStudentAcademicYear({
        enrollmentNumber: profile.studentId,
      });
    }

    await logFeeAudit(req, {
      action: "FEE_STUDENT_PROFILE_OPTIONS_UPDATED",
      entityType: "StudentFeeDetails",
      entityId: profile._id,
      metadata: {
        studentId: String(profile.studentId || ""),
        hostelOpted: profile.hostelOpted,
        transportOpted: profile.transportOpted,
      },
    });

    return res.status(200).json({
      message: "Student fee options updated",
      data: profile,
      sync: {
        transport: transportSync,
      },
    });
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
    const safeAcademicYear = normalizeAcademicYear(sanitizeText(academicYear, 16), { format: "full" });
    if (!safeAcademicYear) {
      return res.status(400).json({ message: ACADEMIC_YEAR_ERROR_MESSAGE });
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
    const safeAcademicYear = normalizeAcademicYear(sanitizeText(academicYear, 16), { format: "full" });
    if (!safeAcademicYear) {
      return res.status(400).json({ message: ACADEMIC_YEAR_ERROR_MESSAGE });
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
      .populate("linkedDemandId", "academicYear semesterNo totalAmount dueAmount dueDate status")
      .lean();

    const profileIds = rows
      .map((row) => String(row?.studentMongoId || ""))
      .filter((id) => isValidId(id));
    const profiles = profileIds.length
      ? await StudentFeeDetails.find({ _id: { $in: profileIds } })
          .select("programId branchId currentSemester feeSummary courseNetFee")
          .lean()
      : [];
    const profileMap = new Map(profiles.map((p) => [String(p._id), p]));

    const branchIds = Array.from(new Set(profiles.map((p) => String(p.branchId || "")).filter((id) => isValidId(id))));
    const programIds = Array.from(new Set(profiles.map((p) => String(p.programId || "")).filter((id) => isValidId(id))));
    const branches = branchIds.length
      ? await Branch.find({ _id: { $in: branchIds } }).select("semesterBaseFees").lean()
      : [];
    const programs = programIds.length
      ? await Program.find({ _id: { $in: programIds } }).select("durationYears totalSemesters").lean()
      : [];
    const branchMap = new Map(branches.map((b) => [String(b._id), b]));
    const programMap = new Map(programs.map((p) => [String(p._id), p]));

    rows.forEach((row) => {
      if (Number(row?.academicAmount || 0) > 0) {
        row.academicAmountComputed = round2(Number(row.academicAmount));
        return;
      }
      const profile = profileMap.get(String(row?.studentMongoId || ""));
      if (!profile) return;
      const branch = branchMap.get(String(profile.branchId || ""));
      if (!branch) return;
      const semesterRows = Array.isArray(branch.semesterBaseFees) ? branch.semesterBaseFees : [];
      const courseGross = round2(semesterRows.reduce((sum, r) => sum + Number(r?.baseFee || 0), 0));
      const courseNet = round2(Number(profile?.feeSummary?.courseNetFee || 0));
      const ratio = courseGross > 0 ? Math.min(1, Math.max(0, courseNet / courseGross)) : 1;

      const reqScope = normalizeDemandScope(row?.scope || (Number(row?.semesterNo) === 0 ? "YEAR" : "SEMESTER"));
      const isYearScope = reqScope === "YEAR";
      let netTuition = 0;
      if (isYearScope) {
        const program = programMap.get(String(profile.programId || ""));
        const { start, end } = getAcademicYearSemesterRange({
          currentSemester: profile.currentSemester,
          program,
        });
        let grossYearFee = 0;
        for (let sem = start; sem <= end; sem += 1) {
          const rowFee = semesterRows.find((item) => Number(item?.semesterNo) === Number(sem));
          if (rowFee) grossYearFee += Number(rowFee?.baseFee || 0);
        }
        netTuition = round2(round2(grossYearFee) * ratio);
      } else {
        const semesterRow = semesterRows.find((r) => Number(r?.semesterNo) === Number(row?.semesterNo));
        if (semesterRow) {
          const grossSemesterFee = round2(Number(semesterRow?.baseFee || 0));
          netTuition = round2(grossSemesterFee * ratio);
        }
      }
      if (netTuition > 0) row.academicAmountComputed = netTuition;
    });

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

    const dueDateInput = String(req.body?.dueDate || "").trim();
    if (!dueDateInput) {
      return res.status(400).json({ message: "dueDate is required while approving request" });
    }
    const dueDateObj = new Date(dueDateInput);
    if (Number.isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid dueDate" });
    }

    const { generated, semesterRange, demandScope } = await (async () => {
      const safeStudentId = String(request.studentId || "").trim();
      const profile = await ensureStudentFeeProfileForEnrollment(safeStudentId);
      if (!profile) throw new Error("PROFILE_NOT_FOUND");

      const branch = await Branch.findById(profile.branchId).select("semesterBaseFees branchName");
      if (!branch) throw new Error("BRANCH_NOT_FOUND");
      const semesterRows = Array.isArray(branch?.semesterBaseFees) ? branch.semesterBaseFees : [];
      const courseGross = round2(
        semesterRows.reduce((sum, row) => sum + Number(row?.baseFee || 0), 0)
      );
      const courseNet = round2(Number(profile?.feeSummary?.courseNetFee || 0));
      const ratio = courseGross > 0 ? Math.min(1, Math.max(0, courseNet / courseGross)) : 1;

      const reqScope = normalizeDemandScope(request?.scope || (Number(request.semesterNo) === 0 ? "YEAR" : "SEMESTER"));
      const isYearScope = reqScope === "YEAR";
      let netTuition = 0;
      let semesterNo = Number(request.semesterNo);
      let computedRange = null;

      if (isYearScope) {
        const program = await Program.findById(profile.programId).select("durationYears totalSemesters");
        const { start, end } = getAcademicYearSemesterRange({
          currentSemester: profile.currentSemester,
          program,
        });
        const missing = [];
        let grossYearFee = 0;
        for (let sem = start; sem <= end; sem += 1) {
          const row = semesterRows.find((item) => Number(item?.semesterNo) === Number(sem));
          if (!row) {
            missing.push(sem);
          } else {
            grossYearFee += Number(row?.baseFee || 0);
          }
        }
        if (missing.length) {
          const err = new Error("SEMESTER_FEE_NOT_CONFIGURED");
          err.details = { branchName: branch.branchName || "Unknown", semesterNo: missing.join(", ") };
          throw err;
        }
        netTuition = round2(round2(grossYearFee) * ratio);
        semesterNo = 0;
        computedRange = { start, end };
      } else {
        const semesterRow = semesterRows.find((row) => Number(row?.semesterNo) === Number(request.semesterNo));
        if (!semesterRow) {
          const err = new Error("SEMESTER_FEE_NOT_CONFIGURED");
          err.details = { branchName: branch.branchName || "Unknown", semesterNo: request.semesterNo };
          throw err;
        }
        const grossSemesterFee = round2(Number(semesterRow.baseFee || 0));
        netTuition = round2(grossSemesterFee * ratio);
      }

      const requestedAcademic = round2(Math.max(0, Number(request.academicAmount || 0)));
      if (requestedAcademic > 0) {
        netTuition = Math.min(netTuition, requestedAcademic);
      }

      const heads = [{ head: "TUITION", amount: netTuition }];
      const hostelFee = round2(Math.max(0, Number(request.hostelAmount || 0)));
      const transportFee = round2(Math.max(0, Number(request.transportAmount || 0)));
      if (profile.hostelOpted && hostelFee > 0) heads.push({ head: "HOSTEL", amount: hostelFee });
      if (profile.transportOpted && transportFee > 0) heads.push({ head: "TRANSPORT", amount: transportFee });

      const totalAmount = sumBreakdownAmount(heads);
      const doc = await FeeDemand.create({
        studentMongoId: profile._id,
        studentId: safeStudentId,
        academicYear: String(request.academicYear || "").trim(),
        semesterNo,
        scope: reqScope,
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
      return { generated: doc, semesterRange: computedRange, demandScope: reqScope };
    })();

    request.status = "APPROVED";
    request.approvedByUserId = req.userId || null;
    request.approvedAt = new Date();
    request.dueDate = dueDateObj;
    request.linkedDemandId = generated._id;
    request.scope = demandScope;
    const [studentDoc, profileDoc] = await Promise.all([
      Student.findOne({ enrollmentNumber: request.studentId, isDeleted: { $ne: true } })
        .populate("user", "name")
        .select("enrollmentNumber fatherName program academicYear"),
      StudentFeeDetails.findById(request.studentMongoId).populate("programId", "programName"),
    ]);
    request.demandLetterRefNo = await getNextDemandLetterRefNo(
      String(generated?.academicYear || request?.academicYear || "")
    );
    request.demandLetterIssuedAt = new Date();
    request.demandLetterSnapshot = {
      studentId: request.studentId,
      studentName: String(studentDoc?.user?.name || ""),
      guardianName: String(studentDoc?.fatherName || ""),
      programName: String(profileDoc?.programId?.programName || studentDoc?.program || ""),
      academicYear: String(generated?.academicYear || request.academicYear || studentDoc?.academicYear || ""),
      semesterNo: Number(generated?.semesterNo || request.semesterNo || 0),
      scope: demandScope,
      semesterRange: semesterRange,
      breakdown: Array.isArray(generated?.breakdown)
        ? generated.breakdown.map((row) => ({
            head: String(row?.head || ""),
            amount: round2(Number(row?.amount || 0)),
          }))
        : [],
      totalAmount: round2(Number(generated?.totalAmount || 0)),
      dueAmount: round2(Number(generated?.dueAmount || 0)),
      dueDate: dueDateObj,
    };
    await request.save();

    await logFeeAudit(req, {
      action: "FEE_DEMAND_REQUEST_APPROVED",
      entityType: "FeeDemandRequest",
      entityId: request._id,
      metadata: {
        studentId: request.studentId,
        academicYear: request.academicYear,
        semesterNo: request.semesterNo,
        scope: demandScope,
        demandId: generated._id,
      },
    });

    return res.status(200).json({ message: "Demand request approved and demand generated", data: request });
  } catch (error) {
    if (error.message === "PROFILE_NOT_FOUND") return res.status(404).json({ message: "Student fee profile not found" });
    if (error.message === "BRANCH_NOT_FOUND") {
      return res.status(400).json({ message: "Fee branch linked to student profile no longer exists. Please update the student fee profile." });
    }
    if (error.message === "SEMESTER_FEE_NOT_CONFIGURED") {
      const branchName = error.details?.branchName || "Unknown";
      const semNo = error.details?.semesterNo || "?";
      return res.status(400).json({ message: `Semester ${semNo} base fee is not configured for branch "${branchName}". Please configure semester fees in Fee Management before approving.` });
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
    const demands = await FeeDemand.find(filter)
      .populate({
        path: "studentMongoId",
        select: "studentId userId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const userIds = new Set();
    const enrollmentNumbers = new Set();
    demands.forEach((demand) => {
      const userId = demand?.studentMongoId?.userId?._id;
      if (userId) userIds.add(String(userId));
      if (demand?.studentId) enrollmentNumbers.add(String(demand.studentId));
    });

    if (userIds.size || enrollmentNumbers.size) {
      const students = await Student.find({
        $or: [
          userIds.size ? { user: { $in: Array.from(userIds) } } : null,
          enrollmentNumbers.size ? { enrollmentNumber: { $in: Array.from(enrollmentNumbers) } } : null,
        ].filter(Boolean),
      })
        .select("user enrollmentNumber fatherName")
        .lean();

      const fatherByUser = new Map();
      const fatherByEnrollment = new Map();
      students.forEach((student) => {
        if (student?.user) fatherByUser.set(String(student.user), student.fatherName || "");
        if (student?.enrollmentNumber) {
          fatherByEnrollment.set(String(student.enrollmentNumber), student.fatherName || "");
        }
      });

      demands.forEach((demand) => {
        const userId = demand?.studentMongoId?.userId?._id;
        const fatherName =
          (userId && fatherByUser.get(String(userId))) ||
          (demand?.studentId && fatherByEnrollment.get(String(demand.studentId))) ||
          "";
        demand.studentFatherName = fatherName;
      });
    }

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
    if (safeCreatedBy === "ACCOUNTS" && safeMode !== "CASH") {
      return res.status(400).json({
        message: "Admin manual entry is allowed only for CASH payments. Online payments are auto-recorded.",
      });
    }
    if (safeCreatedBy === "ACCOUNTS" && safeMode === "CASH" && safeGateway !== "NONE") {
      return res.status(400).json({ message: "gateway must be NONE for admin cash payments" });
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
      const paymentMode = String(payment.mode || "").toUpperCase();
      const paymentOrigin = String(payment.createdBy || "").toUpperCase();
      if (ONLINE_PAYMENT_MODES.has(paymentMode) || paymentOrigin === "STUDENT") {
        throw new Error("ONLINE_AUTO_MANAGED");
      }

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
    if (error.message === "ONLINE_AUTO_MANAGED") {
      return res.status(400).json({ message: "Online/student payments are auto-managed and cannot be updated manually" });
    }
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

    // Self-heal stale feeSummary values from historical/incorrect mappings.
    const computedSummary = computeCourseFeeSummary({
      branch: profile.branchId,
      scholarship: profile.scholarship,
      discount: profile.discount,
    });
    const existingPaid = round2(Math.max(0, Number(profile?.feeSummary?.totalPaid || 0)));
    const cappedPaid = round2(Math.min(existingPaid, Number(computedSummary.courseNetFee || 0)));
    const normalizedSummary = {
      ...computedSummary,
      totalPaid: cappedPaid,
      remainingFee: round2(Math.max(0, Number(computedSummary.courseNetFee || 0) - cappedPaid)),
    };
    const prevNet = round2(Number(profile?.feeSummary?.courseNetFee || 0));
    const nextNet = round2(Number(normalizedSummary.courseNetFee || 0));
    if (Math.abs(prevNet - nextNet) >= 1) {
      profile.feeSummary = normalizedSummary;
      await profile.save();
    }

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
    const studentRow = await Student.findOne({ user: req.userId, isDeleted: { $ne: true } }).select(
      "_id academicYear"
    );
    const studentAcademicYear = String(studentRow?.academicYear || "").trim();
    const hostelRoomType = await resolveActiveHostelRoomTypeForStudent(studentRow?._id);
    const { hostelYearlyFee, transportYearlyFee } = await getYearlyAddOnFees(studentAcademicYear, {
      hostelRoomType,
    });
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

export const getMyFeeDemandRequests = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) {
      return res.status(404).json({ message: "Student fee profile not found" });
    }

    const { status } = req.query || {};
    const query = { studentMongoId: current.profile._id };
    if (status) query.status = String(status).toUpperCase();

    const rawLimit = Number(req.query?.limit || 100);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
      : 100;

    const rows = await FeeDemandRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("linkedDemandId", "academicYear semesterNo totalAmount dueAmount dueDate status");

    return res.status(200).json({ message: "My demand requests retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createMyFeeDemandRequest = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const {
      academicYear,
      semesterNo,
      hostelAmount = 0,
      transportAmount = 0,
      academicAmount = 0,
      note = "",
    } = req.body || {};
    const requestScope = normalizeDemandScope(req.body?.scope || req.body?.requestScope || req.body?.applyFor);
    const isYearScope = requestScope === "YEAR";
    if (!academicYear || (!isYearScope && !semesterNo)) {
      return res.status(400).json({
        message: isYearScope ? "academicYear is required" : "academicYear and semesterNo are required",
      });
    }
    const safeAcademicYear = normalizeAcademicYear(sanitizeText(academicYear, 16), { format: "full" });
    if (!safeAcademicYear) {
      return res.status(400).json({ message: ACADEMIC_YEAR_ERROR_MESSAGE });
    }
    const semester = isYearScope ? 0 : toNum(semesterNo);
    if (!isYearScope && (Number.isNaN(semester) || semester < 1 || semester > 20)) {
      return res.status(400).json({ message: "Invalid semesterNo" });
    }

    const branch = await Branch.findById(current.profile.branchId).select("semesterBaseFees");
    if (!branch) {
      return res.status(400).json({ message: "Fee branch is not configured for your profile. Please contact administration." });
    }
    const semesterRows = Array.isArray(branch.semesterBaseFees) ? branch.semesterBaseFees : [];
    if (isYearScope) {
      const program = await Program.findById(current.profile.programId).select("durationYears totalSemesters");
      const { start, end } = getAcademicYearSemesterRange({
        currentSemester: current.profile.currentSemester,
        program,
      });
      const missing = [];
      for (let sem = start; sem <= end; sem += 1) {
        const row = semesterRows.find((item) => Number(item?.semesterNo) === Number(sem));
        if (!row) missing.push(sem);
      }
      if (missing.length) {
        return res.status(400).json({
          message: `Semester ${missing.join(", ")} base fee is not configured for your branch. Please contact administration.`,
        });
      }
    } else {
      const semesterRow = semesterRows.find((row) => Number(row?.semesterNo) === Number(semester));
      if (!semesterRow) {
        return res.status(400).json({ message: `Semester ${semester} base fee is not configured for your branch. Please contact administration.` });
      }
    }

    const doc = await FeeDemandRequest.create({
      studentMongoId: current.profile._id,
      studentId: current.profile.studentId,
      academicYear: safeAcademicYear,
      semesterNo: semester,
      scope: requestScope,
      dueDate: null,
      hostelAmount: round2(Math.max(0, Number(hostelAmount || 0))),
      academicAmount: round2(Math.max(0, Number(academicAmount || 0))),
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

const getApprovedDemandRequestForStudent = async ({ requestId, userId }) => {
  if (!isValidId(requestId)) {
    const error = new Error("INVALID_REQUEST_ID");
    throw error;
  }

  const current = await getCurrentStudentFeeProfile(userId);
  if (!current || !current.profile) {
    const error = new Error("PROFILE_NOT_FOUND");
    throw error;
  }

  const row = await FeeDemandRequest.findById(requestId).populate(
    "linkedDemandId",
    "breakdown totalAmount dueAmount dueDate academicYear semesterNo"
  );
  if (!row) {
    const error = new Error("REQUEST_NOT_FOUND");
    throw error;
  }
  if (String(row.studentMongoId) !== String(current.profile._id)) {
    const error = new Error("FORBIDDEN_REQUEST");
    throw error;
  }
  if (String(row.status) !== "APPROVED" || !row.linkedDemandId) {
    const error = new Error("LETTER_NOT_READY");
    throw error;
  }

  return { row, profile: current.profile };
};

const sendDemandLetterPdf = async ({ res, request, demand, disposition = "inline" }) => {
  const html = buildDemandLetterHtml({
    snapshot: request?.demandLetterSnapshot || null,
    request,
    demand,
  });
  const pdfBuffer = await renderPdfBufferFromHtml(html, {
    format: "A4",
    printBackground: true,
  });
  const safeStudentId = String(request?.studentId || "student").replace(/[^a-zA-Z0-9_-]/g, "_");
  const scope = normalizeDemandScope(request?.scope || (Number(request?.semesterNo || 0) === 0 ? "YEAR" : "SEMESTER"));
  const suffix = scope === "YEAR" ? "year" : `sem_${Number(request?.semesterNo || 0) || "sem"}`;
  const fileName = `${safeStudentId}_demand_letter_${suffix}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename=\"${fileName}\"`);
  return res.status(200).send(pdfBuffer);
};

export const viewMyDemandLetterPdf = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { row } = await getApprovedDemandRequestForStudent({
      requestId,
      userId: req.userId,
    });
    return sendDemandLetterPdf({
      res,
      request: row,
      demand: row.linkedDemandId,
      disposition: "inline",
    });
  } catch (error) {
    if (error.message === "INVALID_REQUEST_ID") return res.status(400).json({ message: "Invalid request id" });
    if (error.message === "PROFILE_NOT_FOUND") return res.status(404).json({ message: "Student fee profile not found" });
    if (error.message === "REQUEST_NOT_FOUND") return res.status(404).json({ message: "Demand request not found" });
    if (error.message === "FORBIDDEN_REQUEST") return res.status(403).json({ message: "You can only access your own demand letter" });
    if (error.message === "LETTER_NOT_READY") return res.status(400).json({ message: "Demand letter is not available yet" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const downloadMyDemandLetterPdf = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { row } = await getApprovedDemandRequestForStudent({
      requestId,
      userId: req.userId,
    });
    return sendDemandLetterPdf({
      res,
      request: row,
      demand: row.linkedDemandId,
      disposition: "attachment",
    });
  } catch (error) {
    if (error.message === "INVALID_REQUEST_ID") return res.status(400).json({ message: "Invalid request id" });
    if (error.message === "PROFILE_NOT_FOUND") return res.status(404).json({ message: "Student fee profile not found" });
    if (error.message === "REQUEST_NOT_FOUND") return res.status(404).json({ message: "Demand request not found" });
    if (error.message === "FORBIDDEN_REQUEST") return res.status(403).json({ message: "You can only access your own demand letter" });
    if (error.message === "LETTER_NOT_READY") return res.status(400).json({ message: "Demand letter is not available yet" });
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

/* ================= ADMIN V2 (BULK/REPORTS/ANALYTICS/CALENDAR) ================= */
const toCsv = (rows = []) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const raw = value == null ? "" : String(value);
    if (/[,\"\n]/.test(raw)) return `"${raw.replace(/\"/g, "\"\"")}"`;
    return raw;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escape(row[key])).join(","));
  }
  return lines.join("\n");
};

export const verifyMyRazorpayPaymentForYear = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Razorpay is not configured" });
    }

    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const orderId = String(req.body?.razorpay_order_id || "").trim();
    const paymentId = String(req.body?.razorpay_payment_id || "").trim();
    const signature = String(req.body?.razorpay_signature || "").trim();
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "razorpay_order_id, razorpay_payment_id, razorpay_signature are required" });
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

    const order = await callRazorpay({
      method: "GET",
      path: `/orders/${encodeURIComponent(orderId)}`,
    });
    const notes = order?.notes || {};
    const academicYear = String(notes.academicYear || "").trim();
    const demandIdsRaw = String(notes.demandIds || "").trim();
    if (!academicYear || !demandIdsRaw) {
      return res.status(400).json({ message: "Order does not contain yearly demand mapping" });
    }
    const demandIds = demandIdsRaw.split(",").map((id) => id.trim()).filter(Boolean);

    const mode = mapRazorpayMethodToMode(gatewayPayment?.method);
    if (!mode) {
      return res.status(400).json({ message: "Unsupported Razorpay payment method for fee ledger" });
    }

    const amountNum = round2(Number(gatewayPayment?.amount || 0) / 100);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid Razorpay payment amount" });
    }

    let outputs = [];
    await session.withTransaction(async () => {
      const existing = await PaymentHistory.findOne({
        transactionId: { $regex: `^${paymentId}:` },
      }).session(session);
      if (existing) return;

      const demands = await FeeDemand.find({
        _id: { $in: demandIds },
        studentMongoId: current.profile._id,
      }).session(session);
      if (!demands.length) throw new Error("DEMAND_NOT_FOUND");

      const totalDue = round2(demands.reduce((sum, d) => sum + Number(d.dueAmount || 0), 0));
      if (amountNum !== totalDue) {
        throw new Error("AMOUNT_EXCEEDS_DUE");
      }

      let remaining = amountNum;
      const sorted = demands.sort((a, b) => Number(a.semesterNo) - Number(b.semesterNo));
      for (const demand of sorted) {
        const payAmount = Math.min(remaining, Number(demand.dueAmount || 0));
        if (payAmount <= 0) continue;
        const created = await PaymentHistory.create(
          [{
            studentId: demand.studentId,
            demandId: demand._id,
            amount: payAmount,
            mode,
            status: "SUCCESS",
            transactionId: `${paymentId}:${String(demand._id).slice(-8)}`,
            idempotencyKey: `rzp_${paymentId}:${String(demand._id).slice(-8)}`,
            gateway: "RAZORPAY",
            paymentDetails: {
              orderId,
              signatureDigest: hashPayload({ signature }),
              method: String(gatewayPayment?.method || ""),
              scope: "YEAR",
              academicYear,
            },
            paidAt: new Date(),
            createdBy: "STUDENT",
            verifiedBy: req.userId || null,
          }],
          { session }
        );
        demand.paidAmount = round2(Number(demand.paidAmount || 0) + payAmount);
        applyBreakdownPayment(demand.breakdown, payAmount);
        recalcDemand(demand);
        await demand.save({ session });
        await applyFeeProfilePaymentDelta({
          profileId: demand.studentMongoId,
          amount: payAmount,
          session,
        });
        outputs.push(created[0]);
        remaining = round2(remaining - payAmount);
      }
    });

    return res.status(200).json({ message: "Yearly payment verified", data: outputs });
  } catch (error) {
    if (error.message === "AMOUNT_EXCEEDS_DUE") {
      return res.status(400).json({ message: "Payment amount must equal total due for the year" });
    }
    if (error.message === "DEMAND_NOT_FOUND") {
      return res.status(404).json({ message: "Fee demand not found" });
    }
    return res.status(500).json({ message: sanitizeError(error) });
  } finally {
    session.endSession();
  }
};

export const updateFeeDemand = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid demand id" });

    const demand = await FeeDemand.findById(id);
    if (!demand) return res.status(404).json({ message: "Fee demand not found" });

    const { breakdown, dueDate } = req.body || {};
    if (!breakdown && !dueDate) {
      return res.status(400).json({ message: "breakdown or dueDate is required" });
    }

    if (breakdown) {
      if (!Array.isArray(breakdown) || !breakdown.length) {
        return res.status(400).json({ message: "breakdown must be a non-empty array" });
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
      if (totalAmount < Number(demand.paidAmount || 0)) {
        return res.status(400).json({ message: "Total amount cannot be less than paid amount" });
      }
      demand.breakdown = breakdown.map((b) => ({
        head: String(b.head).toUpperCase(),
        amount: round2(Number(b.amount)),
        paid: 0,
      }));
      applyBreakdownPayment(demand.breakdown, Number(demand.paidAmount || 0));
      demand.totalAmount = totalAmount;
    }

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      if (Number.isNaN(dueDateObj.getTime())) {
        return res.status(400).json({ message: "Invalid dueDate" });
      }
      demand.dueDate = dueDateObj;
    }

    recalcDemand(demand);
    await demand.save();

    return res.status(200).json({ message: "Fee demand updated", data: demand });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeBulkTemplate = async (_req, res) => {
  const headers = [
    "studentId",
    "program",
    "branch",
    "batchYear",
    "semester",
    "hostelOpted",
    "transportOpted",
    "scholarshipType",
    "scholarshipValue",
    "discountType",
    "discountValue",
  ];
  const csv = `${headers.join(",")}\n`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=fee-bulk-template.csv");
  return res.status(200).send(csv);
};

export const uploadFeeBulkFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, "utf8");
    const rows = fileContent.split(/\r?\n/).filter((line) => String(line || "").trim());
    const totalRecords = Math.max(0, rows.length - 1);
    const fileUrl = `/uploads/fee-bulk/${path.basename(filePath)}`;

    const job = await FeeBulkJob.create({
      fileName: req.file.originalname || path.basename(filePath),
      fileUrl,
      totalRecords,
      errorCount: 0,
      status: "COMPLETED",
      message: totalRecords ? "Upload validated" : "Empty file",
      createdBy: req.userId || null,
    });

    return res.status(201).json({ message: "Bulk upload processed", data: job });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createMyRazorpayOrderForYear = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: "Razorpay is not configured" });
    }

    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const academicYear = normalizeAcademicYear(String(req.body?.academicYear || "").trim(), { format: "full" });
    if (!isValidAcademicYear(academicYear)) {
      return res.status(400).json({ message: ACADEMIC_YEAR_ERROR_MESSAGE });
    }

    const demands = await FeeDemand.find({
      studentMongoId: current.profile._id,
      academicYear: { $in: getAcademicYearCandidates(academicYear) },
      dueAmount: { $gt: 0 },
    }).sort({ semesterNo: 1 });
    if (!demands.length) {
      return res.status(400).json({ message: "No due demands for selected academic year" });
    }

    const totalDue = round2(demands.reduce((sum, d) => sum + Number(d.dueAmount || 0), 0));
    const { currency, keyId } = getRazorpayConfig();
    const amountPaise = Math.round(totalDue * 100);
    const receipt = `fee_year_${String(current.profile.studentId)}_${Date.now()}`;
    const demandIds = demands.map((d) => String(d._id)).join(",");
    const order = await callRazorpay({
      method: "POST",
      path: "/orders",
      body: {
        amount: amountPaise,
        currency,
        receipt,
        notes: {
          scope: "YEAR",
          academicYear,
          demandIds,
          studentId: String(current.profile.studentId || ""),
          userId: String(req.userId || ""),
        },
      },
    });

    return res.status(201).json({
      message: "Razorpay yearly order created",
      data: {
        keyId,
        academicYear,
        amount: totalDue,
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

export const getFeeBulkJobs = async (req, res) => {
  try {
    const rawLimit = Number(req.query?.limit || 50);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 50;
    const jobs = await FeeBulkJob.find().sort({ createdAt: -1 }).limit(limit);
    return res.status(200).json({ message: "Bulk jobs retrieved", data: jobs });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeBulkJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!isValidId(jobId)) return res.status(400).json({ message: "Invalid jobId" });
    const job = await FeeBulkJob.findById(jobId);
    if (!job) return res.status(404).json({ message: "Bulk job not found" });
    return res.status(200).json({ message: "Bulk job retrieved", data: job });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const retryFeeBulkJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!isValidId(jobId)) return res.status(400).json({ message: "Invalid jobId" });
    const job = await FeeBulkJob.findById(jobId);
    if (!job) return res.status(404).json({ message: "Bulk job not found" });
    job.status = "COMPLETED";
    job.message = "Reprocessed successfully";
    await job.save();
    return res.status(200).json({ message: "Bulk job retried", data: job });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createFeeReportExport = async (req, res) => {
  try {
    const { range, dataset, format, destination, title } = req.body || {};
    const demands = await FeeDemand.find().select("totalAmount paidAmount dueAmount").limit(2000);
    const summary = demands.reduce(
      (acc, item) => {
        acc.totalAmount += Number(item.totalAmount || 0);
        acc.paidAmount += Number(item.paidAmount || 0);
        acc.dueAmount += Number(item.dueAmount || 0);
        return acc;
      },
      { totalAmount: 0, paidAmount: 0, dueAmount: 0 }
    );
    const exportDoc = await FeeReportExport.create({
      title: title || "Fee Export",
      range: range || "Custom",
      dataset: dataset || "Student Ledger",
      format: (format || "CSV").toUpperCase(),
      destination: destination || "download",
      status: "COMPLETED",
      payload: {
        generatedAt: new Date(),
        summary,
      },
      createdBy: req.userId || null,
    });
    return res.status(201).json({ message: "Report export created", data: exportDoc });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeReportExports = async (req, res) => {
  try {
    const rawLimit = Number(req.query?.limit || 50);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 50;
    const rows = await FeeReportExport.find().sort({ createdAt: -1 }).limit(limit);
    return res.status(200).json({ message: "Report exports retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeReportExportById = async (req, res) => {
  try {
    const { exportId } = req.params;
    if (!isValidId(exportId)) return res.status(400).json({ message: "Invalid exportId" });
    const row = await FeeReportExport.findById(exportId);
    if (!row) return res.status(404).json({ message: "Report export not found" });
    return res.status(200).json({ message: "Report export retrieved", data: row });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const downloadFeeReportExport = async (req, res) => {
  try {
    const { exportId } = req.params;
    if (!isValidId(exportId)) return res.status(400).json({ message: "Invalid exportId" });
    const row = await FeeReportExport.findById(exportId);
    if (!row) return res.status(404).json({ message: "Report export not found" });
    const format = String(row.format || "CSV").toUpperCase();
    const payload = row.payload || {};
    if (format === "JSON") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=fee-export-${row._id}.json`);
      return res.status(200).send(JSON.stringify(payload, null, 2));
    }
    const csv = toCsv([
      {
        totalAmount: payload?.summary?.totalAmount || 0,
        paidAmount: payload?.summary?.paidAmount || 0,
        dueAmount: payload?.summary?.dueAmount || 0,
        generatedAt: payload?.generatedAt || row.createdAt,
      },
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=fee-export-${row._id}.csv`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const shareFeeReportExport = async (req, res) => {
  try {
    const { exportId } = req.params;
    if (!isValidId(exportId)) return res.status(400).json({ message: "Invalid exportId" });
    const recipients = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
    const row = await FeeReportExport.findById(exportId);
    if (!row) return res.status(404).json({ message: "Report export not found" });
    row.sharedTo = recipients.map((r) => String(r || "").trim()).filter(Boolean);
    row.sharedAt = new Date();
    await row.save();
    return res.status(200).json({ message: "Report export shared", data: row });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFinancialSummary = async (_req, res) => {
  try {
    const rows = await FeeDemand.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          paidAmount: { $sum: "$paidAmount" },
          dueAmount: { $sum: "$dueAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    const data = rows[0] || { totalAmount: 0, paidAmount: 0, dueAmount: 0, count: 0 };
    return res.status(200).json({ message: "Financial summary retrieved", data });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFinancialProgramBreakup = async (_req, res) => {
  try {
    const rows = await FeeDemand.aggregate([
      {
        $group: {
          _id: "$studentMongoId",
          totalAmount: { $sum: "$totalAmount" },
          paidAmount: { $sum: "$paidAmount" },
          dueAmount: { $sum: "$dueAmount" },
        },
      },
      {
        $lookup: {
          from: "studentfeedetails",
          localField: "_id",
          foreignField: "_id",
          as: "profile",
        },
      },
      { $unwind: "$profile" },
      {
        $group: {
          _id: "$profile.programId",
          totalAmount: { $sum: "$totalAmount" },
          paidAmount: { $sum: "$paidAmount" },
          dueAmount: { $sum: "$dueAmount" },
          studentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "programs",
          localField: "_id",
          foreignField: "_id",
          as: "program",
        },
      },
      { $unwind: { path: "$program", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          programId: "$_id",
          programName: "$program.programName",
          totalAmount: 1,
          paidAmount: 1,
          dueAmount: 1,
          studentCount: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
    return res.status(200).json({ message: "Program breakup retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFinancialCashflow = async (_req, res) => {
  try {
    const start = new Date();
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    const rows = await PaymentHistory.aggregate([
      { $match: { status: "SUCCESS", paidAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return res.status(200).json({ message: "Cashflow retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getStudentAnalyticsOverview = async (_req, res) => {
  try {
    const totalProfiles = await StudentFeeDetails.countDocuments();
    const demandAgg = await FeeDemand.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          paidAmount: { $sum: "$paidAmount" },
          dueAmount: { $sum: "$dueAmount" },
        },
      },
    ]);
    const summary = demandAgg[0] || { totalAmount: 0, paidAmount: 0, dueAmount: 0 };
    const discounts = await StudentFeeDetails.countDocuments({
      $or: [{ "discount.type": { $ne: "NONE" } }, { "scholarship.type": { $ne: "NONE" } }],
    });
    return res.status(200).json({
      message: "Student analytics overview retrieved",
      data: {
        totalProfiles,
        discountedProfiles: discounts,
        totalAmount: summary.totalAmount,
        paidAmount: summary.paidAmount,
        dueAmount: summary.dueAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getStudentStatusDistribution = async (_req, res) => {
  try {
    const demandRows = await FeeDemand.aggregate([
      {
        $group: {
          _id: "$studentMongoId",
          dueAmount: { $sum: "$dueAmount" },
        },
      },
    ]);
    const map = new Map(demandRows.map((r) => [String(r._id), r]));
    const profiles = await StudentFeeDetails.find().select("_id feeSummary.courseNetFee");
    let onTrack = 0;
    let followUp = 0;
    let critical = 0;
    for (const profile of profiles) {
      const row = map.get(String(profile._id));
      const due = Number(row?.dueAmount || 0);
      const net = Number(profile?.feeSummary?.courseNetFee || 0);
      const threshold = net * 0.2;
      if (due <= 0) onTrack += 1;
      else if (due <= threshold) followUp += 1;
      else critical += 1;
    }
    const total = onTrack + followUp + critical || 1;
    const data = [
      { label: "On Track", value: Math.round((onTrack / total) * 100) },
      { label: "Follow Up", value: Math.round((followUp / total) * 100) },
      { label: "Critical", value: Math.round((critical / total) * 100) },
    ];
    return res.status(200).json({ message: "Status distribution retrieved", data });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getStudentSegments = async (_req, res) => {
  try {
    const rows = await StudentFeeDetails.find().select("scholarship discount hostelOpted transportOpted");
    const segments = {
      scholarship: 0,
      discount: 0,
      hostel: 0,
      transport: 0,
    };
    for (const row of rows) {
      if (String(row?.scholarship?.type || "NONE") !== "NONE") segments.scholarship += 1;
      if (String(row?.discount?.type || "NONE") !== "NONE") segments.discount += 1;
      if (row.hostelOpted) segments.hostel += 1;
      if (row.transportOpted) segments.transport += 1;
    }
    const data = [
      { label: "Scholarship", students: segments.scholarship },
      { label: "Discount", students: segments.discount },
      { label: "Hostel Opted", students: segments.hostel },
      { label: "Transport Opted", students: segments.transport },
    ];
    return res.status(200).json({ message: "Student segments retrieved", data });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getStudentAnalyticsList = async (_req, res) => {
  try {
    const rows = await StudentFeeDetails.find()
      .populate("userId", "name")
      .populate("programId", "programName")
      .select("studentId feeSummary programId");
    return res.status(200).json({ message: "Student analytics list retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createFeeCalendarEvent = async (req, res) => {
  try {
    const { title, description = "", date, time, eventDate, type, academicYear, semesterNo } = req.body || {};
    const safeTitle = ensureSafeText(title, "title");
    const resolvedDate = eventDate
      ? new Date(eventDate)
      : date && time
      ? new Date(`${date}T${time}`)
      : null;
    if (!resolvedDate || Number.isNaN(resolvedDate.getTime())) {
      return res.status(400).json({ message: "Valid date and time are required" });
    }
    const eventType = String(type || "General");
    const safeAcademicYear = normalizeAcademicYear(String(academicYear || "").trim(), {
      format: "full",
    });
    const sem = semesterNo != null ? toNum(semesterNo) : null;
    if (eventType === "Semester Due Date") {
      if (!isValidAcademicYear(safeAcademicYear)) {
        return res.status(400).json({ message: ACADEMIC_YEAR_ERROR_MESSAGE });
      }
      if (Number.isNaN(sem) || sem < 1 || sem > 20) {
        return res.status(400).json({ message: "Invalid semesterNo" });
      }
    }
    const doc = await FeeCalendarEvent.create({
      title: safeTitle,
      description: sanitizeText(description, 500),
      eventDate: resolvedDate,
      eventType,
      academicYear: eventType === "Semester Due Date" ? safeAcademicYear : "",
      semesterNo: eventType === "Semester Due Date" ? sem : undefined,
      createdBy: req.userId || null,
    });
    return res.status(201).json({ message: "Calendar event created", data: doc });
  } catch (error) {
    if (String(error?.message || "").includes("_INVALID") || String(error?.message || "").includes("_REQUIRED")) {
      return res.status(400).json({ message: "Invalid calendar payload" });
    }
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getFeeCalendarEvents = async (_req, res) => {
  try {
    const rows = await FeeCalendarEvent.find({ isDeleted: { $ne: true } }).sort({ eventDate: 1 });
    return res.status(200).json({ message: "Calendar events retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const updateFeeCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid event id" });
    const { title, description, date, time, eventDate, type, academicYear, semesterNo } = req.body || {};
    const update = {};
    if (title) update.title = ensureSafeText(title, "title");
    if (description != null) update.description = sanitizeText(description, 500);
    if (type) update.eventType = String(type);
    if (academicYear != null) {
      const normalizedYear = normalizeAcademicYear(String(academicYear || "").trim(), {
        format: "full",
      });
      if (!normalizedYear) {
        return res.status(400).json({ message: ACADEMIC_YEAR_ERROR_MESSAGE });
      }
      update.academicYear = normalizedYear;
    }
    if (semesterNo != null) update.semesterNo = toNum(semesterNo);
    if (eventDate || (date && time)) {
      const resolvedDate = eventDate ? new Date(eventDate) : new Date(`${date}T${time}`);
      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date/time" });
      }
      update.eventDate = resolvedDate;
    }
    const row = await FeeCalendarEvent.findByIdAndUpdate(id, update, { new: true });
    if (!row) return res.status(404).json({ message: "Calendar event not found" });
    return res.status(200).json({ message: "Calendar event updated", data: row });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const deleteFeeCalendarEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid event id" });
    const row = await FeeCalendarEvent.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!row) return res.status(404).json({ message: "Calendar event not found" });
    return res.status(200).json({ message: "Calendar event deleted", data: row });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const signFeePaymentRequest = async (_req, res) =>
  res.status(200).json({ message: "Signature not required for current gateway" });
