import mongoose from "mongoose";
import FeeCounter from "./feeCounter.js";

const examRegistrationSchema = new mongoose.Schema(
  {
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

    // Registration level state
    registrationStatus: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "VERIFIED", "REJECTED"],
      default: "DRAFT",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    // Identity + academic fields (snapshot/editable for exam office)
    candidateName: { type: String, required: true, trim: true },
    studentNameHindi: { type: String, trim: true, default: "" },
    rollNo: { type: String, required: true, trim: true },
    enrollmentNumber: { type: String, required: true, trim: true },
    formSerialNumber: { type: String, trim: true, default: "" },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, trim: true, default: "" },
    studentEmail: { type: String, trim: true, lowercase: true, default: "" },
    mobileNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Mobile number must be 10 digits"],
      default: "",
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "TRANSGENDER", "OTHER", ""],
      default: "",
    },
    dateOfBirth: { type: Date, default: null },
    fatherPhoneNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Father phone number must be 10 digits"],
      default: "",
    },
    motherPhoneNumber: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, "Mother phone number must be 10 digits"],
      default: "",
    },
    fatherOccupation: { type: String, trim: true, default: "" },
    motherOccupation: { type: String, trim: true, default: "" },

    aadharNumber: {
      type: String,
      trim: true,
      match: [/^\d{12}$/, "Aadhar number must be 12 digits"],
      default: "",
    },
    academicBankCreditId: { type: String, trim: true, default: "" },
    apaarId: { type: String, trim: true, default: "" },
    digilockerId: { type: String, trim: true, default: "" },
    addressLine: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    pinCode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, "Pin code must be 6 digits"],
      default: "",
    },

    tenthMarksPercent: { type: Number, min: 0, max: 100, default: null },
    twelfthMarksPercent: { type: Number, min: 0, max: 100, default: null },

    courseName: { type: String, trim: true, default: "" },
    branchName: { type: String, trim: true, default: "" },
    batchLabel: { type: String, trim: true, default: "" },
    academicSession: { type: String, trim: true, default: "" },
    year: { type: Number, min: 1, max: 10, default: null },
    semester: { type: Number, min: 1, max: 12, default: null },
    groupName: { type: String, trim: true, default: "" },
    examinationCentre: { type: String, trim: true, default: "" },

    // Required for admit card layout
    photoUrl: { type: String, trim: true, default: "" },
    thumbImpressionUrl: { type: String, trim: true, default: "" },
    studentSignatureUrl: { type: String, trim: true, default: "" },
    declarationAccepted: { type: Boolean, default: false },
    declarationAcceptedAt: { type: Date, default: null },

    // Subject rows for admit card printing
    subjects: {
      type: [
        {
          course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            default: null,
          },
          subjectCode: { type: String, trim: true, required: true },
          subjectName: { type: String, trim: true, required: true },
        },
      ],
      default: [],
    },

    // Prepared for future fee integration
    feeEligibility: {
      isEligible: { type: Boolean, default: false },
      eligiblePercent: { type: Number, min: 0, max: 100, default: 0 },
      thresholdPercent: { type: Number, min: 0, max: 100, default: 75 },
      eligibilityCheckedAt: { type: Date, default: null },
      eligibilitySource: {
        type: String,
        enum: ["NONE", "MANUAL", "FEE_MODULE"],
        default: "NONE",
      },
    },

    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

examRegistrationSchema.index(
  { student: 1, exam: 1, createdAt: -1 },
  {
    partialFilterExpression: { isDeleted: false },
  }
);

const EXAM_REG_SERIAL_KEY = "exam_registration_form_serial";

const getNextExamRegistrationSerial = async () => {
  const counter = await FeeCounter.findOneAndUpdate(
    { key: EXAM_REG_SERIAL_KEY },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return String(counter?.seq || 0).padStart(6, "0");
};

examRegistrationSchema.pre("validate", async function autoAssignFormSerial(next) {
  try {
    if (!this.isNew) return next();
    if (String(this.formSerialNumber || "").trim()) return next();
    this.formSerialNumber = await getNextExamRegistrationSerial();
    return next();
  } catch (error) {
    return next(error);
  }
});
examRegistrationSchema.index({ exam: 1, registrationStatus: 1, isDeleted: 1 });
examRegistrationSchema.index({ rollNo: 1, isDeleted: 1 });

export default mongoose.model("ExamRegistration", examRegistrationSchema);

