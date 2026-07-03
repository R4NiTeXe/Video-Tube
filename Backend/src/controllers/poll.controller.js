import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Poll } from "../models/poll.model.js";
import mongoose from "mongoose";

// Create a poll
const createPoll = asyncHandler(async (req, res) => {
  const { question, options, videoId, endsAt } = req.body;

  if (!question?.trim()) {
    throw new ApiError(400, "Question is required");
  }

  if (!Array.isArray(options) || options.length < 2 || options.length > 10) {
    throw new ApiError(400, "Provide between 2 and 10 options");
  }

  const cleanOptions = options.map((o) => ({ text: String(o).trim() })).filter((o) => o.text);
  if (cleanOptions.length < 2) {
    throw new ApiError(400, "At least 2 non-empty options are required");
  }

  if (endsAt && new Date(endsAt) <= new Date()) {
    throw new ApiError(400, "End time must be in the future");
  }

  const poll = await Poll.create({
    question: question.trim(),
    options: cleanOptions,
    createdBy: req.user._id,
    video: videoId || undefined,
    endsAt: endsAt || undefined,
  });

  return res.status(201).json(new ApiResponse(201, poll, "Poll created"));
});

// Get polls for a video
const getVideoPolls = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const polls = await Poll.find({ video: videoId, isActive: true })
    .populate("createdBy", "fullName username avatar")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, polls, "Polls fetched"));
});

// Get a single poll
const getPollById = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  if (!mongoose.isValidObjectId(pollId)) {
    throw new ApiError(400, "Invalid poll ID");
  }

  const poll = await Poll.findById(pollId)
    .populate("createdBy", "fullName username avatar");

  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  return res.status(200).json(new ApiResponse(200, poll, "Poll fetched"));
});

// Vote on a poll
const votePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { optionIndex } = req.body;

  if (!mongoose.isValidObjectId(pollId)) {
    throw new ApiError(400, "Invalid poll ID");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (!poll.isActive) {
    throw new ApiError(400, "This poll is no longer active");
  }

  if (poll.endsAt && new Date() > poll.endsAt) {
    poll.isActive = false;
    await poll.save();
    throw new ApiError(400, "This poll has ended");
  }

  if (typeof optionIndex !== "number" || optionIndex < 0 || optionIndex >= poll.options.length) {
    throw new ApiError(400, "Invalid option index");
  }

  // Remove previous vote if any
  poll.options.forEach((opt) => {
    opt.voters = opt.voters.filter((id) => id.toString() !== req.user._id.toString());
  });

  // Add new vote
  poll.options[optionIndex].voters.push(req.user._id);
  await poll.save();

  return res.status(200).json(new ApiResponse(200, poll, "Vote recorded"));
});

// Delete a poll (only creator)
const deletePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  if (!mongoose.isValidObjectId(pollId)) {
    throw new ApiError(400, "Invalid poll ID");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (poll.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the poll creator can delete it");
  }

  await Poll.findByIdAndDelete(pollId);

  return res.status(200).json(new ApiResponse(200, null, "Poll deleted"));
});

// Close a poll (only creator)
const closePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;

  if (!mongoose.isValidObjectId(pollId)) {
    throw new ApiError(400, "Invalid poll ID");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (poll.createdBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the poll creator can close it");
  }

  poll.isActive = false;
  await poll.save();

  return res.status(200).json(new ApiResponse(200, poll, "Poll closed"));
});

export {
  createPoll,
  getVideoPolls,
  getPollById,
  votePoll,
  deletePoll,
  closePoll,
};
