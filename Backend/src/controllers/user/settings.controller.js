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
import { otpEmailTemplate, passwordChangedEmailTemplate, accountDeletedTemplate, identifierUpdatedTemplate, identifierDeletedTemplate } from "../../utils/emailTemplates.js";
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
      throw new ApiError(500, `Failed to send WhatsApp OTP: ${error.message}`);
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
      throw new ApiError(500, `Failed to send email OTP: ${error.message}`);
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
      throw new ApiError(500, `Failed to send WhatsApp OTP: ${error.message}`);
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
      throw new ApiError(500, `Failed to send email OTP: ${error.message}`);
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
  try {
    await sendEmail({
      to: user.email,
      subject: "Account Deletion Confirmed",
      html: accountDeletedTemplate(user),
    });
  } catch (err) {
    logger.error("Failed to send account deletion email: " + err.message);
  }

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
      throw new ApiError(500, `Failed to send WhatsApp OTP: ${error.message}`);
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
      throw new ApiError(500, `Failed to send email OTP: ${error.message}`);
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

  if (!identifier) {
    throw new ApiError(400, `No ${channel === "whatsapp" ? "mobile number" : "email"} linked to this account`);
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
      html: passwordChangedEmailTemplate(user),
    });
  } catch (error) {
    logger.error("Failed to send password changed email:", { error: error.message });
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

const sendIdentifierUpdateOTP = asyncHandler(async (req, res) => {
  const { identifier, action } = req.body;
  
  if (!["add", "edit", "delete"].includes(action)) {
    throw new ApiError(400, "Invalid action");
  }

  const user = await User.findById(req.user._id);

  let targetIdentifier = identifier;
  let isMobile = false;

  if (action === "delete") {
    // For delete, identifier in body is what they want to delete ("email" or "mobile").
    // We send OTP to the OTHER identifier.
    const targetType = identifier; // "email" or "mobile"
    if (targetType === "email" && !user.mobile) {
      throw new ApiError(400, "Cannot delete email because you have no mobile number linked.");
    }
    if (targetType === "mobile" && !user.email) {
      throw new ApiError(400, "Cannot delete mobile because you have no email linked.");
    }

    targetIdentifier = targetType === "email" ? user.mobile : user.email;
    isMobile = targetType === "email"; // Since we send OTP to the other
  } else {
    // Add/Edit: target is the new identifier
    isMobile = /^\+?[1-9]\d{9,14}$/.test(targetIdentifier.trim());
    if (!isMobile && !isValidEmail(targetIdentifier)) {
      throw new ApiError(400, "Invalid email or mobile format");
    }

    const existing = await User.findOne({ 
      $or: [{ email: targetIdentifier.toLowerCase() }, { mobile: targetIdentifier.trim() }] 
    });
    if (existing && existing._id.toString() !== user._id.toString()) {
      throw new ApiError(409, "This identifier is already in use by another account.");
    }
  }

  const channel = isMobile ? "whatsapp" : "email";
  const otp = await storeOTP(targetIdentifier, "identifier-update", channel, user._id);

  try {
    if (channel === "whatsapp") {
      await sendWhatsAppOTP(targetIdentifier, otp);
    } else {
      await sendEmail({
        to: targetIdentifier,
        subject: "Verification Code for Profile Update",
        html: otpEmailTemplate(otp, "verify-email", user.fullName || user.username),
      });
    }
  } catch (error) {
    logger.error(`Failed to send OTP to ${targetIdentifier}:`, error.message);
    throw new ApiError(500, `Failed to send OTP to ${channel}`);
  }

  return res.status(200).json(new ApiResponse(200, { channel, verificationIdentifier: targetIdentifier }, "OTP sent successfully"));
});

const verifyAndAddIdentifier = asyncHandler(async (req, res) => {
  const { identifier, otp } = req.body;
  const isMobile = /^\+?[1-9]\d{9,14}$/.test(identifier.trim());

  const result = await verifyOTP(identifier, otp, "identifier-update");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  const user = await User.findById(req.user._id);
  
  if (isMobile) {
    user.mobile = identifier.trim();
    user.isMobileVerified = true;
  } else {
    user.email = identifier.toLowerCase();
  }

  await user.save();

  // Send notification
  try {
    const notifyIdentifier = isMobile ? user.mobile : user.email;
    const notifyChannel = isMobile ? "whatsapp" : "email";
    if (notifyChannel === "email") {
      await sendEmail({
        to: notifyIdentifier,
        subject: "Profile Updated",
        html: identifierUpdatedTemplate(user, isMobile ? "mobile" : "email", identifier.trim()),
      });
    }
  } catch (error) {
    logger.error("Failed to send identifier update notification:", error.message);
  }

  return res.status(200).json(new ApiResponse(200, { user }, "Identifier updated successfully"));
});

const verifyAndDeleteIdentifier = asyncHandler(async (req, res) => {
  const { targetType, verificationIdentifier, otp } = req.body; // targetType: "email" or "mobile"

  const result = await verifyOTP(verificationIdentifier, otp, "identifier-update");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  const user = await User.findById(req.user._id);

  if (targetType === "email") {
    user.email = undefined;
  } else if (targetType === "mobile") {
    user.mobile = undefined;
    user.isMobileVerified = false;
  }

  await user.save();

  // Send notification to the remaining identifier
  try {
    const notifyIdentifier = targetType === "email" ? user.mobile : user.email;
    const notifyChannel = targetType === "email" ? "whatsapp" : "email";
    if (notifyChannel === "email" && notifyIdentifier) {
      await sendEmail({
        to: notifyIdentifier,
        subject: "Profile Updated",
        html: identifierDeletedTemplate(user, targetType),
      });
    }
  } catch (error) {
    logger.error("Failed to send identifier deletion notification:", error.message);
  }

  return res.status(200).json(new ApiResponse(200, { user }, `${targetType} removed successfully`));
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
  sendIdentifierUpdateOTP,
  verifyAndAddIdentifier,
  verifyAndDeleteIdentifier,
};