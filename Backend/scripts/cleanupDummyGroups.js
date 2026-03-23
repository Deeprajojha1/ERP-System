import mongoose from "mongoose";
import dotenv from "dotenv";
import Group from "../models/Group.js";
import Batch from "../models/feeBatch.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

const toId = (value) => String(value || "").trim();

const run = async () => {
  const mongoUri = String(process.env.MONGODB_URI || "").trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const dummyGroups = await Group.find({ name: /^DUMMY-GRP-/i })
    .select("_id name batchId")
    .lean();

  const groupIds = dummyGroups.map((group) => group._id);
  const idStrings = new Set(groupIds.map((id) => toId(id)));

  const linkedBatchIds = Array.from(
    new Set(dummyGroups.map((group) => toId(group.batchId)).filter(Boolean))
  );

  console.log("\nDummy Group Cleanup Summary");
  console.log("---------------------------");
  console.log(`Mode            : ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Dummy groups    : ${dummyGroups.length}`);
  console.log(`Linked batches  : ${linkedBatchIds.length}`);

  if (!dummyGroups.length) {
    console.log("No DUMMY-GRP-* groups found. Nothing to clean.");
    return;
  }

  console.log("\nPreview:");
  for (const group of dummyGroups.slice(0, 20)) {
    console.log(`- ${group.name} [${group._id}]`);
  }

  if (!APPLY) {
    console.log("\nNo documents were modified. Run with --apply to delete.");
    return;
  }

  if (linkedBatchIds.length) {
    await Batch.updateMany(
      { _id: { $in: linkedBatchIds } },
      { $pull: { groupId: { $in: Array.from(idStrings) } } }
    );
  }

  const deleted = await Group.deleteMany({ _id: { $in: groupIds } });

  console.log("\nApply Result");
  console.log("------------");
  console.log(`Deleted groups: ${deleted.deletedCount || 0}`);
};

(async () => {
  try {
    await run();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error?.message || error);
    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }
    process.exit(1);
  }
})();
