import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.join(process.cwd(), "uploads", "faculty-content");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const sanitizeBaseName = (fileName = "file") =>
  String(fileName)
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = sanitizeBaseName(file.originalname || "file");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const fileFilter = (_req, file, cb) => {
  const type = String(file?.mimetype || "").toLowerCase();
  if (!allowedMimeTypes.has(type)) {
    return cb(
      new Error("Invalid file type. Please upload PDF, DOC, PPT, XLS, TXT, ZIP, JPG, PNG, or WEBP."),
      false
    );
  }
  return cb(null, true);
};

const courseContentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export default courseContentUpload;
