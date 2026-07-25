import multer from "multer";
import mongoose from "mongoose";
import { ZodError } from "zod";
import logger from "../utils/logger.js";

const isProduction = process.env.NODE_ENV === "production";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    const issues = Array.isArray(err.issues) ? err.issues : err.errors || [];
    errors = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
      message: e.message,
      code: e.code,
    }));
  }

  
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      code: "invalid_value",
    }));
  }

  
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid resource identifier";
    errors = [{ field: err.path, message: "Invalid format", code: "invalid_id" }];
  }

  
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `${field} already exists`;
    errors = [{ field, message, code: "duplicate" }];
  }

  
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  
  else if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON in request body";
  }

  
  else if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = "File size exceeds the allowed limit";
    } else {
      statusCode = 400;
      message = `Upload error: ${err.message}`;
    }
  }

  
  else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors || [];
  }

  
  else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body too large";
  }

  
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, {
      statusCode,
      message,
      stack: isProduction ? undefined : err.stack,
    });
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode}`, { message, ...(errors.length ? { errors } : {}) });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: statusCode >= 500 && isProduction ? "Internal Server Error" : message,
    ...(errors.length > 0 ? { errors } : {}),
    ...(err.attemptsRemaining !== undefined ? { attemptsRemaining: err.attemptsRemaining } : {}),
  });
};

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export { errorHandler, notFoundHandler };
