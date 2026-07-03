import mongoose from "mongoose";
import crypto from "crypto";
import { LiveStream } from "../models/liveStream.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createStream = asyncHandler(async (req, res) => {
  const { title, description, category, tags } = req.body;

  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  // Check if user already has an active stream
  const existingStream = await LiveStream.findOne({
    streamer: req.user._id,
    isLive: true,
  });
  if (existingStream) {
    throw new ApiError(409, "You already have an active stream");
  }

  const streamKey = crypto.randomBytes(16).toString("hex");

  let parsedTags = [];
  if (tags) {
    if (typeof tags === "string") {
      parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
  }

  const stream = await LiveStream.create({
    streamer: req.user._id,
    title: title.trim(),
    description: description?.trim() || "",
    streamKey,
    category: category?.trim() || "Just Chatting",
    tags: parsedTags,
  });

  return res.status(201).json(new ApiResponse(201, stream, "Stream created"));
});

const goLive = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream id");
  }

  const stream = await LiveStream.findById(streamId);
  if (!stream) throw new ApiError(404, "Stream not found");
  if (stream.streamer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  stream.isLive = true;
  stream.startedAt = new Date();
  stream.viewerCount = 0;
  await stream.save();

  return res.status(200).json(new ApiResponse(200, stream, "You are now live!"));
});

const endStream = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream id");
  }

  const stream = await LiveStream.findById(streamId);
  if (!stream) throw new ApiError(404, "Stream not found");
  if (stream.streamer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  stream.isLive = false;
  stream.endedAt = new Date();
  stream.viewerCount = 0;
  await stream.save();

  return res.status(200).json(new ApiResponse(200, stream, "Stream ended"));
});

const getActiveStreams = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category } = req.query;

  const matchStage = { isLive: true };
  if (category?.trim()) {
    matchStage.category = category.trim();
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [streams, total] = await Promise.all([
    LiveStream.find(matchStage)
      .populate("streamer", "fullName username avatar")
      .sort({ viewerCount: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    LiveStream.countDocuments(matchStage),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { docs: streams, totalDocs: total, page: pageNumber }, "Active streams fetched")
  );
});

const getStreamById = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream id");
  }

  const stream = await LiveStream.findById(streamId)
    .populate("streamer", "fullName username avatar isVerified")
    .lean();

  if (!stream) throw new ApiError(404, "Stream not found");

  return res.status(200).json(new ApiResponse(200, stream, "Stream fetched"));
});

const incrementViewerCount = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream id");
  }

  const stream = await LiveStream.findByIdAndUpdate(
    streamId,
    { $inc: { viewerCount: 1, totalViewers: 1 } },
    { new: true }
  );

  if (!stream) throw new ApiError(404, "Stream not found");

  return res.status(200).json(new ApiResponse(200, { viewerCount: stream.viewerCount }, "Viewer count updated"));
});

const decrementViewerCount = asyncHandler(async (req, res) => {
  const { streamId } = req.params;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream id");
  }

  const stream = await LiveStream.findByIdAndUpdate(
    streamId,
    { $inc: { viewerCount: -1 } },
    { new: true }
  );

  if (!stream) throw new ApiError(404, "Stream not found");

  return res.status(200).json(new ApiResponse(200, { viewerCount: Math.max(0, stream.viewerCount) }, "Viewer count updated"));
});

const getUserStream = asyncHandler(async (req, res) => {
  const stream = await LiveStream.findOne({
    streamer: req.user._id,
    isLive: true,
  }).lean();

  return res.status(200).json(new ApiResponse(200, stream || null, "User stream fetched"));
});

export {
  createStream,
  goLive,
  endStream,
  getActiveStreams,
  getStreamById,
  incrementViewerCount,
  decrementViewerCount,
  getUserStream,
};
