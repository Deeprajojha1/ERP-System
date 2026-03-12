import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.join(process.cwd(), "uploads", "fee-bulk");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = String(file.originalname || "bulk.csv").replace(/[^\w.-]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const name = String(file.originalname || "").toLowerCase();
  if (!name.endsWith(".csv")) {
    return cb(new Error("Only CSV files are allowed."), false);
  }
  return cb(null, true);
};

const feeBulkUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export default feeBulkUpload;
