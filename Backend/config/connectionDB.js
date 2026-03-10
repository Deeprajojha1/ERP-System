import mongoose from "mongoose";
import dotenv from "dotenv";
import Room from "../models/roomModel.js";
import ExamRegistration from "../models/ExamRegistration.js";

dotenv.config();

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

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Successfully connected to MongoDB");
    await ensureRoomIndexes();
    await ensureExamRegistrationIndexes();
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
