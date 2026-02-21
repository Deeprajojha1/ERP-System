import mongoose from "mongoose";

const BatchSchema = new mongoose.Schema({
  batchYear: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
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
  }

}, { timestamps: true });

BatchSchema.index({ batchYear: 1, departmentId: 1 }, { unique: true });

export default mongoose.model("Batch", BatchSchema);
