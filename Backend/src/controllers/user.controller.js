import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { escapeRegex } from "../utils/sanitizer.js";
import { sendEmail } from "../utils/email.js";
import { storeOTP, verifyOTP } from "../utils/otp.js";
import { OTP } from "../models/otp.model.js";
import { otpEmailTemplate, passwordChangedEmailTemplate } from "../utils/emailTemplates.js";
import { sendWhatsAppOTP, storeWhatsAppOTP, verifyWhatsAppOTP } from "../utils/whatsappOtp.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createSession, deactivateSession, updateSessionActivity } from "./session.controller.js";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // debug avatar/cover paths
  // get user details from frontend
  // validation - not empty
  // check if user already exists: email, username
  // check for image and avatar
  // upload them to clodinary
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { username, fullName, email, password } = req.body;

  /* this is for single one by one validation check

  if(fullName === ""){
    throw new ApiError(400, "Full name is required");
  }
  */

  // ------------------------------------------------------------

  // this is advance validation check and it helps all together checking at once using array and some mehtod, it is more efficient and clean code rather than writing one by one validation check for each field
  if ([username, fullName, email, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Please provide a valid email");
  }

  // check if user already exists: email, username
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar image is required");
  }

  const user = await User.create({
    fullName: fullName.trim(),
    avatar: avatar.secure_url || avatar.url,
    avatarPublicId: avatar.public_id,
    coverImage: coverImage?.secure_url || coverImage?.url || "",
    coverImagePublicId: coverImage?.public_id || "",
    email: normalizedEmail,
    password,
    username: normalizedUsername,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // passowrd check
  // access token and refresh token
  // send cookie

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [
      ...(username ? [{ username: username.toLowerCase() }] : []),
      ...(email ? [{ email: email.toLowerCase() }] : []),
    ],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = getCookieOptions();

  await createSession(user._id, refreshToken, req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  if (incomingRefreshToken) {
    await deactivateSession(incomingRefreshToken);
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      returnDocument: "after",
    }
  );

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  await deactivateSession(incomingRefreshToken);
  await createSession(user._id, refreshToken, req);

  const options = getCookieOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access token refreshed successfully"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (
    [oldPassword, newPassword].some(
      (field) => typeof field !== "string" || !field.trim()
    )
  ) {
    throw new ApiError(400, "Old password and new password are required");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isOldPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }

  const isSamePassword = await user.isPasswordCorrect(newPassword);

  if (isSamePassword) {
    throw new ApiError(400, "New password must be different from old password");
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

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
    {
      $set: updateFields,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserImage = async ({
  userId,
  localFilePath,
  urlField,
  publicIdField,
  missingFileMessage,
  uploadErrorMessage,
}) => {
  if (!localFilePath) {
    throw new ApiError(400, missingFileMessage);
  }

  const user = await User.findById(userId).select(
    `${urlField} ${publicIdField}`
  );

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
      {
        $set: updateFields,
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select("-password -refreshToken");
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

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
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

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover image updated successfully")
    );
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

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Channel banner updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelsSubscribedToCount: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
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
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory || [],
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

  // delete all videos of the user from cloudinary
  const userVideos = await Video.find({ owner: userId }).select(
    "videoFile thumbnail"
  );

  for (const video of userVideos) {
    if (video.videoFile) {
      await deleteFromCloudinary(video.videoFile);
    }
    if (video.thumbnail) {
      await deleteFromCloudinary(video.thumbnail);
    }
  }

  // delete user's avatar and cover image from cloudinary
  if (user.avatarPublicId) {
    await deleteFromCloudinary(user.avatarPublicId);
  }
  if (user.coverImagePublicId) {
    await deleteFromCloudinary(user.coverImagePublicId);
  }

  // delete subscriptions (as subscriber and as channel)
  await Subscription.deleteMany({
    $or: [{ subscriber: userId }, { channel: userId }],
  });

  // delete videos (from db)
  await Video.deleteMany({ owner: userId });

  // delete comments
  await Comment.deleteMany({ owner: userId });

  // delete likes
  await Like.deleteMany({ likedBy: userId });

  // delete playlists
  await Playlist.deleteMany({ owner: userId });

  // delete user
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
    {
      $set: updateFields,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const profile = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase().trim(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
      },
    },
    {
      $addFields: {
        subscriberCount: { $size: "$subscribers" },
        videoCount: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
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

  return res
    .status(200)
    .json(new ApiResponse(200, profile[0], "User profile fetched successfully"));
});

const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const searchRegex = new RegExp(escapeRegex(query.trim()), "i");

  const users = await User.find({
    $or: [{ username: searchRegex }, { fullName: searchRegex }],
  }).select("_id username fullName avatar isVerified");

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json(new ApiResponse(200, {}, "If the email exists, a reset link has been sent"));
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 15 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
    });
  } catch (error) {
    // In production, SMTP credentials should be set in .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
    console.error("Failed to send reset email:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "If the email exists, a reset link has been sent")
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, "Token and new password are required");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
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
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { watchLater: true }, "Added to watch later"));
  }
});

