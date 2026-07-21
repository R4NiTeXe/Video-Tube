import mongoose from "mongoose";
import { CommunityPost } from "../models/communityPost.model.js";
import { Poll } from "../models/poll.model.js";
import { PostLike } from "../models/postLike.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const createCommunityPost = asyncHandler(async (req, res) => {
  const { content, pollQuestion, pollOptions, pollEndsAt } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Post content is required");
  }

  let imageLocalPath;
  if (req.files && req.files.image && req.files.image[0]) {
    imageLocalPath = req.files.image[0].path;
  }

  let imageData = null;
  if (imageLocalPath) {
    imageData = await uploadOnCloudinary(imageLocalPath);
  }

  let post;
  try {
    post = await CommunityPost.create({
      content: content.trim(),
      image: imageData?.url || "",
      imagePublicId: imageData?.public_id || "",
      owner: req.user._id,
    });
  } catch (dbError) {
    if (imageData?.public_id) {
      await deleteFromCloudinary(imageData.public_id, "image");
    }
    throw dbError;
  }

  if (!post) {
    if (imageData?.public_id) {
      await deleteFromCloudinary(imageData.public_id, "image");
    }
    throw new ApiError(500, "Something went wrong while creating the post");
  }

  // Create poll if question and options provided
  if (pollQuestion?.trim() && Array.isArray(pollOptions) && pollOptions.length >= 2) {
    const cleanOptions = pollOptions
      .map((o) => ({ text: String(o).trim() }))
      .filter((o) => o.text);

    if (cleanOptions.length >= 2) {
      const poll = await Poll.create({
        question: pollQuestion.trim(),
        options: cleanOptions,
        createdBy: req.user._id,
        communityPost: post._id,
        endsAt: pollEndsAt || undefined,
      });

      post.poll = poll._id;
      await post.save();
    }
  }

  const populated = await CommunityPost.findById(post._id)
    .populate("owner", "fullName username avatar")
    .populate({
      path: "poll",
      select: "question options isActive endsAt createdAt",
    });

  return res
    .status(201)
    .json(new ApiResponse(201, populated, "Post created successfully"));
});

const getAllCommunityPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [{ data, metadata } = { data: [], metadata: [{ total: 0 }] }] = await CommunityPost.aggregate([
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
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
            $lookup: {
              from: "postlikes",
              let: { postId: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$post", "$$postId"] } } },
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
            $lookup: {
              from: "polls",
              localField: "poll",
              foreignField: "_id",
              as: "poll",
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
              poll: { $first: "$poll" },
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
              image: 1,
              createdAt: 1,
              owner: 1,
              poll: 1,
              likesCount: 1,
              commentsCount: 1,
              isLiked: 1,
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { docs: data, total: metadata[0]?.total || 0, page, limit, totalPages: Math.ceil((metadata[0]?.total || 0) / limit) }, "Posts fetched successfully"));
});

const getChannelPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const userAggregation = await mongoose
    .model("User")
    .aggregate([
      { $match: { username: username.toLowerCase() } },
      { $project: { _id: 1 } },
    ]);

  if (!userAggregation.length) {
    throw new ApiError(404, "Channel not found");
  }

  const channelId = userAggregation[0]._id;
  const skip = (page - 1) * limit;

  const [{ data, metadata } = { data: [], metadata: [{ total: 0 }] }] = await CommunityPost.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
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
            $lookup: {
              from: "postlikes",
              let: { postId: "$_id" },
              pipeline: [
                { $match: { $expr: { $eq: ["$post", "$$postId"] } } },
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
            $lookup: {
              from: "polls",
              localField: "poll",
              foreignField: "_id",
              as: "poll",
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
              poll: { $first: "$poll" },
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
              image: 1,
              createdAt: 1,
              owner: 1,
              poll: 1,
              likesCount: 1,
              commentsCount: 1,
              isLiked: 1,
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { docs: data, total: metadata[0]?.total || 0, page, limit, totalPages: Math.ceil((metadata[0]?.total || 0) / limit) }, "Channel posts fetched successfully"));
});

const updateCommunityPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Post content is required");
  }

  const post = await CommunityPost.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this post");
  }

  // Handle optional image swap
  if (req.files && req.files.image && req.files.image[0]) {
    // Delete old image if exists
    if (post.imagePublicId) {
      await deleteFromCloudinary(post.imagePublicId, "image");
    }

    const imageData = await uploadOnCloudinary(req.files.image[0].path);
    post.image = imageData?.url || "";
    post.imagePublicId = imageData?.public_id || "";
  }

  post.content = content.trim();
  await post.save();

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post updated successfully"));
});

const deleteCommunityPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  const post = await CommunityPost.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post");
  }

  // Delete cloudinary image if exists
  if (post.imagePublicId) {
    await deleteFromCloudinary(post.imagePublicId, "image");
  }

  // Delete linked poll if exists
  if (post.poll) {
    await Poll.findByIdAndDelete(post.poll);
  }

  await CommunityPost.findByIdAndDelete(postId);

  // Cleanup related post likes
  await PostLike.deleteMany({ post: postId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully"));
});

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!mongoose.isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post id");
  }

  const post = await CommunityPost.findById(postId);

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const deleted = await PostLike.findOneAndDelete({
    post: postId,
    likedBy: req.user._id,
  });

  if (deleted) {
    await CommunityPost.findByIdAndUpdate(postId, [
      { $set: { likesCount: { $max: [0, { $subtract: ["$likesCount", 1] }] } } },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Like removed"));
  }

  await PostLike.create({
    post: postId,
    likedBy: req.user._id,
  });

  await CommunityPost.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });

  return res
    .status(200)
    .json(new ApiResponse(200, { isLiked: true }, "Post liked"));
});

export {
  createCommunityPost,
  getAllCommunityPosts,
  getChannelPosts,
  updateCommunityPost,
  deleteCommunityPost,
  togglePostLike,
};
