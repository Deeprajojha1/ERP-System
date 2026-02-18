import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      enum: ["pdf", "img", "docs", "ppt"],
      required: true,
    },

    marks: {
      type: Number,
      default: null,
    },

    feedback: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["submitted", "late"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index(
  { assignment: 1, student: 1 },
  { unique: true }
);

export default mongoose.model("Submission", submissionSchema);
