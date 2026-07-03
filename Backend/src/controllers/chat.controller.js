import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { LiveStream } from "../models/liveStream.model.js";
import mongoose from "mongoose";

// Get chat messages for a stream (with polling support via since param)
const getStreamChat = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { since, limit = 50 } = req.query;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream ID");
  }

  const filter = { stream: streamId };
  if (since) {
    filter.createdAt = { $gt: new Date(since) };
  }

  const messages = await ChatMessage.find(filter)
    .populate("sender", "fullName username avatar")
    .sort({ createdAt: -1 })
    .limit(Math.min(parseInt(limit, 10) || 50, 100))
    .lean();

  return res.status(200).json(new ApiResponse(200, messages.reverse(), "Chat messages fetched"));
});

// Send a chat message
const sendChatMessage = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream ID");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Message content is required");
  }

  const stream = await LiveStream.findById(streamId);
  if (!stream) {
    throw new ApiError(404, "Stream not found");
  }

  if (!stream.isLive) {
    throw new ApiError(400, "This stream is not live");
  }

  const message = await ChatMessage.create({
    stream: streamId,
    sender: req.user._id,
    content: content.trim().slice(0, 500),
    type: "message",
  });

  const populated = await ChatMessage.findById(message._id)
    .populate("sender", "fullName username avatar");

  return res.status(201).json(new ApiResponse(201, populated, "Message sent"));
});

// Get unread message count since a timestamp
const getUnreadCount = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { since } = req.query;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream ID");
  }

  const filter = { stream: streamId };
  if (since) {
    filter.createdAt = { $gt: new Date(since) };
  }

  const count = await ChatMessage.countDocuments(filter);

  return res.status(200).json(new ApiResponse(200, { count }, "Unread count"));
});

export {
  getStreamChat,
  sendChatMessage,
  getUnreadCount,
};
