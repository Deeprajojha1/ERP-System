import mongoose from "mongoose";
import dotenv from "dotenv";
import Group from "../models/Group.js";
import Batch from "../models/feeBatch.js";
import Student from "../models/Student.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

const toId = (value) => String(value || "").trim();

const migrate = async () => {
  const mongoUri = String(process.env.MONGODB_URI || "").trim();
  if (!mongoUri) throw new Error("MONGODB_URI is missing in environment");

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const groups = await Group.find({ isDeleted: { $ne: true } })
    .select("_id name department batchId")
    .lean();

  const summary = {
    totalGroups: groups.length,
    linked: 0,
    unchanged: 0,
    noStudents: 0,
    noBatchOnStudents: 0,
    ambiguous: 0,
    invalidBatchDept: 0,
  };

  const ambiguousGroups = [];
  const invalidDeptGroups = [];
  const updates = [];

  for (const group of groups) {
    const groupId = toId(group._id);
    const groupDeptId = toId(group.department);

    const students = await Student.find({ group: group._id, isDeleted: { $ne: true } })
      .select("_id batchId")
      .lean();

    if (!students.length) {
      summary.noStudents += 1;
      continue;
    }

    const batchCountMap = new Map();
    for (const student of students) {
      const batchId = toId(student.batchId);
      if (!batchId) continue;
      batchCountMap.set(batchId, (batchCountMap.get(batchId) || 0) + 1);
    }

    if (!batchCountMap.size) {
      summary.noBatchOnStudents += 1;
      continue;
    }

    const entries = Array.from(batchCountMap.entries()).sort((a, b) => b[1] - a[1]);

    if (entries.length > 1) {
      summary.ambiguous += 1;
      ambiguousGroups.push({
        groupId,
        groupName: group.name,
        candidates: entries,
      });
      continue;
    }

    const resolvedBatchId = entries[0][0];
    const batchDoc = await Batch.findById(resolvedBatchId).select("_id departmentId").lean();

    if (!batchDoc || toId(batchDoc.departmentId) !== groupDeptId) {
      summary.invalidBatchDept += 1;
      invalidDeptGroups.push({
        groupId,
        groupName: group.name,
        batchId: resolvedBatchId,
        groupDepartmentId: groupDeptId,
        batchDepartmentId: toId(batchDoc?.departmentId),
      });
      continue;
    }

    const currentBatchId = toId(group.batchId);
    if (currentBatchId === resolvedBatchId) {
      summary.unchanged += 1;
      continue;
    }

    summary.linked += 1;
    updates.push({
      groupId,
      currentBatchId,
      resolvedBatchId,
    });
  }

  console.log("\nGroup->Batch Link Migration Summary");
  console.log("----------------------------------");
  console.log(`Mode               : ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Total groups       : ${summary.totalGroups}`);
  console.log(`Will link          : ${summary.linked}`);
  console.log(`Already linked     : ${summary.unchanged}`);
  console.log(`No students        : ${summary.noStudents}`);
  console.log(`No batch on student: ${summary.noBatchOnStudents}`);
  console.log(`Ambiguous          : ${summary.ambiguous}`);
  console.log(`Batch/Dept mismatch: ${summary.invalidBatchDept}`);

  if (ambiguousGroups.length) {
    console.log("\nAmbiguous groups (multiple student batches):");
    for (const row of ambiguousGroups) {
      const candidates = row.candidates
        .map(([id, count]) => `${id}(${count})`)
        .join(", ");
      console.log(`- ${row.groupName} [${row.groupId}] -> ${candidates}`);
    }
  }

  if (invalidDeptGroups.length) {
    console.log("\nSkipped (batch department mismatch):");
    for (const row of invalidDeptGroups) {
      console.log(
        `- ${row.groupName} [${row.groupId}] batch=${row.batchId} groupDept=${row.groupDepartmentId} batchDept=${row.batchDepartmentId}`
      );
    }
  }

  if (!APPLY) {
    console.log("\nNo documents were modified. Run with --apply to persist changes.");
    return;
  }

  for (const row of updates) {
    if (row.currentBatchId && row.currentBatchId !== row.resolvedBatchId) {
      await Batch.findByIdAndUpdate(row.currentBatchId, {
        $pull: { groupId: row.groupId },
      });
    }

    await Group.findByIdAndUpdate(row.groupId, {
      $set: { batchId: row.resolvedBatchId },
    });

    await Batch.findByIdAndUpdate(row.resolvedBatchId, {
      $addToSet: { groupId: row.groupId },
    });
  }

  console.log("\nApplied updates:", updates.length);
};

(async () => {
  try {
    await migrate();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error?.message || error);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  }
})();
