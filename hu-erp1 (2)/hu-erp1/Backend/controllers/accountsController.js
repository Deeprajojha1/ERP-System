import mongoose from "mongoose";
import Branch from "../models/feeBranch.js";
import Program from "../models/feeProgram.js";
import Batch from "../models/feeBatch.js";
import FeeDemand from "../models/feeDemand.js";
import FeePaymentHistory from "../models/feePaymentHistory.js";
import StudentFeeDetails from "../models/feeStudentDetails.js";

const STATUS_PRIORITY = {
  PENDING: 1,
  PARTIAL: 2,
  PAID: 3,
};

const computeDemandStatus = (dueAmount, totalAmount) => {
  if (dueAmount <= 0) {
    return "PAID";
  }
  if (dueAmount >= totalAmount) {
    return "PENDING";
  }
  return "PARTIAL";
};

const applyAmountToBreakdown = (breakdown = [], amount = 0) => {
  let remaining = amount;
  const updated = breakdown.map((item) => ({ ...item.toObject?.() || item }));

  for (let i = 0; i < updated.length && remaining > 0; i += 1) {
    const headDue = Math.max((updated[i].amount || 0) - (updated[i].paid || 0), 0);
    if (headDue <= 0) {
      continue;
    }
    const payForHead = Math.min(headDue, remaining);
    updated[i].paid = (updated[i].paid || 0) + payForHead;
    remaining -= payForHead;
  }

  return updated;
};

