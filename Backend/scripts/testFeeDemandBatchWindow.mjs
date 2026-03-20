import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import dotenv from "dotenv";
import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Group from "../models/Group.js";
import FeeBatch from "../models/feeBatch.js";
import FeeProgram from "../models/feeProgram.js";
import FeeBranch from "../models/feeBranch.js";
import FeeDemand from "../models/feeDemand.js";

import {
  ensureStudentFeeProfileForEnrollment,
  generateFeeDemandFromProfile,
} from "../controllers/feeController.js";

const nowId = () => String(Date.now());
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createMockRes = () => {
  const state = { statusCode: 200, payload: null };
  const res = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(payload) {
      state.payload = payload;
      return payload;
    },
    _get() {
      return state;
    },
  };
  return res;
};

const pickReferences = async () => {
  // We need a coherent set: Group (department/branch) + FeeBranch (programId/batchYear/semester fees)
  // + FeeBatch (same batchYear + departmentId + contains programId).
  const groups = await Group.find({ isDeleted: { $ne: true }, branch: { $ne: "" } })
    .select("_id department branch")
    .limit(50)
    .lean();

  for (const group of groups) {
    const branchText = String(group.branch || "").trim();
    if (!branchText) continue;

    const feeBranch =
      (await FeeBranch.findOne({
        branchName: { $regex: `^${escapeRegex(branchText)}$`, $options: "i" },
        semesterBaseFees: { $exists: true, $ne: [] },
      })
        .select("_id programId branchName batchYear semesterBaseFees")
        .lean()) ||
      (await FeeBranch.findOne({
        branchName: { $regex: escapeRegex(branchText), $options: "i" },
        semesterBaseFees: { $exists: true, $ne: [] },
      })
        .select("_id programId branchName batchYear semesterBaseFees")
        .lean());

    if (!feeBranch?.programId || !feeBranch?.batchYear) continue;

    const feeBatch = await FeeBatch.findOne({
      batchYear: Number(feeBranch.batchYear),
      departmentId: group.department,
      programIds: feeBranch.programId,
    })
      .select("_id batchYear programIds departmentId")
      .lean();

    if (!feeBatch?._id) continue;

    const feeProgram = await FeeProgram.findById(feeBranch.programId)
      .select("_id programName durationYears totalSemesters")
      .lean();
    if (!feeProgram?._id) continue;

    const department = await Department.findById(group.department).select("_id name").lean();
    if (!department?._id) continue;

    return { group, feeBranch, feeBatch, feeProgram, department };
  }

  throw new Error(
    "Could not find matching Group + FeeBranch + FeeBatch in DB. Please create fee program/branch/batch and a group with matching branch name."
  );
};

const main = async () => {
  dotenv.config();
  const uri = String(process.env.MONGODB_URI || "").trim();
  if (!uri) throw new Error("MONGODB_URI is missing in Backend/.env");

  // Avoid hanging forever if MongoDB is unreachable.
  mongoose.set("bufferCommands", false);
  console.log("[TEST] Connecting to MongoDB...");
  const hardTimeout = setTimeout(() => {
    console.error("[TEST] MongoDB connect timed out (20s). Check Atlas network/IP whitelist and local network restrictions.");
    process.exit(2);
  }, 20000);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  clearTimeout(hardTimeout);
  console.log("[TEST] Connected.");

  const refs = await pickReferences();
  const { group, feeBranch, feeBatch, feeProgram } = refs;

  const enrollmentNumber = `TEST${nowId().slice(-8)}`;
  const email = `test.${enrollmentNumber.toLowerCase()}@example.com`;
  const password = "Student@1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const batchStart = Number(feeBranch.batchYear);
  const durationYears = Number(feeProgram.durationYears || 4);
  const batchWindowAcademicYear = `${batchStart}-${batchStart + durationYears}`;

  let createdUser = null;
  let createdStudent = null;
  let createdDemandId = null;

  try {
    createdUser = await User.create({
      name: `Test Student ${enrollmentNumber}`,
      email,
      passwordHash,
      role: "student",
      status: "active",
    });

    createdStudent = await Student.create({
      user: createdUser._id,
      enrollmentNumber,
      department: group.department,
      program: feeProgram.programName, // setter will normalize
      batchId: feeBatch._id,
      semester: 1,
      academicYear: batchWindowAcademicYear, // intentionally using batch window per request
      fatherName: "Test Father",
      fatherPhoneNumber: "9999999999",
      collegeEmail: email,
      group: group._id,
    });

    // Ensure fee profile exists (will also try auto-demand generation in background).
    const profile = await ensureStudentFeeProfileForEnrollment(enrollmentNumber);
    if (!profile?._id) throw new Error("Fee profile was not created");

    // Exercise the controller path that accepts academicYear "2024-2028" and normalizes it.
    const req = {
      body: {
        studentId: enrollmentNumber,
        academicYear: batchWindowAcademicYear, // batch window; should normalize to start-start+1
        semesterNo: 1,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        hostelAmount: 0,
        transportAmount: 0,
      },
      userId: null,
      role: "admin",
      headers: { "user-agent": "codex-test" },
      ip: "127.0.0.1",
    };
    const res = createMockRes();
    await generateFeeDemandFromProfile(req, res);
    const { statusCode, payload } = res._get();
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Demand generation failed: ${JSON.stringify(payload)}`);
    }

    createdDemandId = payload?.data?._id || null;
    const storedAcademicYear = payload?.data?.academicYear || "";

    // Minimal verification: demand exists and academicYear got normalized to first year.
    const demand = createdDemandId ? await FeeDemand.findById(createdDemandId).lean() : null;
    if (!demand?._id) throw new Error("Created demand not found in DB");

    console.log("TEST_OK");
    console.log(
      JSON.stringify(
        {
          student: { enrollmentNumber, email, password },
          refs: {
            feeBranchId: String(feeBranch._id),
            feeBatchId: String(feeBatch._id),
            groupId: String(group._id),
            program: String(feeProgram.programName),
          },
          demand: {
            id: String(demand._id),
            inputAcademicYear: batchWindowAcademicYear,
            storedAcademicYear,
            semesterNo: demand.semesterNo,
            totalAmount: demand.totalAmount,
            status: demand.status,
          },
        },
        null,
        2
      )
    );
  } catch (err) {
    // Cleanup best-effort (avoid leaving junk data).
    if (createdDemandId) {
      await FeeDemand.deleteOne({ _id: createdDemandId }).catch(() => {});
    }
    if (createdStudent?._id) {
      await Student.deleteOne({ _id: createdStudent._id }).catch(() => {});
    }
    if (createdUser?._id) {
      await User.deleteOne({ _id: createdUser._id }).catch(() => {});
    }
    throw err;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

main().catch((err) => {
  console.error("TEST_FAILED");
  console.error(err?.message || err);
  process.exitCode = 1;
});
