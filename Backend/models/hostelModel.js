import mongoose from "mongoose";
import "./roomModel.js";

const foodMenuSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
    trim: true,
  },
  breakfast: {
    type: String,
    trim: true,
    default: "",
  },
  lunch: {
    type: String,
    trim: true,
    default: "",
  },
  snacks: {
    type: String,
    trim: true,
    default: "",
  },
  dinner: {
    type: String,
    trim: true,
    default: "",
  },
  breakfastTime: {
    type: String,
    trim: true,
    default: "07:30 AM",
  },
  lunchTime: {
    type: String,
    trim: true,
    default: "01:00 PM",
  },
  snacksTime: {
    type: String,
    trim: true,
    default: "05:00 PM",
  },
  dinnerTime: {
    type: String,
    trim: true,
    default: "08:00 PM",
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
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
    required: false,
    default: null,
  },

	wardenName: {
	  type: String,
	  trim: true,
	  default: "",
	},

	wardens: [
	  {
	    type: mongoose.Schema.Types.ObjectId,
	    ref: "User",
	  },
	],

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

hostelSchema.path("wardens").validate(function (value) {
  if (!Array.isArray(value)) return true;
  return value.length <= 5;
}, "A hostel can have at most 5 wardens.");

export default mongoose.model("Hostel", hostelSchema);
