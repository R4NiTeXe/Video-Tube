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

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const like = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (like) {
    await Like.findByIdAndDelete(like._id);
    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Like removed"));
  }

  await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  // Create notification for video owner
  try {
    const video = await Video.findById(videoId).select("owner title");
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
  } catch { /* notification failure should not block the like */ }

  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true }, "Video liked"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const like = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (like) {
    await Like.findByIdAndDelete(like._id);
    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Like removed"));
  }

  await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });

  // Create notification for comment owner
  try {
    const comment = await Comment.findById(commentId).select("owner video");
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
  } catch { /* notification failure should not block the like */ }

  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true }, "Comment liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
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
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleVideoLike, getLikedVideos };
