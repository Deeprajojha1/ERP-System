import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mimeType = String(file?.mimetype || "").toLowerCase();
  const originalName = String(file?.originalname || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || originalName.endsWith(".pdf");

  if (!isPdf) {
    return cb(new Error("Only PDF files are allowed for LinkedIn analyzer uploads."), false);
  }

  return cb(null, true);
};

const linkedinPdfUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

export default linkedinPdfUpload;
