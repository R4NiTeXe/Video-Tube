import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Video } from "../../models/video.model.js";
import { Like } from "../../models/like.model.js";
import { Comment } from "../../models/comment.model.js";
import { Notification } from "../../models/notification.model.js";
import { User } from "../../models/user.model.js";
import { Playlist } from "../../models/playlist.model.js";
import { Poll } from "../../models/poll.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateHlsManifest,
  generateVideoQualities,
  getPublicIdFromCloudinaryUrl,
} from "../../utils/cloudinary.js";
import mongoose from "mongoose";
import logger from "../../utils/logger.js";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, tags, category, chapters, scheduledAt } =
    req.body;

  if (
    [title, description].some(
      (field) => typeof field !== "string" || !field.trim()
    )
  ) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoUpload = await uploadOnCloudinary(videoFileLocalPath, "video");
  if (!videoUpload) {
    throw new ApiError(400, "Error while uploading video file");
  }

  const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailUpload) {
    await deleteFromCloudinary(
      videoUpload.secure_url || videoUpload.url,
      "video"
    );
    throw new ApiError(400, "Error while uploading thumbnail");
  }

  let parsedTags = [];
  if (tags) {
    if (typeof tags === "string") {
      parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
  }

  let parsedChapters = [];
  if (chapters) {
    try {
      parsedChapters =
        typeof chapters === "string" ? JSON.parse(chapters) : chapters;
      if (!Array.isArray(parsedChapters)) parsedChapters = [];
      parsedChapters = parsedChapters.filter(
        (ch) => ch && ch.title && typeof ch.startTime === "number"
      );
    } catch {
      parsedChapters = [];
    }
  }

  let scheduledDate = null;
  if (scheduledAt) {
    scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      await deleteFromCloudinary(
        videoUpload.secure_url || videoUpload.url,
        "video"
      );
      await deleteFromCloudinary(
        thumbnailUpload.secure_url || thumbnailUpload.url,
        "image"
      );
      throw new ApiError(400, "scheduledAt must be a valid future date");
    }
  }

  const publicIdForPersist = getPublicIdFromCloudinaryUrl(
    videoUpload.secure_url || videoUpload.url
  );

  let video;
  try {
    video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      videoFile: videoUpload.secure_url || videoUpload.url,
      thumbnail: thumbnailUpload.secure_url || thumbnailUpload.url,
      duration: videoUpload.duration,
      owner: req.user._id,
      tags: parsedTags,
      category: category?.trim() || "General",
      chapters: parsedChapters,
      scheduledAt: scheduledDate,
      isPublished: !scheduledDate,
      transcodingStatus: "pending",
      transcodingAttempts: 0,
      ...(publicIdForPersist ? { cloudinaryPublicId: publicIdForPersist } : {}),
      ...(req.idempotencyKey
        ? {
            idempotencyKey: req.idempotencyKey,
            idempotencyFingerprint: req.idempotencyFingerprint,
          }
        : {}),
    });
  } catch (dbError) {
    // Idempotency race: another request with same key already created the video
    if (dbError?.code === 11000 && req.idempotencyKey) {
      const existing = await Video.findOne({
        owner: req.user._id,
        idempotencyKey: req.idempotencyKey,
      }).lean();
      if (existing) {
        if (
          existing.idempotencyFingerprint &&
          existing.idempotencyFingerprint !== req.idempotencyFingerprint
        ) {
          await deleteFromCloudinary(
            videoUpload.secure_url || videoUpload.url,
            "video"
          );
          await deleteFromCloudinary(
            thumbnailUpload.secure_url || thumbnailUpload.url,
            "image"
          );
          throw new ApiError(422, "Idempotency-Key already used with different payload");
        }
        // Return existing as replay — do not create duplicate, clean up just-uploaded Cloudinary assets if they differ
        const isSameAsset =
          existing.videoFile === (videoUpload.secure_url || videoUpload.url);
        if (!isSameAsset) {
          await deleteFromCloudinary(
            videoUpload.secure_url || videoUpload.url,
            "video"
          );
          await deleteFromCloudinary(
            thumbnailUpload.secure_url || thumbnailUpload.url,
            "image"
          );
        } else {
          // Same asset (should not happen via re-upload) — still delete the second thumbnail if needed?
          // Thumbnail differs, clean up the new one
          await deleteFromCloudinary(
            thumbnailUpload.secure_url || thumbnailUpload.url,
            "image"
          );
          await deleteFromCloudinary(
            videoUpload.secure_url || videoUpload.url,
            "video"
          );
        }
        // Ensure Redis completed cache is set via middleware's response wrapper, but return here for immediate replay
        return res
          .status(201)
          .json(new ApiResponse(201, existing, "Video published successfully"));
      }
    }
    await deleteFromCloudinary(
      videoUpload.secure_url || videoUpload.url,
      "video"
    );
    await deleteFromCloudinary(
      thumbnailUpload.secure_url || thumbnailUpload.url,
      "image"
    );
    throw dbError;
  }

  const createdVideo = await Video.findById(video._id).lean();

  if (!createdVideo) {
    await deleteFromCloudinary(
      videoUpload.secure_url || videoUpload.url,
      "video"
    );
    await deleteFromCloudinary(
      thumbnailUpload.secure_url || thumbnailUpload.url,
      "image"
    );
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  const publicId = publicIdForPersist;
  if (publicId) {
    Video.findOneAndUpdate(
      { _id: video._id, transcodingStatus: { $ne: "completed" } },
      {
        $set: {
          transcodingStatus: "processing",
          transcodingLastAttemptAt: new Date(),
          cloudinaryPublicId: publicId,
          transcodingError: null,
        },
        $inc: { transcodingAttempts: 1 },
      }
    )
      .then(() => {
        Promise.all([
          generateHlsManifest(publicId),
          generateVideoQualities(publicId),
        ])
          .then(([hlsUrl, qualities]) => {
            const updateData = {
              transcodingStatus: "completed",
              transcodingLastAttemptAt: new Date(),
              transcodingError: null,
            };
            if (hlsUrl) updateData.hlsUrl = hlsUrl;
            if (qualities?.length) updateData.qualities = qualities;
            Video.findOneAndUpdate(
              { _id: video._id, transcodingStatus: { $ne: "completed" } },
              { $set: updateData }
            ).catch((err) => {
              logger.error("Failed to update video with HLS data:", {
                error: err.message,
              });
            });
          })
          .catch((err) => {
            logger.error("HLS generation failed:", { error: err.message });
            Video.findOneAndUpdate(
              { _id: video._id, transcodingStatus: { $ne: "completed" } },
              {
                $set: {
                  transcodingStatus: "failed",
                  transcodingLastAttemptAt: new Date(),
                  transcodingError: err.message?.slice(0, 500) || "HLS generation failed",
                },
              }
            ).catch(() => {});
          });
      })
      .catch(() => {});
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video published successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, tags, category, visibility } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const updateFields = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "Title cannot be empty");
    }
    updateFields.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      throw new ApiError(400, "Description cannot be empty");
    }
    updateFields.description = description.trim();
  }

  if (tags !== undefined) {
    if (typeof tags === "string") {
      updateFields.tags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (Array.isArray(tags)) {
      updateFields.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else {
      updateFields.tags = [];
    }
  }

  if (category !== undefined) {
    updateFields.category =
      typeof category === "string" ? category.trim() : "General";
  }

  if (visibility !== undefined) {
    const valid = ["public", "private"];
    if (!valid.includes(visibility)) {
      throw new ApiError(
        400,
        "Visibility must be one of: public, unlisted, private"
      );
    }
    updateFields.visibility = visibility;
  }

  let oldThumbnail = null;
  const thumbnailLocalPath = req.file?.path;
  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail?.secure_url && !thumbnail?.url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }
    oldThumbnail = video.thumbnail;
    updateFields.thumbnail = thumbnail.secure_url || thumbnail.url;
  }

  if (!Object.keys(updateFields).length) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { returnDocument: "after" }
  ).lean();

  if (oldThumbnail) {
    await deleteFromCloudinary(oldThumbnail);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await deleteFromCloudinary(video.videoFile, "video");
  await deleteFromCloudinary(video.thumbnail, "image");

  await Video.findByIdAndDelete(videoId);

  if (mongoose.modelNames().includes("Like")) {
    await Like.deleteMany({ video: videoId });
  }
  if (mongoose.modelNames().includes("Comment")) {
    await Comment.deleteMany({ video: videoId });
  }

  // Best-effort cleanup of playlists/watch later/history
  try {
    await Playlist.updateMany(
      { videos: videoId },
      { $pull: { videos: videoId } }
    );
  } catch {
    logger.warn("Failed to clean up playlists for video", { videoId });
  }
  try {
    await User.updateMany(
      { watchLater: videoId },
      { $pull: { watchLater: videoId } }
    );
  } catch {
    logger.warn("Failed to clean up watchLater for video", { videoId });
  }
  try {
    await User.updateMany(
      { watchHistory: videoId },
      { $pull: { watchHistory: videoId } }
    );
  } catch {
    logger.warn("Failed to clean up watchHistory for video", { videoId });
  }

  // Best-effort cleanup of polls/notifications
  try {
    await Poll.deleteMany({ video: videoId });
  } catch {
    logger.warn("Failed to clean up polls for video", { videoId });
  }
  try {
    if (mongoose.modelNames().includes("Notification")) {
      await Notification.deleteMany({ video: videoId });
    }
  } catch {
    logger.warn("Failed to clean up notifications for video", { videoId });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to toggle publish status of this video"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        "Publish status toggled successfully"
      )
    );
});

