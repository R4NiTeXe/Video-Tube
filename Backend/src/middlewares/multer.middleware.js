import multer from "multer";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

const isTest = process.env.NODE_ENV === "test";

const TEMP_UPLOAD_PATH = "./public/temp";

// Ensure temp directory exists at startup (not per-request)
if (!isTest && !fs.existsSync(TEMP_UPLOAD_PATH)) {
  fs.mkdirSync(TEMP_UPLOAD_PATH, { recursive: true });
}

export const MAX_VIDEO_SIZE = (parseInt(process.env.MAX_VIDEO_SIZE_MB) || 20) * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = (parseInt(process.env.MAX_THUMBNAIL_SIZE_MB) || 2) * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DANGEROUS_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi",
  ".scr", ".pif", ".vb", ".vbs", ".vbe",
  ".js", ".jse", ".ws", ".wsf", ".wsh",
  ".ps1", ".psm1", ".psd1", ".dll", ".ocx",
  ".sh", ".bash", ".py", ".pl", ".rb",
  ".jar", ".class", ".swf",
]);

// Magic bytes for file signature validation
const MAGIC_BYTES = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "video/mp4": [0x00, 0x00, 0x00],
  "video/quicktime": [0x00, 0x00, 0x00],
  "video/webm": [0x1A, 0x45, 0xDF, 0xA3],
};

const readMagicBytes = (filePath, bytes = 8) => {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(bytes);
    fs.readSync(fd, buffer, 0, bytes, 0);
    fs.closeSync(fd);
    return Array.from(buffer.subarray(0, bytes));
  } catch {
    return [];
  }
};

const validateMagicBytes = (filePath, mimetype) => {
  const expected = MAGIC_BYTES[mimetype];
  if (!expected) return true;
  const actual = readMagicBytes(filePath, expected.length);
  if (actual.length < expected.length) return false;
  return expected.every((byte, i) => actual[i] === byte);
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new ApiError(400, `File type "${ext}" is not allowed for upload`), false);
  }

  const isVideo = file.fieldname === "videoFile";
  const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;

  if (!allowedTypes.includes(file.mimetype)) {
    const typeLabel = isVideo ? "video" : "image";
    return cb(new ApiError(400, `Invalid ${typeLabel} type. Allowed: ${allowedTypes.join(", ")}`), false);
  }
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_UPLOAD_PATH);
  },
  filename: function (req, file, cb) {
    let extension = path.extname(file.originalname).toLowerCase();
    // Enforce extension based on mimetype to prevent double extension / mismatch attacks
    const mimeToExt = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
      "video/x-msvideo": ".avi",
      "video/x-matroska": ".mkv",
      "video/webm": ".webm"
    };
    extension = mimeToExt[file.mimetype] || extension;
    cb(null, `${file.fieldname}-${Date.now()}-${randomUUID()}${extension}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
});

export const MAX_IMAGE_SIZE = (parseInt(process.env.MAX_IMAGE_SIZE_MB) || 5) * 1024 * 1024;

const FIELD_SIZE_LIMITS = {
  videoFile: MAX_VIDEO_SIZE,
  thumbnail: MAX_THUMBNAIL_SIZE,
  avatar: MAX_IMAGE_SIZE,
  coverImage: MAX_IMAGE_SIZE,
  banner: MAX_IMAGE_SIZE,
  image: MAX_IMAGE_SIZE,
};

export const validateFileSize = (req, res, next) => {
  const filesToCheck = [];
  if (req.files) {
    for (const fieldName of Object.keys(req.files)) {
      for (const file of req.files[fieldName]) {
        filesToCheck.push({ file, fieldName });
      }
    }
  }
  if (req.file) {
    filesToCheck.push({ file: req.file, fieldName: req.file.fieldname });
  }

  for (const { file, fieldName } of filesToCheck) {
    const maxBytes = FIELD_SIZE_LIMITS[fieldName];
    if (!maxBytes) continue;

    const { size } = fs.statSync(file.path);

    if (size > maxBytes) {
      fs.unlinkSync(file.path);
      const sizeMB = maxBytes / 1024 / 1024;
      const fieldLabels = { videoFile: "Video", thumbnail: "Thumbnail", avatar: "Avatar", coverImage: "Cover Image", banner: "Banner", image: "Image" };
      const fieldLabel = fieldLabels[fieldName] || fieldName;
      throw new ApiError(413, `${fieldLabel} size must be ${sizeMB} MB or less`);
    }

    // Validate file magic bytes against declared mime type (skipped in tests)
    if (!isTest && !validateMagicBytes(file.path, file.mimetype)) {
      fs.unlinkSync(file.path);
      const fieldLabels = { videoFile: "Video", thumbnail: "Thumbnail", avatar: "Avatar", coverImage: "Cover Image", banner: "Banner", image: "Image" };
      const fieldLabel = fieldLabels[fieldName] || fieldName;
      throw new ApiError(400, `${fieldLabel} file content does not match declared type`);
    }
  }

  next();
};
