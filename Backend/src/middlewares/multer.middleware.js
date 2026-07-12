import multer from "multer";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

export const MAX_VIDEO_SIZE = (parseInt(process.env.MAX_VIDEO_SIZE_MB) || 20) * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = (parseInt(process.env.MAX_THUMBNAIL_SIZE_MB) || 2) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempUploadPath = "./public/temp";
    fs.mkdirSync(tempUploadPath, { recursive: true });
    cb(null, tempUploadPath);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}-${randomUUID()}${extension}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

const FIELD_SIZE_LIMITS = {
  videoFile: MAX_VIDEO_SIZE,
  thumbnail: MAX_THUMBNAIL_SIZE,
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
      const fieldLabel = fieldName === "videoFile" ? "Video" : "Thumbnail";
      throw new ApiError(413, `${fieldLabel} size must be ${sizeMB} MB or less`);
    }
  }

  next();
};
