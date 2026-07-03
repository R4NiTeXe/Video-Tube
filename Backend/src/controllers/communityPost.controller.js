import mongoose from "mongoose";
import { CommunityPost } from "../models/communityPost.model.js";
import { PostLike } from "../models/postLike.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const createCommunityPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

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

  const post = await CommunityPost.create({
    content: content.trim(),
    image: imageData?.url || "",
    imagePublicId: imageData?.public_id || "",
    owner: req.user._id,
  });

  if (!post) {
    throw new ApiError(500, "Something went wrong while creating the post");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post created successfully"));
});

const getAllCommunityPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const posts = await CommunityPost.aggregate([
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
        from: "postlikes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
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
        likesCount: 1,
        commentsCount: 1,
        isLiked: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts fetched successfully"));
});

const getChannelPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 10 } = req.query;

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

  const posts = await CommunityPost.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
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
        from: "postlikes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
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
        likesCount: 1,
        commentsCount: 1,
        isLiked: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Channel posts fetched successfully"));
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

  const existingLike = await PostLike.findOne({
    post: postId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await PostLike.findByIdAndDelete(existingLike._id);
    post.likesCount = Math.max(0, post.likesCount - 1);
    await post.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { isLiked: false }, "Like removed"));
  }

  await PostLike.create({
    post: postId,
    likedBy: req.user._id,
  });

  post.likesCount += 1;
  await post.save();

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
