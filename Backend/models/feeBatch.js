import mongoose from "mongoose";

const BatchSchema = new mongoose.Schema({
  batchYear: {
    type: String,
    required: true,
    trim: true
  },

  batchStartYear: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100,
  },

  programIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Program",
    required: true
  }],

  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true
  },

  groupId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group"
  }]

}, { timestamps: true });

BatchSchema.index({ batchYear: 1, departmentId: 1 }, { unique: true });
BatchSchema.index({ batchStartYear: 1, departmentId: 1 });

export default mongoose.model("Batch", BatchSchema);