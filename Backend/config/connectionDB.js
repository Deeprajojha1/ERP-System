import mongoose from "mongoose";
import dotenv from "dotenv";
import Room from "../models/roomModel.js";
import ExamRegistration from "../models/ExamRegistration.js";
import FeeHostelYearly from "../models/feeHostelYearly.js";

dotenv.config();

const MONGO_RETRY_DELAY_MS = Number(process.env.MONGO_RETRY_DELAY_MS || 5000);
let retryCount = 0;
let retryTimer = null;

const ensureRoomIndexes = async () => {
  try {
    const indexes = await Room.collection.indexes().catch(() => []);
    const legacyIndex =
      indexes.find((index) => index?.name === "hostelId_1_roomNumber_1") ||
      indexes.find((index) => index?.key?.hostelId === 1 && index?.key?.roomNumber === 1);

    if (legacyIndex?.name) {
      await Room.collection.dropIndex(legacyIndex.name);
      console.log(`[DB] Dropped legacy rooms index: ${legacyIndex.name}`);
    }

    await Room.collection.createIndex(
      { hostel: 1, roomNumber: 1 },
      { unique: true, name: "hostel_1_roomNumber_1" }
    );
  } catch (error) {
    console.warn("[DB] Rooms index check failed:", error?.message || error);
  }
};

const ensureExamRegistrationIndexes = async () => {
  try {
    const indexes = await ExamRegistration.collection.indexes().catch(() => []);
    const oldIndex = indexes.find(
      (idx) => idx?.key?.student === 1 && idx?.key?.exam === 1 && idx?.unique === true
    );
    if (oldIndex?.name) {
      await ExamRegistration.collection.dropIndex(oldIndex.name);
      console.log(`[DB] Dropped old ExamRegistration index: ${oldIndex.name}`);
    }
    await ExamRegistration.syncIndexes();
    console.log("[DB] ExamRegistration indexes synced");
  } catch (error) {
    console.warn("[DB] ExamRegistration index check failed:", error?.message || error);
  }
};

const ensureFeeHostelYearlyIndexes = async () => {
  try {
    const indexes = await FeeHostelYearly.collection.indexes().catch(() => []);
    const oldIndex = indexes.find(
      (idx) => idx?.unique === true && idx?.key?.academicYear === 1 && idx?.key?.roomType !== 1
    );
    if (oldIndex?.name) {
      await FeeHostelYearly.collection.dropIndex(oldIndex.name);
      console.log(`[DB] Dropped old FeeHostelYearly index: ${oldIndex.name}`);
    }
    await FeeHostelYearly.syncIndexes();
    console.log("[DB] FeeHostelYearly indexes synced");
  } catch (error) {
    console.warn("[DB] FeeHostelYearly index check failed:", error?.message || error);
  }
};

const connectDB = async () => {
  const uri = String(process.env.MONGODB_URI || "").trim();
  if (!uri) {
    console.error("[DB] MONGODB_URI is missing. MongoDB connection skipped.");
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    retryCount = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    console.log("[DB] Successfully connected to MongoDB");
    await ensureRoomIndexes();
    await ensureExamRegistrationIndexes();
    await ensureFeeHostelYearlyIndexes();
  } catch (error) {
    retryCount += 1;
    console.error(
      `[DB] MongoDB connection failed (attempt ${retryCount}):`,
      error?.message || error
    );
    console.error(
      "[DB] Check Atlas IP whitelist/network and MONGODB_URI. Auto-retrying..."
    );

    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectDB();
      }, MONGO_RETRY_DELAY_MS);
    }
  }
};

export default connectDB;
