import mongoose from "mongoose";
import { Caption } from "../models/caption.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const addCaption = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { language, label } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  if (!language?.trim() || !label?.trim()) {
    throw new ApiError(400, "Language and label are required");
  }

  const captionFileLocalPath = req.files?.captionsFile?.[0]?.path;
  if (!captionFileLocalPath) {
    throw new ApiError(400, "Caption file is required");
  }

  const captionsFile = await uploadOnCloudinary(captionFileLocalPath);
  if (!captionsFile) {
    throw new ApiError(400, "Error uploading caption file");
  }

  // Check for existing caption in same language
  const existing = await Caption.findOne({ video: videoId, language: language.toLowerCase().trim() });
  if (existing) {
    throw new ApiError(409, "Caption for this language already exists. Update it instead.");
  }

  const caption = await Caption.create({
    video: videoId,
    language: language.toLowerCase().trim(),
    label: label.trim(),
    captionsFile: captionsFile.url,
    captionsFilePublicId: captionsFile.public_id,
    owner: req.user._id,
  });

  return res.status(201).json(new ApiResponse(201, caption, "Caption added successfully"));
});

const getCaptions = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const captions = await Caption.find({ video: videoId })
    .select("language label captionsFile createdAt")
    .lean();

  return res.status(200).json(new ApiResponse(200, captions, "Captions fetched successfully"));
});

const updateCaption = asyncHandler(async (req, res) => {
  const { captionId } = req.params;
  const { label } = req.body;

  if (!mongoose.isValidObjectId(captionId)) {
    throw new ApiError(400, "Invalid caption id");
  }

  const caption = await Caption.findById(captionId);
  if (!caption) throw new ApiError(404, "Caption not found");
  if (caption.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  const captionFileLocalPath = req.files?.captionsFile?.[0]?.path;
  if (captionFileLocalPath) {
    // Delete old file
    if (caption.captionsFilePublicId) {
      await deleteFromCloudinary(caption.captionsFilePublicId);
    }
    const newFile = await uploadOnCloudinary(captionFileLocalPath);
    if (!newFile) throw new ApiError(400, "Error uploading new caption file");
    caption.captionsFile = newFile.url;
    caption.captionsFilePublicId = newFile.public_id;
  }

  if (label?.trim()) caption.label = label.trim();
  await caption.save();

  return res.status(200).json(new ApiResponse(200, caption, "Caption updated successfully"));
});

const deleteCaption = asyncHandler(async (req, res) => {
  const { captionId } = req.params;

  if (!mongoose.isValidObjectId(captionId)) {
    throw new ApiError(400, "Invalid caption id");
  }

  const caption = await Caption.findById(captionId);
  if (!caption) throw new ApiError(404, "Caption not found");
  if (caption.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  if (caption.captionsFilePublicId) {
    await deleteFromCloudinary(caption.captionsFilePublicId);
  }
  await Caption.findByIdAndDelete(captionId);

  return res.status(200).json(new ApiResponse(200, {}, "Caption deleted successfully"));
});

export { addCaption, getCaptions, updateCaption, deleteCaption };
