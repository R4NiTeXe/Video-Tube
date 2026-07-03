import multer from "multer";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

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