const getWatchLater = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: "watchLater",
      match: { isPublished: true },
      select: "title thumbnail views duration createdAt",
      populate: { path: "owner", select: "fullName username avatar" },
    })
    .select("watchLater");

  return res.status(200).json(new ApiResponse(200, user.watchLater, "Watch later fetched"));
});

const addSearchHistory = asyncHandler(async (req, res) => {
  const { query } = req.body;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const user = await User.findById(req.user._id);
  // Remove duplicate and add to front
  user.searchHistory = user.searchHistory.filter((q) => q !== query.trim());
  user.searchHistory.unshift(query.trim());
  // Keep only last 50
  if (user.searchHistory.length > 50) {
    user.searchHistory = user.searchHistory.slice(0, 50);
  }
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, user.searchHistory, "Search history updated"));
});

const getSearchHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("searchHistory");
  return res.status(200).json(new ApiResponse(200, user.searchHistory || [], "Search history fetched"));
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
  ).select("notificationPrefs");

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
  ).select("isPrivate");

  return res.status(200).json(new ApiResponse(200, user, "Privacy settings updated"));
});

const exportUserData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password -refreshToken -passwordResetToken")
    .lean();

  const videos = await Video.find({ owner: req.user._id }).lean();
  const comments = await Comment.find({ owner: req.user._id }).lean();
  const playlists = await Playlist.find({ owner: req.user._id }).lean();

  const exportData = {
    profile: user,
    videos,
    comments,
    playlists,
    exportedAt: new Date().toISOString(),
  };

  return res.status(200).json(new ApiResponse(200, exportData, "User data exported"));
});

const forgotPasswordOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(200).json(new ApiResponse(200, {}, "If the email exists, an OTP has been sent"));
  }

  const otp = await storeOTP(normalizedEmail, "forgot-password");

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Your VideoTube Account Recovery Code",
      html: otpEmailTemplate(otp, "forgot-password"),
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "If the email exists, an OTP has been sent")
  );
});

const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await verifyOTP(normalizedEmail, otp, "forgot-password");

  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  const resetToken = jwt.sign(
    { email: normalizedEmail, purpose: "reset" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "5m" }
  );

  return res.status(200).json(
    new ApiResponse(200, { resetToken }, "OTP verified. Use the reset token to set a new password.")
  );
});

const resetPasswordWithOTP = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    throw new ApiError(400, "Reset token and new password are required");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (decoded.purpose !== "reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: passwordChangedEmailTemplate(),
    });
  } catch (error) {
    console.error("Failed to send password changed email:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset successfully")
  );
});

const sendChangePasswordOTP = asyncHandler(async (req, res) => {
  const { channel = "email" } = req.body;
  const user = await User.findById(req.user._id);
  const email = user.email;
  const mobile = user.mobile;

  if (channel === "whatsapp") {
    if (!mobile) {
      throw new ApiError(400, "No mobile number linked. Please add one in your profile first.");
    }
    const otp = await storeOTP(mobile, "change-password", "whatsapp");
    try {
      await sendWhatsAppOTP(mobile, otp);
    } catch (error) {
      console.error("Failed to send OTP WhatsApp:", error.message);
    }
    return res.status(200).json(
      new ApiResponse(200, { channel: "whatsapp" }, "OTP sent to your WhatsApp")
    );
  } else {
    const otp = await storeOTP(email, "change-password", "email");
    try {
      await sendEmail({
        to: email,
        subject: "Your VideoTube Password Change Code",
        html: otpEmailTemplate(otp, "change-password"),
      });
    } catch (error) {
      console.error("Failed to send OTP email:", error.message);
    }
    return res.status(200).json(
      new ApiResponse(200, { channel: "email" }, "OTP sent to your email")
    );
  }
});

const verifyAndChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, otp, channel = "email" } = req.body;

  if (!oldPassword || !newPassword || !otp) {
    throw new ApiError(400, "Old password, new password, and OTP are required");
  }

  if (newPassword.length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await User.findById(req.user._id);
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
  user.refreshToken = undefined;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: passwordChangedEmailTemplate(),
    });
  } catch (error) {
    console.error("Failed to send password changed email:", error.message);
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

const socialLogin = asyncHandler(async (req, res) => {
  const { provider, providerId, email, name, avatar } = req.body;

  if (!provider || !providerId || !email || !name) {
    throw new ApiError(400, "Provider, providerId, email, and name are required");
  }

  const allowedProviders = ["google", "github", "facebook", "microsoft", "apple", "x"];
  if (!allowedProviders.includes(provider)) {
    throw new ApiError(400, `Invalid provider. Allowed: ${allowedProviders.join(", ")}`);
  }

  if (!isValidEmail(email)) {
    throw new ApiError(400, "Invalid email address");
  }

  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    user.socialAccounts = user.socialAccounts || new Map();
    user.socialAccounts.set(provider, providerId);
    if (avatar && (!user.avatar || user.avatar === "")) {
      user.avatar = avatar;
    }
    await user.save({ validateBeforeSave: false });
  } else {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const socialMap = new Map();
    socialMap.set(provider, providerId);

    const usernameBase = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
    let username = usernameBase;
    let suffix = 1;
    while (await User.findOne({ username })) {
      username = `${usernameBase}${suffix}`;
      suffix++;
    }

    user = await User.create({
      username,
      fullName: name.trim(),
      email: normalizedEmail,
      password: randomPassword,
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
      socialAccounts: socialMap,
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = getCookieOptions();

  await createSession(user._id, refreshToken, req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Logged in via social account"
      )
    );
});

const linkSocialAccount = asyncHandler(async (req, res) => {
  const { provider, providerId } = req.body;

  if (!provider || !providerId) {
    throw new ApiError(400, "Provider and providerId are required");
  }

  const allowedProviders = ["google", "github", "facebook", "microsoft", "apple", "x"];
  if (!allowedProviders.includes(provider)) {
    throw new ApiError(400, `Invalid provider. Allowed: ${allowedProviders.join(", ")}`);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.socialAccounts = user.socialAccounts || new Map();
  user.socialAccounts.set(provider, providerId);
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, {}, `${provider} account linked successfully`)
  );
});

// ── WhatsApp OTP + Unified Auth ──
const isValidMobile = (mobile) => /^\+?[1-9]\d{9,14}$/.test(mobile);

// Determine channel for a given identifier
const detectChannel = (identifier) => {
  if (/^\+?[1-9]\d{9,14}$/.test(identifier.trim())) return "whatsapp";
  return "email";
};

// ── Unified Registration Flow ──
// Step 1: Send OTPs to both email and mobile
const sendRegistrationOTP = asyncHandler(async (req, res) => {
  const { email, mobile, channel } = req.body;

  if (!email?.trim() || !mobile?.trim()) {
    throw new ApiError(400, "Email and mobile number are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim().replace(/\s/g, "");

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Please provide a valid email");
  }
  if (!isValidMobile(normalizedMobile)) {
    throw new ApiError(400, "Invalid mobile number format. Use +91XXXXXXXXXX format");
  }

  // Check if email or mobile already registered
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
  });
  if (existingUser) {
    const field = existingUser.email === normalizedEmail ? "Email" : "Mobile number";
    throw new ApiError(409, `${field} already registered. Please login.`);
  }

  const sendChannel = channel === "whatsapp" ? "whatsapp" : "email";

  // Send OTP via the chosen channel only
  if (sendChannel === "email") {
    const emailOtp = await storeOTP(normalizedEmail, "registration", "email");
    try {
      await sendEmail({
        to: normalizedEmail,
        subject: "Welcome to VideoTube — Verify Your Email",
        html: otpEmailTemplate(emailOtp, "registration"),
      });
    } catch (error) {
      console.error("Failed to send registration OTP email:", error.message);
    }
  } else {
    const mobileOtp = await storeOTP(normalizedMobile, "registration", "whatsapp");
    try {
      await sendWhatsAppOTP(normalizedMobile, mobileOtp);
    } catch (error) {
      console.error("Failed to send registration OTP WhatsApp:", error.message);
    }
  }

  return res.status(200).json(
    new ApiResponse(200, { email: normalizedEmail, mobile: normalizedMobile, channel: sendChannel }, `OTP sent to your ${sendChannel === "email" ? "email" : "mobile number"}`)
  );
});

