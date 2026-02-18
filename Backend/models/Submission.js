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
      ref: "Student",
      required: true,
      index: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    marks: {
      type: Number,
      min: 0,
    },

    feedback: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["submitted", "graded", "returned"],
      default: "submitted",
    },

    isLate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, student: 1 });
submissionSchema.index({ student: 1 });

submissionSchema.pre("save", async function () {
  if (this.isNew) {
    const Assignment = mongoose.model("Assignment");
    const assignment = await Assignment.findById(this.assignment);
    
    if (assignment && assignment.dueDate) {
      this.isLate = this.submittedAt > assignment.dueDate;
    }
  }
});

export default mongoose.model("Submission", submissionSchema);
