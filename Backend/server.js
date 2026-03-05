import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/connectionDB.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import userRoutes from "./Routes/userRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";
import facultyRoutes from "./Routes/facultyRoutes.js";
import studentRoutes from "./Routes/studentRoutes.js";
import attendanceRoutes from "./Routes/attendanceRoutes.js";
import sectionRoutes from "./Routes/sectionRoutes.js"
import sectionCourseRoutes from "./Routes/sectionCourseRoutes.js"
import timeTableRoutes from "./Routes/timeTableRoutes.js"
import placementRoutes from "./Routes/placementRoutes.js"
import externalJobRoutes from "./Routes/externalJobRoutes.js"
import dns from "node:dns/promises"
dns.setServers(["1.1.1.1","8.8.8.8"])
import hostelRoutes from "./Routes/hostelRoutes.js";
import roomRoutes from "./Routes/roomRoutes.js";
import hostelAllocationRoutes from "./Routes/hostelAllocationRoutes.js";
import wardenRoutes from "./Routes/wardenRoutes.js";

dotenv.config();

const app = express();
// CORS configuration
// NOTE: Origin is only scheme + host (+ optional port), no path.
const normalizeOrigin = (value = "") => String(value).trim().replace(/\/+$/, "");
const envOrigins = String(process.env.FRONTEND_URL || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const allowedOrigins = [
  "https://hu-erp-git-development-subeshs-projects.vercel.app",
  "https://hu-erp-git-development-subeshs-projects.vercel.app",
  "https://hu-erp1.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  ...envOrigins,
].map(normalizeOrigin);

const isLocalDevOrigin = (origin = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
const isTrustedVercelOrigin = (origin = "") =>
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

console.log("[CORS] Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g., curl, mobile apps)
      if (!origin) {
        console.log("[CORS] Request with no origin allowed");
        return callback(null, true);
      }

      console.log("[CORS] Incoming origin:", origin);

      const normalized = normalizeOrigin(origin);
      const isAllowed =
        allowedOrigins.includes(normalized) ||
        isLocalDevOrigin(normalized) ||
        isTrustedVercelOrigin(normalized);

      if (!isAllowed) {
        console.error("[CORS] Blocked origin:", origin, "Allowed:", allowedOrigins);
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }

      console.log("[CORS] Origin allowed:", origin);
      return callback(null, true);
    },
    credentials: true,
  })
);
// Database connection
connectDB();
// Body parser
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf?.toString("utf8") || "";
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// routes
app.use('/api/user/', userRoutes)
app.use('/api/admin/', adminRoutes)
app.use('/api/faculty/', facultyRoutes)
app.use('/api/student/', studentRoutes)
app.use('/api/attendance/', attendanceRoutes)
app.use("/api/sections/", sectionRoutes);
app.use("/api/section-courses/", sectionCourseRoutes);
app.use("/api/timetable/", timeTableRoutes);
app.use("/api/placement/", placementRoutes);
app.use("/api/external-jobs", externalJobRoutes);


app.use("/api/hostels", hostelRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/hostel-allocation", hostelAllocationRoutes);
app.use("/api/warden", wardenRoutes);
// Handle malformed JSON payloads from clients.
app.use((err, req, res, next) => {
  console.error("[Server Error Handler]", err);
  
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      message: "Invalid JSON payload. Please send valid JSON in request body.",
    });
  }
  return next(err);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;
