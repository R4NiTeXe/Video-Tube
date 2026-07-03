import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        publishedVideos: {
          $sum: { $cond: ["$isPublished", 1, 0] },
        },
      },
    },
  ]);

  const totalVideos = videoStats[0]?.totalVideos || 0;
  const totalViews = videoStats[0]?.totalViews || 0;
  const publishedVideos = videoStats[0]?.publishedVideos || 0;

  const totalLikes = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    { $unwind: "$videoDetails" },
    { $match: { "videoDetails.owner": new mongoose.Types.ObjectId(userId) } },
    { $count: "totalLikes" },
  ]);

  const totalComments = await Comment.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    { $unwind: "$videoDetails" },
    { $match: { "videoDetails.owner": new mongoose.Types.ObjectId(userId) } },
    { $count: "totalComments" },
  ]);

  const totalLikesCount = totalLikes[0]?.totalLikes || 0;
  const totalCommentsCount = totalComments[0]?.totalComments || 0;

  // Average views per video
  const avgViews = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSubscribers,
        totalVideos,
        publishedVideos,
        totalViews,
        totalLikes: totalLikesCount,
        totalComments: totalCommentsCount,
        avgViews,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "videoComments",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$videoComments" },
      },
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        views: 1,
        duration: 1,
        isPublished: 1,
        createdAt: 1,
        likesCount: 1,
        commentsCount: 1,
        tags: 1,
        category: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

const getSubscriberGrowth = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days, 10));

  const growth = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get total before start date for cumulative
  const beforeStart = await Subscription.countDocuments({
    channel: userId,
    createdAt: { $lt: startDate },
  });

  let cumulative = beforeStart;
  const result = growth.map((day) => {
    cumulative += day.count;
    return { date: day._id, newSubscribers: day.count, totalSubscribers: cumulative };
  });

  return res.status(200).json(new ApiResponse(200, result, "Subscriber growth fetched"));
});

const getVideoDetailedStats = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId).select("title views duration createdAt isPublished owner");
  if (!video) throw new ApiError(404, "Video not found");
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  const [likesCount, commentsCount] = await Promise.all([
    Like.countDocuments({ video: videoId }),
    Comment.countDocuments({ video: videoId }),
  ]);

  // Estimate watch time (views * duration in seconds)
  const estimatedWatchTimeSeconds = video.views * video.duration;
  const estimatedWatchTimeMinutes = Math.round(estimatedWatchTimeSeconds / 60);

  return res.status(200).json(
    new ApiResponse(200, {
      video: { _id: video._id, title: video.title, views: video.views, duration: video.duration, createdAt: video.createdAt, isPublished: video.isPublished },
      likesCount,
      commentsCount,
      estimatedWatchTimeMinutes,
    }, "Video stats fetched")
  );
});

export { getChannelStats, getChannelVideos, getSubscriberGrowth, getVideoDetailedStats };