// Step 2: Verify OTP for a specific channel
const verifyRegistrationOTP = asyncHandler(async (req, res) => {
  const { identifier, otp: otpValue } = req.body;

  if (!identifier || !otpValue) {
    throw new ApiError(400, "Identifier (email or mobile) and OTP are required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const channel = detectChannel(normalizedIdentifier);

  const purpose = channel === "whatsapp" ? "registration" : "registration";
  const result = await verifyOTP(normalizedIdentifier, otpValue, purpose);

  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  return res.status(200).json(
    new ApiResponse(200, { verified: true, identifier: normalizedIdentifier, channel }, `${channel} verified successfully`)
  );
});

// Step 3: Complete registration (requires at least ONE OTP verified - email OR mobile)
const registerUnified = asyncHandler(async (req, res) => {
  const { email, mobile, fullName, username, password, emailOtp, mobileOtp } = req.body;

  if (!email || !mobile || !fullName || !username || !password) {
    throw new ApiError(400, "All fields are required: email, mobile, fullName, username, password");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim().replace(/\s/g, "");

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Please provide a valid email");
  }
  if (!isValidMobile(normalizedMobile)) {
    throw new ApiError(400, "Invalid mobile number format");
  }
  if (password.length < 8 || password.length > 16) {
    throw new ApiError(400, "Password must be 8-16 characters");
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new ApiError(400, "Password must contain uppercase, lowercase, number, and special character");
  }

  // Verify at least ONE OTP is verified (email OR mobile)
  let emailVerified = false;
  let mobileVerified = false;

  // Check email OTP (passed inline or already verified in DB)
  if (emailOtp) {
    const result = await verifyOTP(normalizedEmail, emailOtp, "registration");
    if (result.valid) emailVerified = true;
  } else {
    const emailRecord = await OTP.findOne({ identifier: normalizedEmail, purpose: "registration" });
    if (emailRecord?.verified) emailVerified = true;
  }

  // Check mobile OTP (passed inline or already verified in DB)
  if (mobileOtp) {
    const result = await verifyOTP(normalizedMobile, mobileOtp, "registration");
    if (result.valid) mobileVerified = true;
  } else {
    const mobileRecord = await OTP.findOne({ identifier: normalizedMobile, purpose: "registration" });
    if (mobileRecord?.verified) mobileVerified = true;
  }

  if (!emailVerified && !mobileVerified) {
    throw new ApiError(400, "Please verify at least one OTP (email or mobile)");
  }

  // Check uniqueness
  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) throw new ApiError(409, "Email already registered");

  const existingMobile = await User.findOne({ mobile: normalizedMobile });
  if (existingMobile) throw new ApiError(409, "Mobile number already registered");

  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) throw new ApiError(409, "Username already taken");

  // Upload avatar to Cloudinary
  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
  let coverUrl = "";

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  if (avatarLocalPath) {
    const uploaded = await uploadOnCloudinary(avatarLocalPath);
    if (uploaded?.url) avatarUrl = uploaded.url;
  }

  const coverLocalPath = req.files?.coverImage?.[0]?.path;
  if (coverLocalPath) {
    const uploaded = await uploadOnCloudinary(coverLocalPath);
    if (uploaded?.url) coverUrl = uploaded.url;
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullName: fullName.trim(),
    email: normalizedEmail,
    mobile: normalizedMobile,
    isEmailVerified: true,
    isMobileVerified: true,
    password,
    avatar: avatarUrl,
    ...(coverUrl && { coverImage: coverUrl }),
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = getCookieOptions();

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        { user: loggedInUser, accessToken, refreshToken },
        "User registered successfully"
      )
    );
});

