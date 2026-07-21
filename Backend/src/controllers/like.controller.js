import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSSENotification } from "./sse.controller.js";
import logger from "../utils/logger.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const existingLike = await Like.findOneAndDelete({ video: videoId, likedBy: req.user._id });

  let isLiked;

  if (existingLike) {
    await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: -1 } });
    isLiked = false;
  } else {
    try {
      await Like.create({ video: videoId, likedBy: req.user._id });
      await Video.findByIdAndUpdate(videoId, { $inc: { likesCount: 1 } });
      isLiked = true;
    } catch (error) {
      // If it's a duplicate key error (11000), it means another request already liked it
      if (error.code === 11000) {
        isLiked = true; // It's already liked, so pretend we succeeded
      } else {
        throw error;
      }
    }
  }

  const likesCount = await Like.countDocuments({ video: videoId });

  if (isLiked) {
    try {
      const video = await Video.findById(videoId).select("owner title").lean();
      if (video && video.owner.toString() !== req.user._id.toString()) {
        const recipient = await User.findById(video.owner).select("notificationPrefs").lean();
        if (recipient?.notificationPrefs?.likes !== false) {
          const notif = await Notification.create({
            recipient: video.owner,
            sender: req.user._id,
            type: "like",
            video: videoId,
            message: `${req.user.fullName || req.user.username} liked your video "${video.title}"`,
          });
          sendSSENotification(video.owner, notif);
        }
      }
    } catch (err) { logger.warn("Video like notification failed", { error: err.message }); }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked, likesCount }, isLiked ? "Video liked" : "Like removed"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const deleted = await Like.findOneAndDelete({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (deleted) {
    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Like removed"));
  }

  try {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
    // If it's a duplicate key, it means another request already liked it. We just continue.
  }

  // Create notification for comment owner
  try {
    const comment = await Comment.findById(commentId).select("owner video").lean();
    if (comment && comment.owner.toString() !== req.user._id.toString()) {
      const recipient = await User.findById(comment.owner).select("notificationPrefs").lean();
      if (recipient?.notificationPrefs?.likes !== false) {
        const notif = await Notification.create({
          recipient: comment.owner,
          sender: req.user._id,
          type: "like",
          video: comment.video,
          comment: commentId,
          message: `${req.user.fullName || req.user.username} liked your comment`,
        });
        sendSSENotification(comment.owner, notif);
      }
    }
  } catch (err) { logger.warn("Comment like notification failed", { error: err.message }); }

  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true }, "Comment liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [{ data, total } = { data: [], total: 0 }] = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $unwind: "$videoDetails",
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $project: {
        _id: 0,
        likedVideo: "$videoDetails",
      },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limitNumber }],
        total: [{ $count: "count" }],
      },
    },
    {
      $addFields: {
        total: { $ifNull: [{ $first: "$total.count" }, 0] },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { docs: data, total, page: pageNumber, limit: limitNumber }, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleVideoLike, getLikedVideos };
