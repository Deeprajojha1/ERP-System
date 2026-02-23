import mongoose from "mongoose";
import Batch from "../models/feeBatch.js";
import Branch from "../models/feeBranch.js";
import Program from "../models/feeProgram.js";
import StudentFeeDetails from "../models/feeStudentDetails.js";
import FeeDemand from "../models/feeDemand.js";
import PaymentHistory from "../models/feePaymentHistory.js";
import Student from "../models/Student.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};
const round2 = (value) => Number(Number(value).toFixed(2));

const sanitizeError = (error) => {
  if (error instanceof mongoose.Error.ValidationError) return error.message;
  return "Request failed";
};

const sumBreakdownAmount = (breakdown = []) =>
  round2(breakdown.reduce((sum, item) => sum + Number(item?.amount || 0), 0));

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
  const student = await Student.findOne({ user: userId, isDeleted: { $ne: true } }).select("enrollmentNumber");
  if (!student) return null;

  const profile = await StudentFeeDetails.findOne({
    $or: [{ userId }, { studentId: student.enrollmentNumber }],
  });

  return { student, profile };
};

/* ================= MASTER: PROGRAM/BATCH/BRANCH ================= */
export const createFeeProgram = async (req, res) => {
  try {
    const { programName, durationYears, totalSemesters, branchIds = [] } = req.body || {};
    if (!programName || !durationYears || !totalSemesters) {
      return res.status(400).json({ message: "programName, durationYears, totalSemesters are required" });
    }

    const program = await Program.create({
      programName: String(programName).trim(),
      durationYears: toNum(durationYears),
      totalSemesters: toNum(totalSemesters),
      branchIds: Array.isArray(branchIds) ? branchIds : [],
    });

    return res.status(201).json({ message: "Fee program created successfully", data: program });
  } catch (error) {
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
    return res.status(201).json({ message: "Fee batch created successfully", data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Batch already exists for this year and department" });
    }
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const createFeeBranch = async (req, res) => {
  try {
    const { programId, branchName, semesterBaseFees } = req.body || {};
    if (!programId || !branchName || !Array.isArray(semesterBaseFees) || !semesterBaseFees.length) {
      return res.status(400).json({ message: "programId, branchName, semesterBaseFees are required" });
    }
    if (!isValidId(programId)) return res.status(400).json({ message: "Invalid programId" });

    const program = await Program.findById(programId);
    if (!program) return res.status(404).json({ message: "Program not found" });

    const branch = await Branch.create({
      programId,
      branchName: String(branchName).trim(),
      semesterBaseFees,
    });

    await Program.findByIdAndUpdate(programId, { $addToSet: { branchIds: branch._id } });
    return res.status(201).json({ message: "Fee branch created successfully", data: branch });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Branch already exists" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= STUDENT FEE PROFILE ================= */
export const createStudentFeeDetails = async (req, res) => {
  try {
    const { userId, studentId, batchId, programId, branchId, currentSemester } = req.body || {};
    if (!userId || !studentId || !batchId || !programId || !branchId || !currentSemester) {
      return res.status(400).json({ message: "userId, studentId, batchId, programId, branchId, currentSemester are required" });
    }
    if (![userId, batchId, programId, branchId].every(isValidId)) {
      return res.status(400).json({ message: "Invalid ids provided" });
    }

    const created = await StudentFeeDetails.create(req.body);
    return res.status(201).json({ message: "Student fee details created successfully", data: created });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Student fee details already exist" });
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= DEMANDS ================= */
export const createFeeDemand = async (req, res) => {
  try {
    const { studentMongoId, studentId, academicYear, semesterNo, breakdown, dueDate } = req.body || {};
    if (!studentMongoId || !studentId || !academicYear || !semesterNo || !Array.isArray(breakdown) || !breakdown.length || !dueDate) {
      return res.status(400).json({
        message: "studentMongoId, studentId, academicYear, semesterNo, breakdown and dueDate are required",
      });
    }
    if (!isValidId(studentMongoId)) return res.status(400).json({ message: "Invalid studentMongoId" });

    for (const row of breakdown) {
      const amt = toNum(row?.amount);
      if (Number.isNaN(amt) || amt < 0) return res.status(400).json({ message: "Invalid breakdown amount" });
    }

    const totalAmount = sumBreakdownAmount(breakdown);
    const doc = await FeeDemand.create({
      studentMongoId,
      studentId: String(studentId).trim(),
      academicYear: String(academicYear).trim(),
      semesterNo: toNum(semesterNo),
      breakdown: breakdown.map((b) => ({ ...b, paid: 0 })),
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate: new Date(dueDate),
      status: "PENDING",
    });

    return res.status(201).json({ message: "Fee demand created successfully", data: doc });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "Demand already exists for this student/semester/year" });
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

    const demands = await FeeDemand.find(filter).sort({ createdAt: -1 });
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

    const amountNum = toNum(amount);
    if (!demandId || Number.isNaN(amountNum) || amountNum <= 0 || !mode) {
      return res.status(400).json({ message: "demandId, amount and mode are required" });
    }
    if (!isValidId(demandId)) return res.status(400).json({ message: "Invalid demandId" });
    const idempotencyKey = String(req.headers["x-idempotency-key"] || req.body?.idempotencyKey || "").trim();
    if (!idempotencyKey) return res.status(400).json({ message: "x-idempotency-key header is required" });

    let output = null;
    await session.withTransaction(async () => {
      const existing = await PaymentHistory.findOne({ idempotencyKey }).session(session);
      if (existing) {
        output = existing;
        return;
      }

      const demand = await FeeDemand.findById(demandId).session(session);
      if (!demand) throw new Error("DEMAND_NOT_FOUND");
      if (amountNum > demand.dueAmount) throw new Error("AMOUNT_EXCEEDS_DUE");

      const created = await PaymentHistory.create(
        [{
          studentId: demand.studentId,
          demandId,
          amount: round2(amountNum),
          mode,
          status: "SUCCESS",
          transactionId,
          idempotencyKey,
          gateway,
          paymentDetails,
          receiptNo,
          paidAt: new Date(),
          createdBy,
          verifiedBy: req.userId || null,
        }],
        { session }
      );

      demand.paidAmount = round2(Number(demand.paidAmount || 0) + amountNum);
      applyBreakdownPayment(demand.breakdown, amountNum);
      recalcDemand(demand);
      await demand.save({ session });
      output = created[0];
    });

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
    await session.withTransaction(async () => {
      const payment = await PaymentHistory.findById(paymentId).session(session);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      const fromStatus = String(payment.status || "");
      const allowed = allowedTransitions[fromStatus] || [];
      if (!allowed.includes(nextStatus)) throw new Error("INVALID_TRANSITION");

      if (fromStatus === "SUCCESS" && nextStatus === "REFUNDED") {
        const demand = await FeeDemand.findById(payment.demandId).session(session);
        if (!demand) throw new Error("DEMAND_NOT_FOUND");

        demand.paidAmount = round2(Math.max(0, Number(demand.paidAmount || 0) - Number(payment.amount || 0)));
        reverseBreakdownPayment(demand.breakdown, Number(payment.amount || 0));
        recalcDemand(demand);
        await demand.save({ session });
      }

      payment.status = nextStatus;
      payment.verifiedBy = req.userId || null;
      updated = await payment.save({ session });
    });

    return res.status(200).json({ message: "Payment status updated successfully", data: updated });
  } catch (error) {
    if (error.message === "PAYMENT_NOT_FOUND") return res.status(404).json({ message: "Payment not found" });
    if (error.message === "DEMAND_NOT_FOUND") return res.status(404).json({ message: "Demand not found" });
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

    const rows = await PaymentHistory.find(filter).sort({ createdAt: -1 }).populate("demandId", "academicYear semesterNo totalAmount dueAmount");
    return res.status(200).json({ message: "Payment history retrieved", data: rows });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

/* ================= STUDENT-ONLY SAFE VIEWS ================= */
export const getMyFeeDemands = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const demands = await FeeDemand.find({ studentMongoId: current.profile._id }).sort({ createdAt: -1 });
    return res.status(200).json({ message: "My fee demands retrieved", data: demands });
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};

export const getMyPaymentHistory = async (req, res) => {
  try {
    const current = await getCurrentStudentFeeProfile(req.userId);
    if (!current || !current.profile) return res.status(404).json({ message: "Student fee profile not found" });

    const rows = await PaymentHistory.find({ studentId: current.profile.studentId })
      .sort({ createdAt: -1 })
      .populate("demandId", "academicYear semesterNo totalAmount dueAmount");

    return res.status(200).json({ message: "My payment history retrieved", data: rows });
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

    return createPayment(req, res);
  } catch (error) {
    return res.status(500).json({ message: sanitizeError(error) });
  }
};
