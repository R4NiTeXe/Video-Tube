import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Video } from "../../models/video.model.js";
import { Like } from "../../models/like.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { Comment } from "../../models/comment.model.js";
import { User } from "../../models/user.model.js";
import { Notification } from "../../models/notification.model.js";
import { escapeRegex } from "../../utils/sanitizer.js";
import mongoose from "mongoose";
import { cacheGet, cacheSet } from "../../utils/redis.js";
import logger from "../../utils/logger.js";

const getTrendingVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category } = req.query;

  const matchStage = { isPublished: true };
  if (category?.trim()) {
    matchStage.category = category.trim();
  }

  const pipeline = [
    { $match: matchStage },
    { $sort: { trendingScore: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
    { $addFields: { owner: { $first: "$owner" } } },
    {
      $project: {
        videoFile: 1, title: 1, thumbnail: 1, views: 1, duration: 1,
        createdAt: 1, owner: 1, likesCount: 1, category: 1, tags: 1,
      },
    },
  ];

  const videoAggregate = Video.aggregate(pipeline);
  const options = { page: parseInt(page, 10) || 1, limit: Math.min(parseInt(limit, 10) || 20, 50) };
  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res.status(200).json(new ApiResponse(200, videos, "Trending videos fetched successfully"));
});

const getRelatedVideos = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { limit = 12 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const currentVideo = await Video.findById(videoId).select("title description tags category owner").lean();
  if (!currentVideo) {
    throw new ApiError(404, "Video not found");
  }

  const orConditions = [];
  if (currentVideo.tags?.length) {
    orConditions.push({ tags: { $in: currentVideo.tags } });
  }
  if (currentVideo.category) {
    orConditions.push({ category: currentVideo.category });
  }
  orConditions.push({ owner: currentVideo.owner });

  const relatedVideos = await Video.find({
    _id: { $ne: videoId },
    isPublished: true,
    $or: orConditions,
  })
    .select("title thumbnail views duration createdAt likesCount")
    .populate("owner", "fullName username avatar")
    .sort({ views: -1 })
    .limit(Math.min(parseInt(limit, 10) || 12, 30))
    .lean();

  return res.status(200).json(new ApiResponse(200, relatedVideos, "Related videos fetched successfully"));
});

const getVideoCategories = asyncHandler(async (req, res) => {
  const categories = await Video.distinct("category", { isPublished: true });
  return res.status(200).json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const getShortsFeed = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user?._id;

  const pipeline = [
    { $match: { isPublished: true, duration: { $lte: 60 } } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "likes",
        let: { videoId: "$_id", userId: userId ? new mongoose.Types.ObjectId(userId) : null },
        pipeline: [
          { $match: { $expr: { $eq: ["$video", "$$videoId"] } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              userLiked: {
                $max: {
                  $cond: {
                    if: { $and: ["$$userId", { $eq: ["$likedBy", "$$userId"] }] },
                    then: true,
                    else: false,
                  },
                },
              },
            },
          },
        ],
        as: "likeInfo",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        likesCount: { $ifNull: [{ $arrayElemAt: ["$likeInfo.count", 0] }, 0] },
        isLiked: { $ifNull: [{ $arrayElemAt: ["$likeInfo.userLiked", 0] }, false] },
      },
    },
    {
      $project: {
        videoFile: 1, title: 1, thumbnail: 1, views: 1, duration: 1,
        createdAt: 1, owner: 1, likesCount: 1, isLiked: 1,
        likeInfo: 0,
      },
    },
  ];

  const videoAggregate = Video.aggregate(pipeline);
  const options = { page: parseInt(page, 10) || 1, limit: Math.min(parseInt(limit, 10) || 20, 50) };
  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res.status(200).json(new ApiResponse(200, videos, "Shorts feed fetched"));
});

const getChannelAbout = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const profiles = await User.aggregate([
    { $match: { username: username.toLowerCase().trim() } },
    {
      $lookup: {
        from: "subscriptions",
        let: { channelId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$channel", "$$channelId"] } } },
          { $count: "count" },
        ],
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "videos",
        let: { ownerId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$owner", "$$ownerId"] } } },
          {
            $group: {
              _id: null,
              videoCount: { $sum: 1 },
              totalViews: { $sum: "$views" },
            },
          },
        ],
        as: "videos",
      },
    },
    {
      $addFields: {
        subscriberCount: { $ifNull: [{ $arrayElemAt: ["$subscribers.count", 0] }, 0] },
        videoCount: { $ifNull: [{ $arrayElemAt: ["$videos.videoCount", 0] }, 0] },
        totalViews: { $ifNull: [{ $arrayElemAt: ["$videos.totalViews", 0] }, 0] },
        joinDate: "$createdAt",
      },
    },
    {
      $project: {
        fullName: 1, username: 1, avatar: 1, coverImage: 1,
        bio: 1, socialLinks: 1, isVerified: 1,
        subscriberCount: 1, videoCount: 1, totalViews: 1, joinDate: 1,
      },
    },
  ]);

  if (!profiles?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res.status(200).json(new ApiResponse(200, profiles[0], "Channel about fetched"));
});

const getTranscodingStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId)
    .select("transcodingStatus hlsUrl qualities")
    .lean();

  if (!video) throw new ApiError(404, "Video not found");

  return res.status(200).json(new ApiResponse(200, video, "Transcoding status fetched"));
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
      parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
  }

  video.tags = parsedTags;
  await video.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, video, "Tags updated successfully"));
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
      parsedChapters = typeof chapters === "string" ? JSON.parse(chapters) : chapters;
      if (!Array.isArray(parsedChapters)) parsedChapters = [];
      parsedChapters = parsedChapters.filter((ch) => ch && ch.title && typeof ch.startTime === "number");
    } catch {
      parsedChapters = [];
    }
  }

  video.chapters = parsedChapters;
  await video.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, video, "Chapters updated successfully"));
});

export { getAllVideos, getVideoById, getChannelVideos, searchChannels } from "../video.controller.js";

export {
  getTrendingVideos,
  getRelatedVideos,
  getVideoCategories,
  getShortsFeed,
  getChannelAbout,
  getTranscodingStatus,
  updateVideoTags,
  updateVideoChapters,
};