// ── OTP Login (Passwordless) ──
// Step 1: Send login OTP
const sendLoginOTP = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  if (!identifier?.trim()) {
    throw new ApiError(400, "Email or mobile number is required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const channel = detectChannel(normalizedIdentifier);

  // Find user by email or mobile
  let user;
  if (channel === "email") {
    user = await User.findOne({ email: normalizedIdentifier });
  } else {
    user = await User.findOne({ mobile: normalizedIdentifier });
  }

  if (!user) {
    // Don't reveal if user exists
    return res.status(200).json(new ApiResponse(200, {}, "If the account exists, an OTP has been sent"));
  }

  // Send OTP via appropriate channel
  if (channel === "email") {
    const otp = await storeOTP(normalizedIdentifier, "login", "email");
    try {
      await sendEmail({
        to: normalizedIdentifier,
        subject: "Your VideoTube Sign-In Code",
        html: otpEmailTemplate(otp, "login"),
      });
    } catch (error) {
      console.error("Failed to send login OTP email:", error.message);
    }
  } else {
    const otp = await storeOTP(normalizedIdentifier, "login", "whatsapp");
    try {
      await sendWhatsAppOTP(normalizedIdentifier, otp);
    } catch (error) {
      console.error("Failed to send login OTP WhatsApp:", error.message);
    }
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "If the account exists, an OTP has been sent")
  );
});

// Step 2: Verify login OTP and get tokens
const verifyLoginOTP = asyncHandler(async (req, res) => {
  const { identifier, otp: otpValue } = req.body;

  if (!identifier || !otpValue) {
    throw new ApiError(400, "Identifier and OTP are required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const channel = detectChannel(normalizedIdentifier);

  const result = await verifyOTP(normalizedIdentifier, otpValue, "login");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  // Find user
  let user;
  if (channel === "email") {
    user = await User.findOne({ email: normalizedIdentifier });
  } else {
    user = await User.findOne({ mobile: normalizedIdentifier });
  }

  if (!user) {
    throw new ApiError(404, "No account found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = getCookieOptions();

  await createSession(user._id, refreshToken, req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Logged in via OTP"
      )
    );
});

// ── Forgot Password ──
// Step 1: Send forgot password OTP (auto-detect channel from identifier)
const sendForgotPasswordOTP = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  if (!identifier?.trim()) {
    throw new ApiError(400, "Email or mobile number is required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const detectedChannel = detectChannel(normalizedIdentifier);

  // Find user
  let user;
  if (detectedChannel === "email") {
    user = await User.findOne({ email: normalizedIdentifier });
  } else {
    user = await User.findOne({ mobile: normalizedIdentifier });
  }

  if (!user) {
    return res.status(200).json(new ApiResponse(200, {}, "If the account exists, an OTP has been sent"));
  }

  // Send OTP via auto-detected channel
  const purpose = "forgot-password";
  if (detectedChannel === "email") {
    const targetEmail = user.email;
    const otp = await storeOTP(targetEmail, purpose, "email");
    try {
      await sendEmail({
        to: targetEmail,
        subject: "Your VideoTube Account Recovery Code",
        html: otpEmailTemplate(otp, "forgot-password"),
      });
    } catch (error) {
      console.error("Failed to send forgot password OTP email:", error.message);
    }
  } else {
    const targetMobile = user.mobile;
    if (!targetMobile) {
      throw new ApiError(400, "No mobile number linked to this account. Please use email.");
    }
    const otp = await storeOTP(targetMobile, purpose, "whatsapp");
    try {
      await sendWhatsAppOTP(targetMobile, otp);
    } catch (error) {
      console.error("Failed to send forgot password OTP WhatsApp:", error.message);
    }
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "If the account exists, an OTP has been sent")
  );
});

// Step 2: Verify forgot password OTP
const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
  const { identifier, otp: otpValue } = req.body;

  if (!identifier || !otpValue) {
    throw new ApiError(400, "Identifier and OTP are required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();

  const result = await verifyOTP(normalizedIdentifier, otpValue, "forgot-password");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  // Generate a short-lived reset token
  const resetToken = jwt.sign(
    { identifier: normalizedIdentifier, purpose: "reset" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "10m" }
  );

  return res.status(200).json(
    new ApiResponse(200, { resetToken }, "OTP verified. Use the reset token to set a new password or skip to login.")
  );
});

// Step 3a: Reset password with reset token
const resetPasswordWithResetToken = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    throw new ApiError(400, "Reset token and new password are required");
  }
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (decoded.purpose !== "reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  // Find user by identifier (email or mobile)
  const normalizedIdentifier = decoded.identifier;
  const channel = detectChannel(normalizedIdentifier);

  let user;
  if (channel === "email") {
    user = await User.findOne({ email: normalizedIdentifier });
  } else {
    user = await User.findOne({ mobile: normalizedIdentifier });
  }

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  // Send password changed email
  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: passwordChangedEmailTemplate(),
    });
  } catch (error) {
    console.error("Failed to send password changed email:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset successfully")
  );
});

