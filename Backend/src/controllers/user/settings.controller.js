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
import { sendEmail } from "../../utils/email.js";
import { storeOTP, verifyOTP } from "../../utils/otp.js";
import { otpEmailTemplate, passwordChangedEmailTemplate } from "../../utils/emailTemplates.js";
import { sendWhatsAppOTP } from "../../utils/whatsappOtp.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { assertPasswordStrength } from "../../utils/passwordValidation.js";

const isValidEmail = (email) => validator.isEmail(email);
const isValidMobile = (mobile) => /^\+?[1-9]\d{9,14}$/.test(mobile);
const detectChannel = (identifier) => /^\+?[1-9]\d{9,14}$/.test(identifier.trim()) ? "whatsapp" : "email";

const sendChangePasswordOTP = asyncHandler(async (req, res) => {
  const { channel = "email" } = req.body;
  const user = await User.findById(req.user._id);
  const email = user.email;
  const mobile = user.mobile;

  if (channel === "whatsapp") {
    if (!mobile) {
      throw new ApiError(400, "No mobile number linked. Please add one in your profile first.");
    }
    const otp = await storeOTP(mobile, "change-password", "whatsapp", req.user._id);
    try {
      await sendWhatsAppOTP(mobile, otp);
    } catch (error) {
      logger.error("Failed to send OTP WhatsApp:", error.message);
    }
    return res.status(200).json(new ApiResponse(200, { channel: "whatsapp" }, "OTP sent to your WhatsApp"));
  } else {
    const otp = await storeOTP(email, "change-password", "email", req.user._id);
    try {
      await sendEmail({
        to: email,
        subject: "Your VideoTube Password Change Code",
        html: otpEmailTemplate(otp, "change-password"),
      });
    } catch (error) {
      logger.error("Failed to send OTP email:", error.message);
    }
    return res.status(200).json(new ApiResponse(200, { channel: "email" }, "OTP sent to your email"));
  }
});

const verifyAndChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, otp, channel = "email" } = req.body;

  if (!oldPassword || !newPassword || !otp) {
    throw new ApiError(400, "Old password, new password, and OTP are required");
  }

  assertPasswordStrength(newPassword);

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isOldPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }

  const identifier = channel === "whatsapp" ? user.mobile : user.email;
  if (channel === "whatsapp" && !identifier) {
    throw new ApiError(400, "No mobile number linked to this account");
  }

  const result = await verifyOTP(identifier, otp, "change-password");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  user.password = newPassword;
  await user.save();

  await Session.updateMany({ user: req.user._id }, { isActive: false });

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: passwordChangedEmailTemplate(),
    });
  } catch (error) {
    logger.error("Failed to send password changed email:", error.message);
  }

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please login again"
      )
    );
});

const sendDeleteAccountOTP = asyncHandler(async (req, res) => {
  const { channel = "email" } = req.body;
  const user = await User.findById(req.user._id);
  const email = user.email;
  const mobile = user.mobile;

  if (channel === "whatsapp") {
    if (!mobile) {
      throw new ApiError(400, "No mobile number linked. Please add one in your profile first.");
    }
    const otp = await storeOTP(mobile, "delete-account", "whatsapp", req.user._id);
    try {
      await sendWhatsAppOTP(mobile, otp);
    } catch (error) {
      logger.error("Failed to send delete account OTP WhatsApp:", error.message);
    }
    return res.status(200).json(new ApiResponse(200, { channel: "whatsapp" }, "OTP sent to your WhatsApp"));
  } else {
    const otp = await storeOTP(email, "delete-account", "email", req.user._id);
    try {
      await sendEmail({
        to: email,
        subject: "Confirm Account Deletion",
        html: otpEmailTemplate(otp, "delete-account"),
      });
    } catch (error) {
      logger.error("Failed to send delete account OTP email:", error.message);
    }
    return res.status(200).json(new ApiResponse(200, { channel: "email" }, "OTP sent to your email"));
  }
});

const verifyAndDeleteAccount = asyncHandler(async (req, res) => {
  const { otp, channel = "email" } = req.body;

  if (!otp) {
    throw new ApiError(400, "OTP is required");
  }

  const user = await User.findById(req.user._id);
  const identifier = channel === "whatsapp" ? user.mobile : user.email;

  if (channel === "whatsapp" && !identifier) {
    throw new ApiError(400, "No mobile number linked to this account");
  }

  const result = await verifyOTP(identifier, otp, "delete-account");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  const userId = req.user._id;

  const userVideos = await Video.find({ owner: userId }).select("videoFile thumbnail");
  for (const video of userVideos) {
    if (video.videoFile) await deleteFromCloudinary(video.videoFile);
    if (video.thumbnail) await deleteFromCloudinary(video.thumbnail);
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

const sendForgotPasswordChangeOTP = asyncHandler(async (req, res) => {
  const { channel = "email" } = req.body;
  const user = await User.findById(req.user._id);
  const email = user.email;
  const mobile = user.mobile;

  if (channel === "whatsapp") {
    if (!mobile) {
      throw new ApiError(400, "No mobile number linked. Please add one in your profile first.");
    }
    const otp = await storeOTP(mobile, "forgot-password-change", "whatsapp", req.user._id);
    try {
      await sendWhatsAppOTP(mobile, otp);
    } catch (error) {
      logger.error("Failed to send forgot password OTP WhatsApp:", error.message);
    }
    return res.status(200).json(new ApiResponse(200, { channel: "whatsapp" }, "OTP sent to your WhatsApp"));
  } else {
    const otp = await storeOTP(email, "forgot-password-change", "email", req.user._id);
    try {
      await sendEmail({
        to: email,
        subject: "Your VideoTube Password Reset Code",
        html: otpEmailTemplate(otp, "forgot-password-change"),
      });
    } catch (error) {
      logger.error("Failed to send forgot password OTP email:", error.message);
    }
    return res.status(200).json(new ApiResponse(200, { channel: "email" }, "OTP sent to your email"));
  }
});

const verifyAndResetPasswordViaOTP = asyncHandler(async (req, res) => {
  const { newPassword, otp, channel = "email" } = req.body;

  if (!newPassword || !otp) {
    throw new ApiError(400, "New password and OTP are required");
  }

  assertPasswordStrength(newPassword);

  const user = await User.findById(req.user._id);
  const identifier = channel === "whatsapp" ? user.mobile : user.email;

  if (channel === "whatsapp" && !identifier) {
    throw new ApiError(400, "No mobile number linked to this account");
  }

  const result = await verifyOTP(identifier, otp, "forgot-password-change");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  user.password = newPassword;
  await user.save();

  await Session.updateMany({ user: req.user._id }, { isActive: false });

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: passwordChangedEmailTemplate(),
    });
  } catch (error) {
    logger.error("Failed to send password changed email:", error.message);
  }

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "Password changed successfully. Please login again"
      )
    );
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

export {
  sendChangePasswordOTP,
  verifyAndChangePassword,
  sendDeleteAccountOTP,
  verifyAndDeleteAccount,
  sendForgotPasswordChangeOTP,
  verifyAndResetPasswordViaOTP,
  getNotificationPrefs,
  updateNotificationPrefs,
  updatePrivacySettings,
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  clearWatchHistory,
  getWatchLater,
};