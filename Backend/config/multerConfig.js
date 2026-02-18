import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure profile images directory exists
const profileImagesDir = path.join(uploadsDir, "profile-images");
if (!fs.existsSync(profileImagesDir)) {
  fs.mkdirSync(profileImagesDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("[Multer] Saving file to:", profileImagesDir);
    cb(null, profileImagesDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and original name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}-${uniqueSuffix}${ext}`;
    console.log("[Multer] Generated filename:", filename);
    cb(null, filename);
  },
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  console.log("[Multer File Filter]", {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });
  
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    console.log("[Multer File Filter] File accepted");
    cb(null, true);
  } else {
    console.log("[Multer File Filter] File rejected - not an image");
    cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP)"), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
});

// Helper function to get file URL
export const getFileUrl = (filename) => {
  if (!filename) return null;
  
  // Get the base URL from environment or use default
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'http://localhost:3000'
    : 'http://localhost:3000';
  
  return `${baseUrl}/uploads/profile-images/${filename}`;
};

// Helper function to delete file
export const deleteFile = (filename) => {
  if (!filename) return;
  const filePath = path.join(profileImagesDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default upload;
