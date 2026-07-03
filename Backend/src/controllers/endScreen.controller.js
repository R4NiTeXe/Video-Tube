import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { EndScreen } from "../models/endScreen.model.js";
import { Video } from "../models/video.model.js";

const getEndScreen = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId?.trim()) {
    throw new ApiError(400, "Video ID is required");
  }

  const endScreen = await EndScreen.findOne({ video: videoId })
    .populate("elements.videoId", "title thumbnail")
    .populate("elements.playlistId", "title thumbnail");

  if (!endScreen) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "No end screen found for this video"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, endScreen, "End screen fetched successfully"));
});

const updateEndScreen = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { elements } = req.body;

  if (!videoId?.trim()) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!elements || !Array.isArray(elements)) {
    throw new ApiError(400, "Elements array is required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }

  const endScreen = await EndScreen.findOneAndUpdate(
    { video: videoId, owner: req.user._id },
    {
      $set: { elements },
    },
    { new: true, upsert: true, runValidators: true }
  )
    .populate("elements.videoId", "title thumbnail")
    .populate("elements.playlistId", "title thumbnail");

  return res
    .status(200)
    .json(new ApiResponse(200, endScreen, "End screen updated successfully"));
});

const deleteEndScreen = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId?.trim()) {
    throw new ApiError(400, "Video ID is required");
  }

  const endScreen = await EndScreen.findOne({ video: videoId });

  if (!endScreen) {
    throw new ApiError(404, "No end screen found for this video");
  }

  if (endScreen.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not the owner of this video");
  }

  await EndScreen.findByIdAndDelete(endScreen._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "End screen deleted successfully"));
});

export { getEndScreen, updateEndScreen, deleteEndScreen };
