import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/connectionDB.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./Routes/userRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";
import facultyRoutes from "./Routes/facultyRoutes.js";
import studentRoutes from "./Routes/studentRoutes.js";
dotenv.config();

const app = express();
// CORS configuration
const allowedOrigins = [
  "http://localhost:5173", // Local development
  "https://hu-erp1-d8op.vercel.app", // Production Vercel
  process.env.FRONTEND_URL // Additional flexibility via environment variable
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
// Database connection
connectDB();
// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// routes
app.use('/api/user/', userRoutes)
app.use('/api/admin/', adminRoutes)
app.use('/api/faculty/', facultyRoutes)
app.use('/api/student/', studentRoutes)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export default app;