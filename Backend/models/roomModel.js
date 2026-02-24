import mongoose from "mongoose";
import "./hostelModel.js";

const roomSchema = new mongoose.Schema(
  {
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },

    roomNumber: {
      type: String,
      required: true,
    },

    floorNumber: Number,

    capacity: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true,
    },

price: {
  type: Number,
  min: 0,
},

priceType: {
  type: String,
  enum: ["Yearly", "Semester"],
  default: "Yearly",
},

    occupants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    status: {
      type: String,
      enum: ["Available", "Full"],
      default: "Available",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);