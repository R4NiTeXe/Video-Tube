import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { Video } from "../../models/video.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { Comment } from "../../models/comment.model.js";
import { Like } from "../../models/like.model.js";
import { Playlist } from "../../models/playlist.model.js";
import { Notification } from "../../models/notification.model.js";
import { CommunityPost } from "../../models/communityPost.model.js";
import { Poll } from "../../models/poll.model.js";
import { Session } from "../../models/session.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { escapeRegex } from "../../utils/sanitizer.js";
import mongoose from "mongoose";
import validator from "validator";
import { getCookieOptions } from "../user.controller.js";
import logger from "../../utils/logger.js";

const isValidEmail = (email) => validator.isEmail(email);

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  const updateFields = {};

  if (fullName !== undefined) {
    if (typeof fullName !== "string" || !fullName.trim()) {
      throw new ApiError(400, "Full name cannot be empty");
    }
    updateFields.fullName = fullName.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      throw new ApiError(400, "Email cannot be empty");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(400, "Please provide a valid email");
    }
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user?._id },
    });
    if (existingUser) {
      throw new ApiError(409, "Email is already in use");
    }
    updateFields.email = normalizedEmail;
  }

  if (!Object.keys(updateFields).length) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { returnDocument: "after", runValidators: true }
  ).select("-password -refreshToken").lean();

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});

const updateUserImage = async ({ userId, localFilePath, urlField, publicIdField, missingFileMessage, uploadErrorMessage }) => {
  if (!localFilePath) {
    throw new ApiError(400, missingFileMessage);
  }

  const user = await User.findById(userId).select(`${urlField} ${publicIdField}`).lean();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const uploadedImage = await uploadOnCloudinary(localFilePath);

  if (!uploadedImage?.secure_url && !uploadedImage?.url) {
    throw new ApiError(500, uploadErrorMessage);
  }

  const updateFields = {
    [urlField]: uploadedImage.secure_url || uploadedImage.url,
    [publicIdField]: uploadedImage.public_id,
  };

  let updatedUser;

  try {
    updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { returnDocument: "after", runValidators: true }
    ).select("-password -refreshToken").lean();
  } catch (error) {
    await deleteFromCloudinary(uploadedImage.public_id);
    throw error;
  }

  if (!updatedUser) {
    await deleteFromCloudinary(uploadedImage.public_id);
    throw new ApiError(404, "User not found");
  }

  const oldPublicId = user[publicIdField] || user[urlField];
  if (oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  return updatedUser;
};

const updateUserAvatar = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserImage({
    userId: req.user?._id,
    localFilePath: req.file?.path,
    urlField: "avatar",
    publicIdField: "avatarPublicId",
    missingFileMessage: "Avatar file is missing",
    uploadErrorMessage: "Error while uploading avatar",
  });

  return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserImage({
    userId: req.user?._id,
    localFilePath: req.file?.path,
    urlField: "coverImage",
    publicIdField: "coverImagePublicId",
    missingFileMessage: "Cover image file is missing",
    uploadErrorMessage: "Error while uploading cover image",
  });

  return res.status(200).json(new ApiResponse(200, updatedUser, "Cover image updated successfully"));
});

const updateUserBanner = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserImage({
    userId: req.user?._id,
    localFilePath: req.file?.path,
    urlField: "channelBanner",
    publicIdField: "channelBannerPublicId",
    missingFileMessage: "Banner file is missing",
    uploadErrorMessage: "Error while uploading banner",
  });

  return res.status(200).json(new ApiResponse(200, updatedUser, "Channel banner updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const { cacheGet, cacheSet } = await import("../../utils/redis.js");
  const cacheKey = `channel:${username.toLowerCase()}`;
  let channelData = await cacheGet(cacheKey);

  if (!channelData) {
    const channel = await User.aggregate([
      { $match: { username: username.toLowerCase() } },
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
          from: "subscriptions",
          let: { subscriberId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$subscriber", "$$subscriberId"] } } },
            { $count: "count" },
          ],
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: { $ifNull: [{ $arrayElemAt: ["$subscribers.count", 0] }, 0] },
          channelsSubscribedToCount: { $ifNull: [{ $arrayElemAt: ["$subscribedTo.count", 0] }, 0] },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          avatar: 1,
          coverImage: 1,
        },
      },
    ]);

    if (!channel?.length) {
      throw new ApiError(404, "Channel does not exist");
    }

    channelData = channel[0];
    await cacheSet(cacheKey, channelData, 60);
  }

  if (req.user?._id) {
    const sub = await Subscription.findOne({
      channel: channelData._id,
      subscriber: req.user._id,
    }).lean();
    channelData.isSubscribed = !!sub;
  } else {
    channelData.isSubscribed = false;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channelData, "User channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
    { $addFields: { totalCount: { $size: { $ifNull: ["$watchHistory", []] } } } },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
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
          { $skip: skip },
          { $limit: limitNumber },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { docs: user[0]?.watchHistory || [], total: user[0]?.totalCount || 0, page: pageNumber, limit: limitNumber },
        "Watch history fetched successfully"
      )
    );
});

const deleteCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userVideos = await Video.find({ owner: userId }).select("videoFile thumbnail");
  for (const video of userVideos) {
    if (video.videoFile) await deleteFromCloudinary(video.videoFile, "video");
    if (video.thumbnail) await deleteFromCloudinary(video.thumbnail, "image");
  }

  if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId);
  if (user.coverImagePublicId) await deleteFromCloudinary(user.coverImagePublicId);

  await Subscription.deleteMany({ $or: [{ subscriber: userId }, { channel: userId }] });
  await Video.deleteMany({ owner: userId });
  await Comment.deleteMany({ owner: userId });
  await Like.deleteMany({ likedBy: userId });
  await Playlist.deleteMany({ owner: userId });
  await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });
  await CommunityPost.deleteMany({ owner: userId });
  await Poll.deleteMany({ createdBy: userId });
  await Poll.updateMany({ voters: userId }, { $pull: { voters: userId } });
  await Session.deleteMany({ user: userId });
  await User.findByIdAndDelete(userId);

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { bio, socialLinks } = req.body;
  const updateFields = {};

  if (bio !== undefined) {
    if (typeof bio !== "string") {
      throw new ApiError(400, "Bio must be a string");
    }
    if (bio.length > 500) {
      throw new ApiError(400, "Bio cannot exceed 500 characters");
    }
    updateFields.bio = bio.trim();
  }

  if (socialLinks !== undefined) {
    let parsedLinks = socialLinks;
    if (typeof socialLinks === "string") {
      try {
        parsedLinks = JSON.parse(socialLinks);
      } catch {
        throw new ApiError(400, "Invalid social links format");
      }
    }
    const allowedFields = ["youtube", "twitter", "instagram", "github", "website"];
    const sanitizedLinks = {};
    for (const field of allowedFields) {
      if (parsedLinks[field] !== undefined) {
        sanitizedLinks[field] = String(parsedLinks[field]).trim();
      }
    }
    updateFields.socialLinks = sanitizedLinks;
  }

  if (!Object.keys(updateFields).length) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { returnDocument: "after", runValidators: true }
  ).select("-password -refreshToken").lean();

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const profile = await User.aggregate([
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
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        bio: 1,
        socialLinks: 1,
        isVerified: 1,
        subscriberCount: 1,
        videoCount: 1,
        totalViews: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!profile?.length) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(new ApiResponse(200, profile[0], "User profile fetched successfully"));
});

const searchUsers = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.query;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const skip = (pageNumber - 1) * limitNumber;
  const searchRegex = new RegExp(escapeRegex(query.trim()), "i");

  const [users, total] = await Promise.all([
    User.find({
      $or: [{ username: searchRegex }, { fullName: searchRegex }],
    }).select("_id username fullName avatar isVerified").skip(skip).limit(limitNumber).lean(),
    User.countDocuments({
      $or: [{ username: searchRegex }, { fullName: searchRegex }],
    }),
  ]);

  return res.status(200).json(new ApiResponse(200, { docs: users, total, page: pageNumber, limit: limitNumber }, "Users fetched successfully"));
});

const blockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "Cannot block yourself");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new ApiError(404, "User not found");

  const user = await User.findById(req.user._id);
  const isBlocked = user.blockedUsers.includes(userId);

  if (isBlocked) {
    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { blocked: false }, "User unblocked"));
  } else {
    user.blockedUsers.push(userId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { blocked: true }, "User blocked"));
  }
});

const muteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "Cannot mute yourself");
  }

  const user = await User.findById(req.user._id);
  const isMuted = user.mutedUsers.includes(userId);

  if (isMuted) {
    user.mutedUsers = user.mutedUsers.filter((id) => id.toString() !== userId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { muted: false }, "User unmuted"));
  } else {
    user.mutedUsers.push(userId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { muted: true }, "User muted"));
  }
});

