import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Department from "../models/Department.js";
import Program from "../models/feeProgram.js";
import Branch from "../models/feeBranch.js";
import Batch from "../models/feeBatch.js";
import User from "../models/userModel.js";
import Student from "../models/Student.js";
import Hostel from "../models/hostelModel.js";
import Room from "../models/roomModel.js";
import HostelAllocation from "../models/hostelAllocationModel.js";
import FeeHostelYearly from "../models/feeHostelYearly.js";
import FeeDemand from "../models/feeDemand.js";
import StudentFeeDetails from "../models/feeStudentDetails.js";
import {
  ensureStudentFeeProfileForEnrollment,
  syncHostelFeeForStudentAcademicYear,
} from "../controllers/feeController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ACADEMIC_YEAR_STUDENT = "2026-27";
const ACADEMIC_YEAR_FEE = "2026-2027";
const BASE_EMAIL_SUFFIX = "@dummy.local";

const upsertProgram = async () => {
  let program = await Program.findOne({ programName: "mca" });
  if (!program) {
    program = await Program.create({
      programName: "mca",
      durationYears: 2,
      totalSemesters: 4,
      branchIds: [],
    });
  }
  return program;
};

const upsertDepartment = async () => {
  let department = await Department.findOne({ name: "Computer Application", isDeleted: { $ne: true } });
  if (!department) {
    department = await Department.create({
      name: "Computer Application",
      program: ["mca"],
    });
  } else {
    const current = Array.isArray(department.program) ? department.program : [];
    if (!current.includes("mca")) {
      department.program = [...new Set([...current, "mca"])];
      await department.save();
    }
  }
  return department;
};

const upsertBranch = async ({ programId, branchName }) => {
  let branch = await Branch.findOne({ programId, branchName });
  if (!branch) {
    branch = await Branch.create({
      programId,
      branchName,
      semesterBaseFees: [
        { semesterNo: 1, baseFee: 50000 },
        { semesterNo: 2, baseFee: 50000 },
        { semesterNo: 3, baseFee: 50000 },
        { semesterNo: 4, baseFee: 50000 },
      ],
      hostelYearlyFee: 0,
      transportYearlyFee: 0,
    });
  }
  return branch;
};

const ensureProgramBranchLink = async ({ program, branch }) => {
  const ids = (program.branchIds || []).map((id) => String(id));
  if (!ids.includes(String(branch._id))) {
    program.branchIds = [...(program.branchIds || []), branch._id];
    await program.save();
  }
};

const upsertBatch = async ({ batchYear, departmentId, programId }) => {
  let batch = await Batch.findOne({ batchYear, departmentId });
  if (!batch) {
    batch = await Batch.create({
      batchYear,
      departmentId,
      programIds: [programId],
    });
  } else {
    const ids = (batch.programIds || []).map((id) => String(id));
    if (!ids.includes(String(programId))) {
      batch.programIds = [...(batch.programIds || []), programId];
      await batch.save();
    }
  }
  return batch;
};

