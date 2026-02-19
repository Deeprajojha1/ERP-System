import mongoose from "mongoose";

const subjectResultSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    subjectCode: { type: String, trim: true, required: true },
    subjectName: { type: String, trim: true, required: true },
    credits: { type: Number, required: true, min: 0 },
    marksObtained: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, min: 1 },
    examType: {
      type: String,
      enum: ["MIDTERM", "ENDSEM", "ENDTERM", "PRACTICAL", "BACK"],
      default: "MIDTERM",
    },
    grade: { type: String, trim: true, default: "" },
    gradePoint: { type: Number, min: 0, max: 10, default: 0 },
    status: {
      type: String,
      enum: ["PASS", "FAIL", "ABSENT"],
      required: true,
    },
    attemptNo: { type: Number, min: 1, default: 1 },
    isBackPaper: { type: Boolean, default: false },
    isClearedBack: { type: Boolean, default: false },
  },
  { _id: false },
);

const semesterSummarySchema = new mongoose.Schema(
  {
    semester: { type: Number, min: 1, max: 12, required: true },
    sgpa: { type: Number, min: 0, max: 10, default: 0 },
    totalCredits: { type: Number, min: 0, default: 0 },
    earnedCredits: { type: Number, min: 0, default: 0 },
    totalBack: { type: Number, min: 0, default: 0 },
    activeBack: { type: Number, min: 0, default: 0 },
    clearedBack: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const cumulativeSchema = new mongoose.Schema(
  {
    cgpa: { type: Number, min: 0, max: 10, default: 0 },
    totalBack: { type: Number, min: 0, default: 0 },
    activeBack: { type: Number, min: 0, default: 0 },
    clearedBack: { type: Number, min: 0, default: 0 },
    semWiseSgpa: {
      type: [
        {
          semester: { type: Number, min: 1, max: 12, required: true },
          academicYear: { type: String, trim: true, default: "" },
          sgpa: { type: Number, min: 0, max: 10, required: true },
          totalCredits: { type: Number, min: 0, default: 0 },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    academicYear: { type: String, trim: true, required: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    resultDate: { type: Date, default: Date.now },
    publishStatus: {
      type: String,
      enum: ["DRAFT", "PUBLISHED"],
      default: "DRAFT",
    },
    overallStatus: {
      type: String,
      enum: ["PASS", "FAIL"],
      default: "PASS",
    },

    subjects: {
      type: [subjectResultSchema],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one subject result is required",
      },
    },

    semesterSummary: {
      type: semesterSummarySchema,
      required: true,
    },

    cumulative: {
      type: cumulativeSchema,
      default: () => ({}),
    },

    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true },
);

resultSchema.index(
  { student: 1, academicYear: 1, semester: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

resultSchema.index({ student: 1, resultDate: -1, isDeleted: 1 });
resultSchema.index({
  department: 1,
  semester: 1,
  publishStatus: 1,
  isDeleted: 1,
});

export default mongoose.model("Result", resultSchema);