const updateVideoTags = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { tags } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  let parsedTags = [];
  if (tags) {
    if (typeof tags === "string") {
      parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
  }

  video.tags = parsedTags;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Tags updated successfully"));
});

const updateVideoChapters = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { chapters } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  let parsedChapters = [];
  if (chapters) {
    try {
      parsedChapters =
        typeof chapters === "string" ? JSON.parse(chapters) : chapters;
      if (!Array.isArray(parsedChapters)) parsedChapters = [];
      parsedChapters = parsedChapters.filter(
        (ch) => ch && ch.title && typeof ch.startTime === "number"
      );
    } catch {
      parsedChapters = [];
    }
  }

  video.chapters = parsedChapters;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Chapters updated successfully"));
});

const bulkDeleteVideos = asyncHandler(async (req, res) => {
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds) || !videoIds.length) {
    throw new ApiError(400, "videoIds array is required");
  }

  const validIds = videoIds.filter((id) => mongoose.isValidObjectId(id));
  if (!validIds.length) {
    throw new ApiError(400, "No valid video ids provided");
  }

  const videos = await Video.find({
    _id: { $in: validIds },
    owner: req.user._id,
  }).select("videoFile thumbnail");

  for (const video of videos) {
    if (video.videoFile)
      await deleteFromCloudinary(video.videoFile, "video").catch(() => {});
    if (video.thumbnail)
      await deleteFromCloudinary(video.thumbnail, "image").catch(() => {});
  }

  await Video.deleteMany({ _id: { $in: validIds }, owner: req.user._id });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedCount: videos.length },
        "Videos deleted successfully"
      )
    );
});

const bulkPublishVideos = asyncHandler(async (req, res) => {
  const { videoIds, isPublished } = req.body;

  if (!Array.isArray(videoIds) || !videoIds.length) {
    throw new ApiError(400, "videoIds array is required");
  }
  if (typeof isPublished !== "boolean") {
    throw new ApiError(400, "isPublished boolean is required");
  }

  const validIds = videoIds.filter((id) => mongoose.isValidObjectId(id));

  const result = await Video.updateMany(
    { _id: { $in: validIds }, owner: req.user._id },
    { $set: { isPublished } }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `Videos ${isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

export {
  publishAVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  updateVideoTags,
  updateVideoChapters,
  bulkDeleteVideos,
  bulkPublishVideos,
};
