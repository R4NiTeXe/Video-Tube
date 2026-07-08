import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Comment } from "../models/comment.model.js";
import { escapeRegex } from "../utils/sanitizer.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Report } from "../models/report.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const getPlatformStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalVideos, totalComments, totalSubscriptions, totalLikes, totalPlaylists, totalReports] =
    await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      Comment.countDocuments(),
      Subscription.countDocuments(),
      Like.countDocuments(),
      Playlist.countDocuments(),
      Report.countDocuments(),
    ]);

  const publishedVideos = await Video.countDocuments({ isPublished: true });
  const totalViews = await Video.aggregate([
    { $group: { _id: null, total: { $sum: "$views" } } },
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      totalUsers,
      totalVideos,
      publishedVideos,
      totalComments,
      totalSubscriptions,
      totalLikes,
      totalPlaylists,
      totalReports,
      totalViews: totalViews[0]?.total || 0,
    }, "Platform stats fetched")
  );
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, query, role } = req.query;

  const filter = {};
  if (query) {
    const regex = new RegExp(escapeRegex(query.trim()), "i");
    filter.$or = [{ username: regex }, { fullName: regex }, { email: regex }];
  }
  if (role && ["user", "admin"].includes(role)) {
    filter.role = role;
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select("-password -refreshToken")
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      docs: users,
      totalDocs: totalCount,
      page: pageNumber,
      limit: limitNumber,
    }, "Users fetched successfully")
  );
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }
  if (!role || !["user", "admin"].includes(role)) {
    throw new ApiError(400, "Role must be 'user' or 'admin'");
  }

  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "Cannot change your own role");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, user, "User role updated"));
});

const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "Cannot ban yourself");
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  // Unpublish all user's videos and clean up Cloudinary
  const videos = await Video.find({ owner: userId }).select("videoFile thumbnail");
  for (const video of videos) {
    if (video.videoFile) await deleteFromCloudinary(video.videoFile, "video").catch(() => {});
    if (video.thumbnail) await deleteFromCloudinary(video.thumbnail, "image").catch(() => {});
  }
  await Video.updateMany({ owner: userId }, { $set: { isPublished: false } });

  // Clean up user avatar and cover from Cloudinary
  if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId, "image").catch(() => {});
  if (user.coverImagePublicId) await deleteFromCloudinary(user.coverImagePublicId, "image").catch(() => {});

  // Delete user
  await User.findByIdAndDelete(userId);

  return res.status(200).json(new ApiResponse(200, {}, "User banned and deleted"));
});

const adminDeleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findByIdAndDelete(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  // Cleanup Cloudinary
  if (video.videoFile) await deleteFromCloudinary(video.videoFile, "video").catch(() => {});
  if (video.thumbnail) await deleteFromCloudinary(video.thumbnail, "image").catch(() => {});

  // Cleanup related data
  await Comment.deleteMany({ video: videoId });
  await Like.deleteMany({ video: videoId });

  return res.status(200).json(new ApiResponse(200, {}, "Video deleted by admin"));
});

const getAllReports = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, targetType } = req.query;

  const filter = {};
  if (status && ["pending", "reviewed", "resolved"].includes(status)) {
    filter.status = status;
  }
  if (targetType && ["video", "comment", "user"].includes(targetType)) {
    filter.targetType = targetType;
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [reports, totalCount] = await Promise.all([
    Report.find(filter)
      .populate("reporter", "fullName avatar username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Report.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {
      docs: reports,
      totalDocs: totalCount,
      page: pageNumber,
      limit: limitNumber,
    }, "Reports fetched successfully")
  );
});

const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

  const [recentUsers, recentVideos, recentReports] = await Promise.all([
    User.find().select("fullName avatar createdAt").sort({ createdAt: -1 }).limit(limitNum).lean(),
    Video.find({ isPublished: true }).select("title thumbnail views createdAt").sort({ createdAt: -1 }).limit(limitNum).lean(),
    Report.find().select("targetType reason status createdAt").sort({ createdAt: -1 }).limit(limitNum).lean(),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { recentUsers, recentVideos, recentReports }, "Recent activity fetched")
  );
});

export {
  getPlatformStats,
  getAllUsers,
  updateUserRole,
  banUser,
  adminDeleteVideo,
  getAllReports,
  getRecentActivity,
};
