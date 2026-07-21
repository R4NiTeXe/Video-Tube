import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10, sortBy = "newest" } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  // Determine sort stage
  let sortStage;
  switch (sortBy) {
    case "oldest":
      sortStage = { createdAt: 1 };
      break;
    case "popular":
      sortStage = { likesCount: -1, createdAt: -1 };
      break;
    case "newest":
    default:
      sortStage = { createdAt: -1 };
      break;
  }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
        parentComment: null,
      },
    },
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
      $lookup: {
        from: "likes",
        let: { commentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$comment", "$$commentId"] } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              likedBy: { $push: "$likedBy" },
            },
          },
        ],
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        likesCount: {
          $cond: {
            if: { $gt: [{ $size: "$likes" }, 0] },
            then: { $arrayElemAt: ["$likes.count", 0] },
            else: 0,
          },
        },
        isLiked: {
          $cond: {
            if: { $gt: [{ $size: "$likes" }, 0] },
            then: { $in: [req.user?._id, { $arrayElemAt: ["$likes.likedBy", 0] }] },
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        isPinned: 1,
      },
    },
    {
      $sort: sortStage,
    },
  ]);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 10, 50),
  };

  const comments = await Comment.aggregatePaginate(commentAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Something went wrong while adding the comment");
  }

  await Video.findByIdAndUpdate(videoId, { $inc: { commentsCount: 1 } });

  // Create notification for video owner
  try {
    const video = await Video.findById(videoId).select("owner title").lean();
    if (video && video.owner.toString() !== req.user._id.toString()) {
      const recipient = await User.findById(video.owner).select("notificationPrefs").lean();
      if (recipient?.notificationPrefs?.comments !== false) {
        await Notification.create({
          recipient: video.owner,
          sender: req.user._id,
          type: "comment",
          video: videoId,
          comment: comment._id,
          message: `${req.user.fullName || req.user.username} commented on your video "${video.title}"`,
        });
      }
    }
  } catch (err) { logger.warn("Comment notification failed", { error: err.message }); }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  comment.content = content.trim();
  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId).select("owner video").lean();

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await Comment.deleteMany({ parentComment: commentId });
  await Like.deleteMany({ comment: commentId });
  await Video.findByIdAndUpdate(comment.video, { $inc: { commentsCount: -1 } });
  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

const addReply = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Reply content is required");
  }

  const parentComment = await Comment.findById(commentId).select("video").lean();

  if (!parentComment) {
    throw new ApiError(404, "Comment not found");
  }

  const reply = await Comment.create({
    content: content.trim(),
    video: parentComment.video,
    owner: req.user._id,
    parentComment: commentId,
  });

  if (!reply) {
    throw new ApiError(500, "Something went wrong while adding the reply");
  }

  // Create notification for parent comment owner
  try {
    if (parentComment.owner.toString() !== req.user._id.toString()) {
      const recipient = await User.findById(parentComment.owner).select("notificationPrefs").lean();
      if (recipient?.notificationPrefs?.replies !== false) {
        await Notification.create({
          recipient: parentComment.owner,
          sender: req.user._id,
          type: "reply",
          video: parentComment.video,
          comment: reply._id,
          message: `${req.user.fullName || req.user.username} replied to your comment`,
        });
      }
    }
  } catch (err) { logger.warn("Reply notification failed", { error: err.message }); }

  return res
    .status(201)
    .json(new ApiResponse(201, reply, "Reply added successfully"));
});

const getReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const commentAggregate = Comment.aggregate([
    {
      $match: {
        parentComment: new mongoose.Types.ObjectId(commentId),
      },
    },
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
    {
      $project: {
        content: 1,
        createdAt: 1,
        owner: 1,
      },
    },
    {
      $sort: { createdAt: 1 },
    },
  ]);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 10, 50),
  };

  const replies = await Comment.aggregatePaginate(commentAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, replies, "Replies fetched successfully"));
});

const pinComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const video = await Video.findById(comment.video);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only video owner can pin comments");
  }

  comment.isPinned = !comment.isPinned;
  await comment.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        comment,
        comment.isPinned ? "Comment pinned" : "Comment unpinned"
      )
    );
});

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
  addReply,
  getReplies,
  pinComment,
};