// Step 3b: Skip password reset and just login
const skipAndLogin = asyncHandler(async (req, res) => {
  const { resetToken } = req.body;

  if (!resetToken) {
    throw new ApiError(400, "Reset token is required");
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  if (decoded.purpose !== "reset") {
    throw new ApiError(400, "Invalid reset token");
  }

  const normalizedIdentifier = decoded.identifier;
  const channel = detectChannel(normalizedIdentifier);

  let user;
  if (channel === "email") {
    user = await User.findOne({ email: normalizedIdentifier });
  } else {
    user = await User.findOne({ mobile: normalizedIdentifier });
  }

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = getCookieOptions();

  await createSession(user._id, refreshToken, req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "Logged in successfully"
      )
    );
});

// Keep old email registration for backward compatibility
const sendEmailRegistrationOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, "Email already registered. Please login.");
  }

  const otp = await storeOTP(normalizedEmail, "email-registration", "email");

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Welcome to VideoTube — Verify Your Email",
      html: otpEmailTemplate(otp, "email-registration"),
    });
  } catch (error) {
    console.error("Failed to send registration OTP email:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(200, { email: normalizedEmail }, "OTP sent to your email")
  );
});

const verifyEmailRegistrationOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await verifyOTP(normalizedEmail, otp, "email-registration");

  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  return res.status(200).json(
    new ApiResponse(200, { verified: true, email: normalizedEmail }, "Email verified successfully")
  );
});

const registerWithEmailOTP = asyncHandler(async (req, res) => {
  const { email, otp, fullName, username, password } = req.body;

  if (!email || !otp || !fullName || !username || !password) {
    throw new ApiError(400, "All fields are required: email, otp, fullName, username, password");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  if (password.length < 8 || password.length > 16) {
    throw new ApiError(400, "Password must be 8-16 characters");
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new ApiError(400, "Password must contain uppercase, lowercase, number, and special character");
  }

  const result = await verifyOTP(normalizedEmail, otp, "email-registration");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new ApiError(409, "Email already registered");
  }

  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) {
    throw new ApiError(409, "Username already taken");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = getCookieOptions();

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        { user: loggedInUser, accessToken, refreshToken },
        "User registered successfully"
      )
    );
});

