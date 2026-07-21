import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { createSession, deactivateSession } from "../session.controller.js";
import { generateAccessAndRefreshToken, getCookieOptions, isValidEmail, isValidMobile } from "../user.controller.js";
import { sendEmail } from "../../utils/email.js";
import { storeOTP, verifyOTP } from "../../utils/otp.js";
import { otpEmailTemplate } from "../../utils/emailTemplates.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { assertPasswordStrength } from "../../utils/passwordValidation.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import logger from "../../utils/logger.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;

  if ([username, fullName, email, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(400, "Please provide a valid email");
  }

  assertPasswordStrength(password);

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  }).select("_id").lean();

  if (existingUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar image is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  let user;
  try {
    user = await User.create({
      fullName: fullName.trim(),
      avatar: avatar.secure_url || avatar.url,
      avatarPublicId: avatar.public_id,
      coverImage: coverImage?.secure_url || coverImage?.url || "",
      coverImagePublicId: coverImage?.public_id || "",
      email: normalizedEmail,
      password,
      username: normalizedUsername,
      isEmailVerified: true,
    });
  } catch (dbError) {
    await deleteFromCloudinary(avatar.public_id, "image");
    if (coverImage?.public_id) {
      await deleteFromCloudinary(coverImage.public_id, "image");
    }
    throw dbError;
  }

  const createdUser = await User.findById(user._id).select("-password -refreshToken").lean();

  if (!createdUser) {
    await deleteFromCloudinary(avatar.public_id, "image");
    if (coverImage?.public_id) {
      await deleteFromCloudinary(coverImage.public_id, "image");
    }
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, mobile, password } = req.body;

  if (!username && !email && !mobile) {
    throw new ApiError(400, "Username, email, or mobile number is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [
      ...(username ? [{ username: username.toLowerCase() }] : []),
      ...(email ? [{ email: email.toLowerCase() }] : []),
      ...(mobile ? [{ mobile: mobile.trim() }] : []),
    ],
  }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid user credentials");
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
    throw new ApiError(429, `Account temporarily locked. Try again in ${remainingMinutes} minute(s)`);
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION_MINUTES = 15;
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      user.loginAttempts = 0;
      await user.save({ validateBeforeSave: false });
      throw new ApiError(429, `Account locked due to ${MAX_ATTEMPTS} failed attempts. Try again in ${LOCK_DURATION_MINUTES} minutes`);
    }
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, "Invalid user credentials");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
  }

  if (user.loginAttempts > 0 || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save({ validateBeforeSave: false });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken").lean();

  const options = getCookieOptions();

  await createSession(user._id, refreshToken, req);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;
  if (incomingRefreshToken) {
    await deactivateSession(incomingRefreshToken);
  }

  const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (accessToken) {
    const { blacklistToken } = await import("../../utils/redis.js");
    await blacklistToken(accessToken, 86400);
  }

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const session = await (await import("../../models/session.model.js")).Session.findOne({
    refreshToken: incomingRefreshToken,
    isActive: true,
  });

  if (!session) {
    throw new ApiError(401, "Refresh token is expired or revoked");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  await deactivateSession(incomingRefreshToken);
  await createSession(user._id, refreshToken, req);

  const freshUser = await User.findById(user._id).select("-password -refreshToken").lean();

  const options = getCookieOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: freshUser },
        "Token refreshed successfully"
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

  if ([oldPassword, newPassword].some((field) => typeof field !== "string" || !field.trim())) {
    throw new ApiError(400, "Old password and new password are required");
  }

  assertPasswordStrength(newPassword);

  const user = await User.findById(req.user?._id).select("+password");

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
  await user.save();

  await (await import("../../models/session.model.js")).Session.updateMany({ user: req.user._id }, { isActive: false });

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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return res.status(200).json(new ApiResponse(200, {}, "If the email exists, a reset link has been sent"));
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 15 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
    });
  } catch (error) {
    logger.error("Failed to send reset email:", error.message);
  }

  return res.status(200).json(new ApiResponse(200, {}, "If the email exists, a reset link has been sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, "Token and new password are required");
  }
  assertPasswordStrength(newPassword);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+passwordResetToken");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await (await import("../../models/session.model.js")).Session.updateMany({ user: user._id }, { isActive: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});

const socialLogin = asyncHandler(async (req, res) => {
  const { provider, token } = req.body;

  if (!provider || !token) {
    throw new ApiError(400, "Provider and OAuth access token are required");
  }

  const allowedProviders = ["google", "github"];
  if (!allowedProviders.includes(provider)) {
    throw new ApiError(400, `Server-side OAuth token verification only supports: ${allowedProviders.join(", ")}. For other providers, use the server-side OAuth flow at /api/v1/auth/${provider}.`);
  }

  const { verifyOAuthToken } = await import("../../utils/verifyOAuthToken.js");
  const verifiedData = await verifyOAuthToken(provider, token);
  const { email: verifiedEmail, name: verifiedName, avatar: verifiedAvatar, providerId } = verifiedData;

  const normalizedEmail = verifiedEmail.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (user?.banned) {
    throw new ApiError(403, "Your account has been banned");
  }

  let isNewUser = false;

  if (user) {
    user.socialAccounts = user.socialAccounts || new Map();
    user.socialAccounts.set(provider, providerId);
    if (verifiedAvatar && (!user.avatar || user.avatar === "")) {
      user.avatar = verifiedAvatar;
    }
    await user.save({ validateBeforeSave: false });
  } else {
    isNewUser = true;
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const socialMap = new Map();
    socialMap.set(provider, providerId);

    const usernameBase = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
    let username = usernameBase;
    let suffix = 1;
    for (let attempts = 0; attempts < 10; attempts++) {
      try {
        user = await User.create({
          username,
          fullName: verifiedName.trim(),
          email: normalizedEmail,
          password: randomPassword,
          avatar: verifiedAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(verifiedName)}&background=6366f1&color=fff`,
          socialAccounts: socialMap,
          isEmailVerified: true,
        });
        break;
      } catch (err) {
        if (err.code === 11000 && attempts < 9) {
          username = `${usernameBase}${suffix}`;
          suffix++;
          continue;
        }
        throw err;
      }
    }
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken").lean();

  const options = getCookieOptions();

  await createSession(user._id, refreshToken, req);

  return res
    .status(isNewUser ? 201 : 200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        isNewUser ? 201 : 200,
        { user: loggedInUser },
        isNewUser ? "User registered via social login" : "User logged in successfully"
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
  forgotPassword,
  resetPassword,
  socialLogin,
};
