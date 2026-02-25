// 

import mongoose from "mongoose";
import { normalizeProgramValue, PROGRAM_ENUM } from "../utils/programNormalization.js";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    program: [
      {
        type: String,
        enum: PROGRAM_ENUM,
        set: normalizeProgramValue,
        required: true,
      },
    ],

    hod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);