// ── Delete Account OTP ──
const sendDeleteAccountOTP = asyncHandler(async (req, res) => {
  const { password, channel = "email" } = req.body;

  if (!password) {
    throw new ApiError(400, "Password is required to send delete OTP");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  if (channel === "whatsapp") {
    if (!user.mobile) {
      throw new ApiError(400, "No mobile number linked. Please add one in your profile first.");
    }
    const otp = await storeOTP(user.mobile, "delete-account", "whatsapp");
    try {
      await sendWhatsAppOTP(user.mobile, otp);
    } catch (error) {
      console.error("Failed to send delete OTP WhatsApp:", error.message);
    }
    return res.status(200).json(
      new ApiResponse(200, { channel: "whatsapp" }, "OTP sent to your WhatsApp for account deletion")
    );
  } else {
    const otp = await storeOTP(user.email, "delete-account", "email");
    try {
      await sendEmail({
        to: user.email,
        subject: "Your VideoTube Account Deletion Code",
        html: otpEmailTemplate(otp, "delete-account"),
      });
    } catch (error) {
      console.error("Failed to send delete account OTP email:", error.message);
    }
    return res.status(200).json(
      new ApiResponse(200, { channel: "email" }, "OTP sent to your email for account deletion")
    );
  }
});

const verifyAndDeleteAccount = asyncHandler(async (req, res) => {
  const { password, otp, channel = "email" } = req.body;

  if (!password || !otp) {
    throw new ApiError(400, "Password and OTP are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  const identifier = channel === "whatsapp" ? user.mobile : user.email;
  if (channel === "whatsapp" && !identifier) {
    throw new ApiError(400, "No mobile number linked to this account");
  }

  const result = await verifyOTP(identifier, otp, "delete-account");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  const userId = user._id;

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
  await User.findByIdAndDelete(userId);

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Account deleted successfully"));
});

// ── Forgot Password from Settings (no old password needed) ──
const sendForgotPasswordChangeOTP = asyncHandler(async (req, res) => {
  const { channel = "email" } = req.body;
  const user = await User.findById(req.user._id);
  const email = user.email;
  const mobile = user.mobile;

  if (channel === "whatsapp") {
    if (!mobile) {
      throw new ApiError(400, "No mobile number linked. Please add one in your profile first.");
    }
    const otp = await storeOTP(mobile, "forgot-password-change", "whatsapp");
    try {
      await sendWhatsAppOTP(mobile, otp);
    } catch (error) {
      console.error("Failed to send forgot password change OTP WhatsApp:", error.message);
    }
    return res.status(200).json(
      new ApiResponse(200, { channel: "whatsapp" }, "OTP sent to your WhatsApp")
    );
  } else {
    const otp = await storeOTP(email, "forgot-password-change", "email");
    try {
      await sendEmail({
        to: email,
        subject: "Your VideoTube Password Reset Code",
        html: otpEmailTemplate(otp, "forgot-password-change"),
      });
    } catch (error) {
      console.error("Failed to send forgot password change OTP:", error.message);
    }
    return res.status(200).json(
      new ApiResponse(200, { channel: "email" }, "OTP sent to your email")
    );
  }
});

const verifyAndResetPasswordViaOTP = asyncHandler(async (req, res) => {
  const { newPassword, otp, channel = "email" } = req.body;

  if (!newPassword || !otp) {
    throw new ApiError(400, "New password and OTP are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const identifier = channel === "whatsapp" ? user.mobile : user.email;
  if (channel === "whatsapp" && !identifier) {
    throw new ApiError(400, "No mobile number linked to this account");
  }

  const result = await verifyOTP(identifier, otp, "forgot-password-change");
  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  user.password = newPassword;
  user.refreshToken = undefined;
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Changed",
      html: passwordChangedEmailTemplate(),
    });
  } catch (error) {
    console.error("Failed to send password changed email:", error.message);
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
        "Password reset successfully. Please login again"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  deleteCurrentUser,
  updateUserProfile,
  getUserProfile,
  searchUsers,
  forgotPassword,
  resetPassword,
  blockUser,
  muteUser,
  addToWatchLater,
  getWatchLater,
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  clearWatchHistory,
  updateNotificationPrefs,
  getNotificationPrefs,
  updatePrivacySettings,
  exportUserData,
  updateUserBanner,
  forgotPasswordOTP,
  verifyResetOTP,
  resetPasswordWithOTP,
  sendChangePasswordOTP,
  verifyAndChangePassword,
  socialLogin,
  linkSocialAccount,
  sendDeleteAccountOTP,
  verifyAndDeleteAccount,
  sendForgotPasswordChangeOTP,
  verifyAndResetPasswordViaOTP,
  // New unified auth flows
  sendRegistrationOTP,
  verifyRegistrationOTP,
  registerUnified,
  sendLoginOTP,
  verifyLoginOTP,
  sendForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetPasswordWithResetToken,
  skipAndLogin,
  // Keep old exports for backward compatibility
  sendEmailRegistrationOTP,
  verifyEmailRegistrationOTP,
  registerWithEmailOTP,
};
