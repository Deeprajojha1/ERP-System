import mongoose from "mongoose";
import dotenv from "dotenv";
import Batch from "../models/feeBatch.js";

dotenv.config();

const DRY_RUN = !process.argv.includes("--apply");

const parseBatchWindow = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const full = raw.match(/^(\d{4})-(\d{4})$/);
  if (full) {
    const start = Number(full[1]);
    const end = Number(full[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < 2000 || start > 2100 || end < start || end > 2105) return null;
    return { start, end, normalized: `${start}-${end}` };
  }

  const firstYearMatch = raw.match(/(\d{4})/);
  if (!firstYearMatch) return null;

  const start = Number(firstYearMatch[1]);
  if (!Number.isFinite(start) || start < 2000 || start > 2100) return null;

  const years = raw.match(/\d{4}/g) || [];
  const second = years.length > 1 ? Number(years[1]) : start + 1;
  const end = Number.isFinite(second) && second >= start ? second : start + 1;

  return { start, end, normalized: `${start}-${end}` };
};

const migrate = async () => {
  const mongoUri = String(process.env.MONGODB_URI || "").trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  const docs = await Batch.find({}).select("_id batchYear batchStartYear").lean();

  const summary = {
    total: docs.length,
    toUpdate: 0,
    unchanged: 0,
    invalid: 0,
  };

  const invalidIds = [];
  const ops = [];

  for (const doc of docs) {
    const parsed = parseBatchWindow(doc.batchYear);
    if (!parsed) {
      summary.invalid += 1;
      invalidIds.push(String(doc._id));
      continue;
    }

    const currentBatchYear = String(doc.batchYear ?? "").trim();
    const currentStartYear = Number(doc.batchStartYear);
    const isSame =
      currentBatchYear === parsed.normalized &&
      Number.isFinite(currentStartYear) &&
      currentStartYear === parsed.start;

    if (isSame) {
      summary.unchanged += 1;
      continue;
    }

    summary.toUpdate += 1;
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            batchYear: parsed.normalized,
            batchStartYear: parsed.start,
          },
        },
      },
    });
  }

  console.log("\nFee Batch Migration Summary");
  console.log("---------------------------");
  console.log(`Mode      : ${DRY_RUN ? "DRY RUN" : "APPLY"}`);
  console.log(`Total     : ${summary.total}`);
  console.log(`To update : ${summary.toUpdate}`);
  console.log(`Unchanged : ${summary.unchanged}`);
  console.log(`Invalid   : ${summary.invalid}`);

  if (summary.invalid > 0) {
    console.log("Invalid IDs:", invalidIds.join(", "));
  }

  if (!DRY_RUN && ops.length) {
    const result = await Batch.bulkWrite(ops, { ordered: false });
    console.log("\nWrite Result");
    console.log("------------");
    console.log(`Matched  : ${result.matchedCount || 0}`);
    console.log(`Modified : ${result.modifiedCount || 0}`);
  }

  if (DRY_RUN) {
    console.log("\nNo documents were modified. Run with --apply to persist changes.");
  }
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
