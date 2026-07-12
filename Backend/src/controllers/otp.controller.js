import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { otpService } from "../services/otp.service.js";
import { sendEmail } from "../utils/email.js";
import { User } from "../models/user.model.js";
import { OTP } from "../models/otp.model.js";

const sendOtp = asyncHandler(async (req, res) => {
  const { identifier, purpose, channel = "email", userId } = req.body;

  if (!identifier || !purpose) {
    throw new ApiError(400, "Identifier and purpose are required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = emailRegex.test(identifier);

  if (channel === "email" && !isEmail) {
    throw new ApiError(400, "Invalid email format.");
  }

  const targetUserId = userId || (req.user?._id);
  let user = null;

  if (targetUserId) {
    user = await User.findById(targetUserId).select("fullName username email");
  } else if (isEmail) {
    user = await User.findOne({ email: identifier.toLowerCase() }).select("fullName username email");
  }

  const { otp, otpDoc, remainingGlobal, remainingUser } = await otpService.storeOtp({
    identifier: identifier.toLowerCase(),
    userId: user?._id,
    purpose,
    channel,
  });

  if (channel === "email") {
    await otpService.sendOtpEmail({
      identifier: identifier.toLowerCase(),
      otp,
      purpose,
      userName: user?.fullName,
    });
  }

  return res.status(200).json(
    new ApiResponse(200, {
      message: `OTP sent via ${channel}.`,
      expiresIn: otpService.OTP_CONSTANTS.OTP_EXPIRY_MINUTES * 60,
      remainingGlobal,
      remainingUser,
    }, "OTP sent successfully.")
  );
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, otp, purpose } = req.body;

  if (!identifier || !otp || !purpose) {
    throw new ApiError(400, "Identifier, OTP, and purpose are required.");
  }

  const result = await otpService.verifyOtp({
    identifier: identifier.toLowerCase(),
    otp,
    purpose,
  });

  if (!result.valid) {
    throw new ApiError(400, result.message, null, { attemptsRemaining: result.attemptsRemaining });
  }

  return res.status(200).json(
    new ApiResponse(200, {
      verified: true,
      channel: result.channel,
      userId: result.userId,
    }, result.message)
  );
});

const resendOtp = asyncHandler(async (req, res) => {
  const { identifier, purpose, channel = "email" } = req.body;

  if (!identifier || !purpose) {
    throw new ApiError(400, "Identifier and purpose are required.");
  }

  const existing = await OTP.findOne({ identifier: identifier.toLowerCase(), purpose });
  if (!existing) {
    throw new ApiError(404, "No previous OTP found for this identifier and purpose.");
  }

  if (!existing.verified && new Date() < existing.expiresAt) {
    const cooldownMs = otpService.OTP_CONSTANTS.RESEND_COOLDOWN_SECONDS * 1000;
    const timeSinceCreated = Date.now() - existing.createdAt.getTime();
    if (timeSinceCreated < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - timeSinceCreated) / 1000);
      throw new ApiError(429, `Please wait ${waitSeconds} seconds before requesting a new OTP.`);
    }
  }

  req.body.userId = req.user?._id;
  return sendOtp(req, res);
});

const getOtpUsage = asyncHandler(async (req, res) => {
  const usage = await otpService.getUserOtpUsage(req.user._id);
  const globalCount = otpService.checkGlobalLimit().remaining || 0;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return res.status(200).json(
    new ApiResponse(200, {
      dailyLimit: usage.limit,
      usedToday: usage.used,
      remaining: usage.remaining,
      globalDailyLimit: otpService.OTP_CONSTANTS.GLOBAL_DAILY_LIMIT,
      globalUsedToday: otpService.OTP_CONSTANTS.GLOBAL_DAILY_LIMIT - globalCount,
      globalRemaining: globalCount,
      resetAt: tomorrow.toISOString(),
    }, "OTP usage retrieved.")
  );
});

export { sendOtp, verifyOtp, resendOtp, getOtpUsage };