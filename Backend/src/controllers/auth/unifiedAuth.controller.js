import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { OTP } from "../../models/otp.model.js";
import { storeOTP, verifyOTP } from "../../utils/otp.js";
import { sendEmail } from "../../utils/email.js";
import { sendWhatsAppOTP } from "../../utils/whatsappOtp.js";
import { otpEmailTemplate, passwordChangedEmailTemplate } from "../../utils/emailTemplates.js";
import { generateAccessAndRefreshToken, getCookieOptions } from "../user.controller.js";
import { createSession } from "../session.controller.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { isValidEmail, isValidMobile, detectChannel } from "../../utils/validators.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { assertPasswordStrength } from "../../utils/passwordValidation.js";
import logger from "../../utils/logger.js";

const sendRegistrationOTP = asyncHandler(async (req, res) => {
  const { email, mobile } = req.body;

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

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { mobile: normalizedMobile }],
  });
  if (existingUser) {
    const field = existingUser.email === normalizedEmail ? "Email" : "Mobile number";
    throw new ApiError(409, `${field} already registered. Please login.`);
  }

  const [emailOtp, mobileOtp] = await Promise.all([
    storeOTP(normalizedEmail, "registration", "email"),
    storeOTP(normalizedMobile, "registration", "whatsapp"),
  ]);

  await Promise.allSettled([
    sendEmail({
      to: normalizedEmail,
      subject: "Welcome to VideoTube — Verify Your Email",
      html: otpEmailTemplate(emailOtp, "registration"),
    }),
    sendWhatsAppOTP(normalizedMobile, mobileOtp).catch((err) => {
      logger.warn("WhatsApp OTP send failed, falling back to email-only", { error: err.message });
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { email: normalizedEmail, mobile: normalizedMobile }, "OTPs sent to both email and mobile number")
  );
});

const verifyRegistrationOTP = asyncHandler(async (req, res) => {
  const { identifier, otp: otpValue } = req.body;

  if (!identifier || !otpValue) {
    throw new ApiError(400, "Identifier (email or mobile) and OTP are required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const channel = detectChannel(normalizedIdentifier);

  const purpose = "registration";
  const result = await verifyOTP(normalizedIdentifier, otpValue, purpose);

  if (!result.valid) {
    throw new ApiError(400, result.message);
  }

  return res.status(200).json(
    new ApiResponse(200, { verified: true, identifier: normalizedIdentifier, channel }, `${channel} verified successfully`)
  );
});

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

  let emailVerified = false;
  let mobileVerified = false;

  if (emailOtp) {
    const result = await verifyOTP(normalizedEmail, emailOtp, "registration");
    if (result.valid) emailVerified = true;
  } else {
    const emailRecord = await OTP.findOne({ identifier: normalizedEmail, purpose: "registration" });
    if (emailRecord?.verified) emailVerified = true;
  }

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

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) throw new ApiError(409, "Email already registered");

  const existingMobile = await User.findOne({ mobile: normalizedMobile });
  if (existingMobile) throw new ApiError(409, "Mobile number already registered");

  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) throw new ApiError(409, "Username already taken");

  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=6366f1&color=fff`;
  let coverUrl = "";
  let uploadedAvatar = null;
  let uploadedCover = null;

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  if (avatarLocalPath) {
    uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);
    if (uploadedAvatar?.url) avatarUrl = uploadedAvatar.url;
  }

  const coverLocalPath = req.files?.coverImage?.[0]?.path;
  if (coverLocalPath) {
    uploadedCover = await uploadOnCloudinary(coverLocalPath);
    if (!uploadedCover?.url) {
      if (uploadedAvatar?.public_id) {
        await deleteFromCloudinary(uploadedAvatar.public_id, "image");
      }
      throw new ApiError(400, "Error while uploading cover image");
    }
    coverUrl = uploadedCover.url;
  }

  let user;
  try {
    user = await User.create({
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
  } catch (dbError) {
    if (uploadedAvatar?.public_id) await deleteFromCloudinary(uploadedAvatar.public_id, "image");
    if (uploadedCover?.public_id) await deleteFromCloudinary(uploadedCover.public_id, "image");
    throw dbError;
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken").lean();

  const options = getCookieOptions();

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        { user: loggedInUser },
        "User registered successfully"
      )
    );
});

const sendLoginOTP = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  if (!identifier?.trim()) {
    throw new ApiError(400, "Email or mobile number is required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const channel = detectChannel(normalizedIdentifier);

  let user;
  if (channel === "email") {
    user = await User.findOne({ email: normalizedIdentifier });
  } else {
    user = await User.findOne({ mobile: normalizedIdentifier });
  }

  if (!user) {
    return res.status(200).json(new ApiResponse(200, {}, "If the account exists, an OTP has been sent"));
  }

  if (channel === "email") {
    const otp = await storeOTP(normalizedIdentifier, "login", "email", user._id);
    try {
      await sendEmail({
        to: normalizedIdentifier,
        subject: "Your VideoTube Sign-In Code",
        html: otpEmailTemplate(otp, "login"),
      });
    } catch (error) {
      logger.error("Failed to send login OTP email:", error.message);
    }
  } else {
    const otp = await storeOTP(normalizedIdentifier, "login", "whatsapp", user._id);
    try {
      await sendWhatsAppOTP(normalizedIdentifier, otp);
    } catch (error) {
      logger.error("Failed to send login OTP WhatsApp:", error.message);
    }
  }

  return res.status(200).json(new ApiResponse(200, {}, "If the account exists, an OTP has been sent"));
});

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

  const user = await User.findOne(
    channel === "email" ? { email: normalizedIdentifier } : { mobile: normalizedIdentifier }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email before logging in");
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

export {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  registerUnified,
  sendLoginOTP,
  verifyLoginOTP,
};
