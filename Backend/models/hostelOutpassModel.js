import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema, "counters");

const hostelOutpassSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: Number,
      unique: true,
      index: true,
      min: 1,
    },
    formDate: {
      type: Date,
      default: Date.now,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    category: {
      type: String,
      enum: ["Holiday", "Weekend", "Festival", "Medical", "Emergency", "Other"],
      required: true,
    },
    destination: {
      type: String,
      trim: true,
      default: "",
      maxlength: 250,
    },
    emergencyContact: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    parentContact: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    dateFrom: {
      type: Date,
      required: true,
    },
    dateTo: {
      type: Date,
      required: true,
    },
    outingTime: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5,
    },
    incomingTime: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Exited", "Returned", "Rejected", "Cancelled"],
      default: "Pending",
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    studentName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    branchName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    programName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 40,
    },
    roomNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },
    approvedByName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    entryTime: {
      type: Date,
      default: null,
    },
    logs: [
      {
        action: { type: String, trim: true, default: "" },
        timestamp: { type: Date, default: Date.now },
        by: { type: String, trim: true, default: "" },
        remarks: { type: String, trim: true, default: "" },
      },
    ],
    qr: {
      key: {
        type: String,
        trim: true,
        default: "",
        select: false,
      },
      issuedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      scanCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxScans: {
        type: Number,
        default: 2,
        min: 1,
      },
      active: {
        type: Boolean,
        default: false,
      },
      lastScannedAt: {
        type: Date,
        default: null,
      },
      destroyedAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

hostelOutpassSchema.index({ student: 1, status: 1, dateFrom: -1 });

hostelOutpassSchema.pre("validate", async function assignSerialNumber() {
  if (!this.isNew || this.serialNumber) return;
  const counter = await Counter.findByIdAndUpdate(
    "hostel_outpass_serial",
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  this.serialNumber = Number(counter?.seq || 1);
});

export default mongoose.model("HostelOutpass", hostelOutpassSchema);
