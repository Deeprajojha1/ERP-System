import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    program: [
      {
        type: String,
        enum: ["btech", "mtech", "bca", "mca", "bba", "mba","bsc", "msc", "bpharma","mpharma","phd"],
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
