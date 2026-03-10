import mongoose from "mongoose";

const admitCardSubjectSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, trim: true, required: true },
    subjectName: { type: String, trim: true, required: true },
  },
  { _id: false }
);

const admitCardSnapshotSchema = new mongoose.Schema(
  {
    candidateName: { type: String, trim: true, required: true },
    studentNameHindi: { type: String, trim: true, default: "" },
    fatherName: { type: String, trim: true, default: "" },
    motherName: { type: String, trim: true, default: "" },
    studentEmail: { type: String, trim: true, lowercase: true, default: "" },
    mobileNumber: { type: String, trim: true, default: "" },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "TRANSGENDER", "OTHER", ""],
      default: "",
    },
    dateOfBirth: { type: Date, default: null },
    formSerialNumber: { type: String, trim: true, default: "" },
    rollNo: { type: String, trim: true, required: true },
    enrollmentNumber: { type: String, trim: true, required: true },
    academicBankCreditId: { type: String, trim: true, default: "" },
    aadharNumber: { type: String, trim: true, default: "" },
    digilockerId: { type: String, trim: true, default: "" },
    addressLine: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    pinCode: { type: String, trim: true, default: "" },
    courseName: { type: String, trim: true, default: "" },
    branchName: { type: String, trim: true, default: "" },
    batchLabel: { type: String, trim: true, default: "" },
    year: { type: Number, min: 1, max: 10, default: null },
    semester: { type: Number, min: 1, max: 12, default: null },
    groupName: { type: String, trim: true, default: "" },
    examinationCentre: { type: String, trim: true, default: "" },
    examSession: { type: String, trim: true, default: "" },
    photoUrl: { type: String, trim: true, default: "" },
    thumbImpressionUrl: { type: String, trim: true, default: "" },
    studentSignatureUrl: { type: String, trim: true, default: "" },
    declarationAccepted: { type: Boolean, default: false },
    declarationAcceptedAt: { type: Date, default: null },
    subjects: { type: [admitCardSubjectSchema], default: [] },
  },
  { _id: false }
);

const admitCardSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamRegistration",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },

    admitCardNo: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    issueStatus: {
      type: String,
      enum: ["PENDING", "ISSUED", "HOLD", "CANCELLED"],
      default: "PENDING",
    },

    // Store eligibility decision at issue time (fee integration ready)
    eligibilitySnapshot: {
      thresholdPercent: { type: Number, min: 0, max: 100, default: 75 },
      paidPercent: { type: Number, min: 0, max: 100, default: 0 },
      isEligible: { type: Boolean, default: false },
      source: {
        type: String,
        enum: ["MANUAL", "FEE_MODULE"],
        default: "MANUAL",
      },
      checkedAt: { type: Date, default: Date.now },
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    issuedAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    holdReason: {
      type: String,
      trim: true,
      default: "",
    },

    // Invigilator-side hall verification status for issued admit cards.
    invigilatorVerification: {
      status: {
        type: String,
        enum: ["PENDING", "VERIFIED"],
        default: "PENDING",
      },
      verifiedByFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Faculty",
        default: null,
      },
      verifiedByUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      remark: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Immutable print snapshot to keep historical admit card unchanged
    snapshot: {
      type: admitCardSnapshotSchema,
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

admitCardSchema.index(
  { registration: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);
admitCardSchema.index({ student: 1, exam: 1, issueStatus: 1, isDeleted: 1 });

export default mongoose.model("AdmitCard", admitCardSchema);