const addToWatchLater = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const user = await User.findById(req.user._id);
  const exists = user.watchLater.includes(videoId);

  if (exists) {
    user.watchLater = user.watchLater.filter((id) => id.toString() !== videoId);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { watchLater: false }, "Removed from watch later"));
  } else {
    user.watchLater.push(videoId);
    if (user.watchLater.length > 200) {
      user.watchLater = user.watchLater.slice(-200);
    }
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { watchLater: true }, "Added to watch later"));
  }
});

const getWatchLater = asyncHandler(async (req, res) => {
  let { page = 1, limit = 20 } = req.query;
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const user = await User.findById(req.user._id).select("watchLater").lean();
  const total = user?.watchLater?.length || 0;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const watchLaterIds = user?.watchLater?.slice(skip, skip + limit) || [];

  const videos = await Video.find({ _id: { $in: watchLaterIds }, isPublished: true })
    .select("title thumbnail views duration createdAt")
    .populate("owner", "fullName username avatar")
    .sort({ createdAt: -1 })
    .lean();

  const ordered = watchLaterIds.map((id) => videos.find((v) => v._id.toString() === id.toString())).filter(Boolean);

  return res.status(200).json(
    new ApiResponse(200, { docs: ordered, total, page, limit, totalPages }, "Watch later fetched")
  );
});

const addSearchHistory = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const user = await User.findById(req.user._id);
  user.searchHistory = user.searchHistory.filter((q) => q !== query.trim());
  user.searchHistory.unshift(query.trim());
  if (user.searchHistory.length > 50) {
    user.searchHistory = user.searchHistory.slice(0, 50);
  }
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, user.searchHistory, "Search history updated"));
});

const getSearchHistory = asyncHandler(async (req, res) => {
  let { page = 1, limit = 20 } = req.query;
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const user = await User.findById(req.user._id).select("searchHistory").lean();
  const total = user?.searchHistory?.length || 0;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  const docs = user?.searchHistory?.slice(skip, skip + limit) || [];

  return res.status(200).json(
    new ApiResponse(200, { docs, total, page, limit, totalPages }, "Search history fetched")
  );
});

const clearSearchHistory = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { searchHistory: [] } });
  return res.status(200).json(new ApiResponse(200, {}, "Search history cleared"));
});

const clearWatchHistory = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { watchHistory: [] } });
  return res.status(200).json(new ApiResponse(200, {}, "Watch history cleared"));
});

const getNotificationPrefs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("notificationPrefs").lean();
  return res.status(200).json(new ApiResponse(200, user.notificationPrefs, "Notification preferences fetched"));
});

const updateNotificationPrefs = asyncHandler(async (req, res) => {
  const { likes, comments, replies, subscriptions, mentions } = req.body;

  const updateFields = {};
  if (likes !== undefined) updateFields["notificationPrefs.likes"] = Boolean(likes);
  if (comments !== undefined) updateFields["notificationPrefs.comments"] = Boolean(comments);
  if (replies !== undefined) updateFields["notificationPrefs.replies"] = Boolean(replies);
  if (subscriptions !== undefined) updateFields["notificationPrefs.subscriptions"] = Boolean(subscriptions);
  if (mentions !== undefined) updateFields["notificationPrefs.mentions"] = Boolean(mentions);

  if (!Object.keys(updateFields).length) {
    throw new ApiError(400, "At least one preference is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select("notificationPrefs").lean();

  return res.status(200).json(new ApiResponse(200, user.notificationPrefs, "Notification preferences updated"));
});

const updatePrivacySettings = asyncHandler(async (req, res) => {
  const { isPrivate } = req.body;

  if (typeof isPrivate !== "boolean") {
    throw new ApiError(400, "isPrivate must be a boolean");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { isPrivate } },
    { new: true }
  ).select("isPrivate").lean();

  return res.status(200).json(new ApiResponse(200, user, "Privacy settings updated"));
});

export {
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserBanner,
  getUserChannelProfile,
  getWatchHistory,
  deleteCurrentUser,
  updateUserProfile,
  getUserProfile,
  searchUsers,
  blockUser,
  muteUser,
  addToWatchLater,
  getWatchLater,
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  clearWatchHistory,
  getNotificationPrefs,
  updateNotificationPrefs,
  updatePrivacySettings,
};