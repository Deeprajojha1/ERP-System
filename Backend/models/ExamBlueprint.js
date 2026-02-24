import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["MCQ", "SHORT", "LONG"],
      required: true,
    },
    questionCount: {
      type: Number,
      required: true,
      min: 1,
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      min: 1,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const syllabusItemSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      trim: true,
      default: "",
    },
    topics: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const examBlueprintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examType: {
      type: String,
      enum: ["MID_TERM", "END_TERM", "UNIT_TEST"],
      required: true,
    },
    numberOfUnits: {
      type: Number,
      min: 1,
      max: 30,
      default: null,
    },
    syllabus: {
      type: [syllabusItemSchema],
      default: [],
    },
    sections: {
      type: [sectionSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one section is required",
      },
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 480,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    scheduleStart: {
      type: Date,
      required: true,
    },
    scheduleEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "CLOSED"],
      default: "DRAFT",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

examBlueprintSchema.pre("validate", function () {
  const sectionTotal = (this.sections || []).reduce(
    (sum, item) => sum + Number(item?.totalMarks || 0),
    0
  );

  if (sectionTotal !== Number(this.totalMarks || 0)) {
    throw new Error("totalMarks must match sum of section totalMarks");
  }

  if (this.scheduleEnd <= this.scheduleStart) {
    throw new Error("scheduleEnd must be greater than scheduleStart");
  }

  if (this.numberOfUnits != null && (this.syllabus || []).length > Number(this.numberOfUnits)) {
    throw new Error("syllabus units cannot exceed numberOfUnits");
  }
});

examBlueprintSchema.index({ teacherId: 1, examType: 1, status: 1, scheduleStart: 1 });

export default mongoose.model("ExamBlueprint", examBlueprintSchema);
