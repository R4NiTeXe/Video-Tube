import mongoose from "mongoose";
import { Report } from "../models/report.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const validTargetTypes = ["video", "comment", "user"];
const validReasons = ["spam", "copyright", "harassment", "adult", "violence", "other"];
const validStatuses = ["pending", "reviewed", "resolved"];

const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;

  if (!targetType || !validTargetTypes.includes(targetType)) {
    throw new ApiError(400, "Invalid targetType. Must be one of: video, comment, user");
  }

  if (!targetId || !mongoose.isValidObjectId(targetId)) {
    throw new ApiError(400, "Invalid targetId");
  }

  if (!reason || !validReasons.includes(reason)) {
    throw new ApiError(400, "Invalid reason. Must be one of: spam, copyright, harassment, adult, violence, other");
  }

  const modelMap = {
    video: "Video",
    comment: "Comment",
    user: "User",
  };

  const Model = mongoose.model(modelMap[targetType]);
  const target = await Model.findById(targetId);

  if (!target) {
    throw new ApiError(404, `${targetType} not found`);
  }

  const report = await Report.create({
    reporter: req.user._id,
    targetType,
    targetId,
    reason,
    description: description?.trim() || "",
  });

  if (!report) {
    throw new ApiError(500, "Something went wrong while creating the report");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, report, "Report created successfully"));
});

const getReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const reports = await Report.find()
    .populate("reporter", "fullName avatar")
    .sort({ createdAt: -1 })
    .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
    .limit(Math.min(parseInt(limit, 10) || 10, 50));

  const total = await Report.countDocuments();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { reports, total, page: parseInt(page, 10), limit: parseInt(limit, 10) }, "Reports fetched successfully")
    );
});

const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(reportId)) {
    throw new ApiError(400, "Invalid report id");
  }

  if (!status || !validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid status. Must be one of: pending, reviewed, resolved");
  }

  const report = await Report.findByIdAndUpdate(
    reportId,
    { status },
    { new: true }
  );

  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report status updated successfully"));
});

export { createReport, getReports, updateReportStatus };
