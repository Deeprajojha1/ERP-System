import mongoose from "mongoose";

const FeeCalendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    eventDate: { type: Date, required: true },
    eventType: { type: String, default: "General" },
    academicYear: { type: String, trim: true, default: "" },
    semesterNo: { type: Number, min: 1, max: 20 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FeeCalendarEvent", FeeCalendarEventSchema);
