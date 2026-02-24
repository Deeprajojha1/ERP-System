import mongoose from "mongoose";
import "./roomModel.js";

const foodMenuSchema = new mongoose.Schema({
  day: String,
  breakfast: String,
  lunch: String,
  snacks: String,
  dinner: String
});

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["Boys", "Girls"],
    required: true,
  },
  totalFloors: Number,

  warden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Faculty",
    required: true
  },

  rooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  }],

  foodMenu: [foodMenuSchema],

  totalCapacity: {
    type: Number,
    default: 0
  },

  currentOccupancy: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

export default mongoose.model("Hostel", hostelSchema);