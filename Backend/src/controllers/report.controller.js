import mongoose from "mongoose";
import { Report } from "../models/report.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const REASONS = [
  "spam",
  "harassment",
  "nudity",
  "violence",
  "misinformation",
  "hate_speech",
  "copyright",
  "other",
];

const createReport = asyncHandler(async (req, res) => {
  const { targetType, target, reason, description } = req.body;

  if (!targetType || !["video", "comment", "user"].includes(targetType)) {
    throw new ApiError(400, "Invalid target type. Must be 'video', 'comment', or 'user'");
  }

  if (!target || !mongoose.isValidObjectId(target)) {
    throw new ApiError(400, "Valid target ID is required");
  }

  if (!reason || !REASONS.includes(reason)) {
    throw new ApiError(400, `Invalid reason. Must be one of: ${REASONS.join(", ")}`);
  }

  if (description && description.length > 1000) {
    throw new ApiError(400, "Description must be under 1000 characters");
  }

  // Verify the target exists
  const targetModel = targetType === "video" ? Video : targetType === "comment" ? Comment : User;
  const targetExists = await targetModel.findById(target).lean();
  if (!targetExists) {
    throw new ApiError(404, `Target ${targetType} not found`);
  }

  // Prevent duplicate active reports from the same user on the same target
  const existing = await Report.findOne({
    reporter: req.user._id,
    targetType,
    target,
    status: "pending",
  });

  if (existing) {
    throw new ApiError(400, "You have already reported this content. It is being reviewed.");
  }

  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    target,
    reason,
    description: description?.trim() || "",
  });

  return res.status(201).json(new ApiResponse(201, report, "Report submitted successfully"));
});

const getMyReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [reports, totalCount] = await Promise.all([
    Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Report.countDocuments({ reporter: req.user._id }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      docs: reports,
      totalDocs: totalCount,
      page: pageNumber,
      limit: limitNumber,
    }, "Reports fetched")
  );
});

export { createReport, getMyReports };