const parseDateRange = (from, to) => {
  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

export const getAdminAccountOverview = async (req, res) => {
  try {
    const dateRange = parseDateRange(req.query.from, req.query.to);
    if (!dateRange) {
      return res.status(400).json({ message: "Invalid from/to date format" });
    }

    const [studentFeeRows, demandSummaryRows, dayWiseCollection] = await Promise.all([
      StudentFeeDetails.find()
        .populate("userId", "name email")
        .populate("programId", "programName")
        .populate("branchId", "branchName")
        .populate("batchId", "batchYear")
        .lean(),
      FeeDemand.aggregate([
        {
          $group: {
            _id: "$studentId",
            totalDemand: { $sum: "$totalAmount" },
            totalPaid: { $sum: "$paidAmount" },
            totalDue: { $sum: "$dueAmount" },
            statuses: { $addToSet: "$status" },
          },
        },
      ]),
      FeePaymentHistory.aggregate([
        {
          $match: {
            status: "SUCCESS",
            paidAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$paidAt",
              },
            },
            collectedAmount: { $sum: "$amount" },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const demandSummaryMap = new Map(
      demandSummaryRows.map((row) => [
        row._id,
        {
          totalDemand: row.totalDemand || 0,
          totalPaid: row.totalPaid || 0,
          totalDue: row.totalDue || 0,
          status: (row.statuses || []).reduce((acc, item) => (
            STATUS_PRIORITY[item] > STATUS_PRIORITY[acc] ? item : acc
          ), "PENDING"),
        },
      ])
    );

    const students = studentFeeRows.map((row) => {
      const demandSummary = demandSummaryMap.get(row.studentId) || {
        totalDemand: 0,
        totalPaid: 0,
        totalDue: 0,
        status: "PENDING",
      };

      return {
        _id: row._id,
        studentId: row.studentId,
        studentName: row.userId?.name || "",
        email: row.userId?.email || "",
        program: row.programId?.programName || "",
        branch: row.branchId?.branchName || "",
        batchYear: row.batchId?.batchYear || null,
        currentSemester: row.currentSemester,
        totalDemand: demandSummary.totalDemand,
        totalPaid: demandSummary.totalPaid,
        pendingAmount: demandSummary.totalDue,
        status: demandSummary.status,
      };
    });

    return res.json({
      message: "Accounts overview fetched successfully",
      dateRange: {
        from: dateRange.startDate,
        to: dateRange.endDate,
      },
      summary: {
        totalStudents: students.length,
        totalDemand: students.reduce((sum, item) => sum + item.totalDemand, 0),
        totalPaid: students.reduce((sum, item) => sum + item.totalPaid, 0),
        totalPending: students.reduce((sum, item) => sum + item.pendingAmount, 0),
      },
      students,
      dayWiseCollection: dayWiseCollection.map((item) => ({
        date: item._id,
        collectedAmount: item.collectedAmount,
        transactionCount: item.transactionCount,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAndAddBaseFees = async (req, res) => {
  try {
    if (req.method === "GET") {
      const branches = await Branch.find()
        .populate("programId", "programName durationYears totalSemesters")
        .lean();

      const programIds = [...new Set(branches.map((item) => String(item.programId?._id)).filter(Boolean))];
      const batches = await Batch.find({ programIds: { $in: programIds } })
        .populate("departmentId", "name")
        .lean();

      const response = branches.map((branch) => ({
        ...branch,
        batches: batches.filter((batch) =>
          (batch.programIds || []).some((programId) => String(programId) === String(branch.programId?._id))
        ),
      }));

      return res.json({
        message: "Base fees fetched successfully",
        count: response.length,
        branches: response,
      });
    }

    const { programId, branchName, semesterBaseFees = [] } = req.body;
    if (!programId || !branchName) {
      return res.status(400).json({ message: "programId and branchName are required" });
    }

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const createdBranch = await Branch.create({
      programId,
      branchName,
      semesterBaseFees,
    });

    await Program.findByIdAndUpdate(programId, { $addToSet: { branchIds: createdBranch._id } });

    const populated = await Branch.findById(createdBranch._id).populate("programId", "programName");
    return res.status(201).json({
      message: "Base fee branch created successfully",
      branch: populated,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Branch already exists for this program" });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const getOrUpdateBaseFeeByBranch = async (req, res) => {
  try {
    const { branchid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(branchid)) {
      return res.status(400).json({ message: "Invalid branch id" });
    }

    if (req.method === "GET") {
      const branch = await Branch.findById(branchid)
        .populate("programId", "programName durationYears totalSemesters")
        .lean();
      if (!branch) {
        return res.status(404).json({ message: "Branch not found" });
      }
      const linkedBatches = await Batch.find({ programIds: branch.programId?._id })
        .populate("departmentId", "name")
        .lean();

      return res.json({
        message: "Branch base fee fetched successfully",
        branch: {
          ...branch,
          batches: linkedBatches,
        },
      });
    }

    const { branchName, semesterBaseFees } = req.body;
    const updates = {};
    if (branchName !== undefined) {
      updates.branchName = branchName;
    }
    if (semesterBaseFees !== undefined) {
      updates.semesterBaseFees = semesterBaseFees;
    }

    const updatedBranch = await Branch.findByIdAndUpdate(branchid, updates, {
      new: true,
      runValidators: true,
    }).populate("programId", "programName");

    if (!updatedBranch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    return res.json({
      message: "Branch base fee updated successfully",
      branch: updatedBranch,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Branch with this name already exists in program" });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const getSubmitFeeStudents = async (req, res) => {
  try {
    const { search, programId, branchId, batchId, semester, status } = req.query;

    const studentFilter = {};
    if (programId) {
      studentFilter.programId = programId;
    }
    if (branchId) {
      studentFilter.branchId = branchId;
    }
    if (batchId) {
      studentFilter.batchId = batchId;
    }
    if (semester) {
      studentFilter.currentSemester = Number(semester);
    }
    if (search) {
      studentFilter.studentId = { $regex: search, $options: "i" };
    }

    const students = await StudentFeeDetails.find(studentFilter)
      .populate("userId", "name email")
      .populate("programId", "programName")
      .populate("branchId", "branchName")
      .populate("batchId", "batchYear")
      .lean();

    const studentIds = students.map((item) => item.studentId);
    const demandRows = studentIds.length
      ? await FeeDemand.aggregate([
          { $match: { studentId: { $in: studentIds } } },
          {
            $group: {
              _id: "$studentId",
              totalAmount: { $sum: "$totalAmount" },
              paidAmount: { $sum: "$paidAmount" },
              dueAmount: { $sum: "$dueAmount" },
              statuses: { $addToSet: "$status" },
            },
          },
        ])
      : [];

    const demandByStudentId = new Map(
      demandRows.map((row) => [
        row._id,
        {
          totalAmount: row.totalAmount || 0,
          paidAmount: row.paidAmount || 0,
          dueAmount: row.dueAmount || 0,
          status: (row.statuses || []).reduce((acc, item) => (
            STATUS_PRIORITY[item] > STATUS_PRIORITY[acc] ? item : acc
          ), "PENDING"),
        },
      ])
    );

    let rows = students.map((student) => {
      const demand = demandByStudentId.get(student.studentId) || {
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: "PENDING",
      };

      return {
        _id: student._id,
        studentId: student.studentId,
        studentName: student.userId?.name || "",
        email: student.userId?.email || "",
        program: student.programId?.programName || "",
        branch: student.branchId?.branchName || "",
        batchYear: student.batchId?.batchYear || null,
        semester: student.currentSemester,
        totalAmount: demand.totalAmount,
        paidAmount: demand.paidAmount,
        dueAmount: demand.dueAmount,
        status: demand.status,
      };
    });

    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter((item) =>
        item.studentId.toLowerCase().includes(needle)
        || item.studentName.toLowerCase().includes(needle)
        || item.email.toLowerCase().includes(needle)
      );
    }

    if (status) {
      rows = rows.filter((item) => item.status === status);
    }

    return res.json({
      message: "Submit fee students fetched successfully",
      count: rows.length,
      students: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const submitStudentFeeByAccounts = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const {
      demandId,
      amount,
      mode = "CASH",
      transactionId,
      paymentDetails = {},
      receiptNo,
      paidAt,
    } = req.body;

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }
    if (!["CASH", "CHEQUE"].includes(mode)) {
      return res.status(400).json({ message: "mode must be CASH or CHEQUE for this endpoint" });
    }

    const student = await StudentFeeDetails.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { studentId: id },
      ],
    }).session(session);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    session.startTransaction();

    const demandFilter = demandId
      ? { _id: demandId, studentId: student.studentId }
      : { studentId: student.studentId, dueAmount: { $gt: 0 } };

    const demand = await FeeDemand.findOne(demandFilter)
      .sort({ dueDate: 1, createdAt: 1 })
      .session(session);

    if (!demand) {
      await session.abortTransaction();
      return res.status(404).json({ message: "No pending fee demand found for this student" });
    }

    if (normalizedAmount > demand.dueAmount) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Amount cannot be greater than due amount for selected demand" });
    }

    const updatedPaidAmount = demand.paidAmount + normalizedAmount;
    const updatedDueAmount = Math.max(demand.totalAmount - updatedPaidAmount, 0);
    demand.paidAmount = updatedPaidAmount;
    demand.dueAmount = updatedDueAmount;
    demand.status = computeDemandStatus(updatedDueAmount, demand.totalAmount);
    demand.breakdown = applyAmountToBreakdown(demand.breakdown, normalizedAmount);
    await demand.save({ session });

    const payment = await FeePaymentHistory.create([{
      studentId: student.studentId,
      demandId: demand._id,
      amount: normalizedAmount,
      mode,
      status: "SUCCESS",
      transactionId,
      gateway: "NONE",
      paymentDetails,
      receiptNo,
      initiatedAt: paidAt ? new Date(paidAt) : new Date(),
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      createdBy: "ACCOUNTS",
      verifiedBy: req.userId || null,
    }], { session });

    await session.commitTransaction();

    const refreshedDemand = await FeeDemand.findById(demand._id).lean();
    return res.status(201).json({
      message: "Fee submitted successfully",
      studentId: student.studentId,
      payment: payment[0],
      demand: refreshedDemand,
    });
  } catch (error) {
    await session.abortTransaction();
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Duplicate receiptNo or transactionId" });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
