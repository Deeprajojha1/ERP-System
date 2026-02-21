import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      required: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },

    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
      index: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    totalSubmissions: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ group: 1, uploadedBy: 1 });

assignmentSchema.pre("save", function () {
  if (this.dueDate && this.dueDate < Date.now()) {
    this.status = "closed";
  }
});

export default mongoose.model("Assignment", assignmentSchema);
