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

    bedTier: {
      type: String,
      trim: true,
      lowercase: true,
      default: "single",
    },

    capacity: {
      type: Number,
      min: 1,
      max: 20,
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
	      enum: ["Available", "Full", "Maintenance"],
	      default: "Available",
	    },
	  },
	  { timestamps: true }
	);

// Enforce uniqueness of room numbers within a hostel.
// NOTE: Some deployments previously created a legacy index on (hostelId, roomNumber).
// The correct field name in this schema is `hostel`.
roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });

export default mongoose.model("Room", roomSchema);