const upsertHostelFeeRows = async () => {
  await FeeHostelYearly.findOneAndUpdate(
    { academicYear: ACADEMIC_YEAR_FEE, roomType: "2 SEATER" },
    { academicYear: ACADEMIC_YEAR_FEE, roomType: "2 SEATER", hostelYearlyFee: 95000 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await FeeHostelYearly.findOneAndUpdate(
    { academicYear: ACADEMIC_YEAR_FEE, roomType: "3 SEATER" },
    { academicYear: ACADEMIC_YEAR_FEE, roomType: "3 SEATER", hostelYearlyFee: 85000 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await FeeHostelYearly.findOneAndUpdate(
    { academicYear: ACADEMIC_YEAR_FEE, roomType: "5 SEATER" },
    { academicYear: ACADEMIC_YEAR_FEE, roomType: "5 SEATER", hostelYearlyFee: 75000 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const upsertHostel = async () => {
  let hostel = await Hostel.findOne({ name: "Dummy Flow Hostel" });
  if (!hostel) {
    hostel = await Hostel.create({
      name: "Dummy Flow Hostel",
      type: "Boys",
      totalFloors: 2,
      totalCapacity: 0,
      currentOccupancy: 0,
    });
  }
  return hostel;
};

const upsertStudentUser = async ({ enrollmentNumber, departmentId }) => {
  const email = `${enrollmentNumber.toLowerCase()}${BASE_EMAIL_SUFFIX}`;
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: `Dummy ${enrollmentNumber}`,
      email,
      role: "student",
      status: "active",
      passwordHash: "dummy_hash",
    });
  }

  let student = await Student.findOne({ enrollmentNumber, isDeleted: { $ne: true } });
  if (!student) {
    student = await Student.create({
      user: user._id,
      enrollmentNumber,
      department: departmentId,
      program: "mca",
      semester: 1,
      academicYear: ACADEMIC_YEAR_STUDENT,
      fatherName: "Dummy Father",
      fatherPhoneNumber: "9999999999",
      collegeEmail: email,
    });
  }

  return { user, student };
};

const upsertRoom = async ({ hostelId, roomNumber, bedTier, capacity }) => {
  let room = await Room.findOne({ hostel: hostelId, roomNumber });
  if (!room) {
    room = await Room.create({
      hostel: hostelId,
      roomNumber,
      floorNumber: 1,
      bedTier,
      capacity,
      occupants: [],
      status: "Available",
      price: 0,
      priceType: "Yearly",
    });
  }
  return room;
};

const ensureAllocation = async ({ studentId, hostelId, roomId }) => {
  let allocation = await HostelAllocation.findOne({ student: studentId, status: "Active" });
  if (!allocation) {
    allocation = await HostelAllocation.create({
      student: studentId,
      hostel: hostelId,
      room: roomId,
      status: "Active",
    });
  }
  await Room.updateOne({ _id: roomId }, { $addToSet: { occupants: studentId } });
  await Hostel.updateOne({ _id: hostelId }, { $inc: { currentOccupancy: 1 } });
  return allocation;
};

const verifyStudentFlow = async ({ enrollmentNumber, bedTier }) => {
  await ensureStudentFeeProfileForEnrollment(enrollmentNumber);
  const syncResult = await syncHostelFeeForStudentAcademicYear({
    enrollmentNumber,
    roomType: bedTier,
  });
  const profile = await StudentFeeDetails.findOne({ studentId: enrollmentNumber }).select("_id hostelOpted");
  const demands = await FeeDemand.find({
    studentMongoId: profile?._id,
    academicYear: ACADEMIC_YEAR_STUDENT,
  }).sort({ semesterNo: 1 });

  const rows = demands.map((d) => {
    const hostelRow = (d.breakdown || []).find((b) => String(b.head) === "HOSTEL");
    return {
      semesterNo: d.semesterNo,
      hostelAmount: Number(hostelRow?.amount || 0),
      dueAmount: Number(d.dueAmount || 0),
      status: d.status,
    };
  });

  return { syncResult, rows };
};

const main = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const department = await upsertDepartment();
  const program = await upsertProgram();
  const branch = await upsertBranch({ programId: program._id, branchName: department.name });
  await ensureProgramBranchLink({ program, branch });
  await upsertBatch({ batchYear: 2026, departmentId: department._id, programId: program._id });
  await upsertHostelFeeRows();
  const hostel = await upsertHostel();

  const student3 = await upsertStudentUser({
    enrollmentNumber: "DUMMYMCA3001",
    departmentId: department._id,
  });
  const room3 = await upsertRoom({
    hostelId: hostel._id,
    roomNumber: "D3-301",
    bedTier: "three-tier",
    capacity: 3,
  });
  await ensureAllocation({ studentId: student3.student._id, hostelId: hostel._id, roomId: room3._id });
  const report3 = await verifyStudentFlow({ enrollmentNumber: "DUMMYMCA3001", bedTier: "three-tier" });

  const student5 = await upsertStudentUser({
    enrollmentNumber: "DUMMYMCA5001",
    departmentId: department._id,
  });
  const room5 = await upsertRoom({
    hostelId: hostel._id,
    roomNumber: "D5-501",
    bedTier: "5-tier",
    capacity: 5,
  });
  await ensureAllocation({ studentId: student5.student._id, hostelId: hostel._id, roomId: room5._id });
  const report5 = await verifyStudentFlow({ enrollmentNumber: "DUMMYMCA5001", bedTier: "5-tier" });

  console.log("=== HOSTEL ROOM TYPE FLOW VERIFIED ===");
  console.log(
    JSON.stringify(
      {
        config: {
          academicYearStudent: ACADEMIC_YEAR_STUDENT,
          academicYearFee: ACADEMIC_YEAR_FEE,
          roomFees: {
            "2 SEATER": 95000,
            "3 SEATER": 85000,
            "5 SEATER": 75000,
          },
        },
        students: [
          {
            enrollmentNumber: "DUMMYMCA3001",
            bedTier: "three-tier",
            sync: report3.syncResult,
            demands: report3.rows,
          },
          {
            enrollmentNumber: "DUMMYMCA5001",
            bedTier: "5-tier",
            sync: report5.syncResult,
            demands: report5.rows,
          },
        ],
      },
      null,
      2
    )
  );
};

main()
  .catch((error) => {
    console.error("verifyHostelRoomTypeFlow failed:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
