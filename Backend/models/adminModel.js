import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  aadharNumber: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  DOB: {
    type: Date,
    required: true,
  },
  role: {
    type: String,
    default: "admin",
  },
  status: {
    type: String,
    enum: ["active", "inactive", "leave", "onleave"],
    default: "active",
  },
  profileImage: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
