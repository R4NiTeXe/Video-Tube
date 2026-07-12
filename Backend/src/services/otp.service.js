import crypto from "crypto";
import { OTP } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { sendEmail } from "../utils/email.js";
import logger from "../utils/logger.js";

export const OTP_CONSTANTS = {
  GLOBAL_DAILY_LIMIT: 300,
  USER_DAILY_LIMIT: 10,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
};

const OTP_PURPOSES = [
  "registration",
  "forgot-password",
  "change-password",
  "verify-email",
  "social-link",
  "login",
  "email-registration",
  "delete-account",
  "forgot-password-change",
  "reset",
];

const OTP_CHANNELS = ["email", "whatsapp"];

let globalDailyCount = 0;
let globalDailyCountDate = null;

const resetGlobalDailyCountIfNeeded = () => {
  const today = OTP.getStartOfDay();
  if (!globalDailyCountDate || globalDailyCountDate.getTime() !== today.getTime()) {
    globalDailyCount = 0;
    globalDailyCountDate = today;
  }
};

const incrementGlobalDailyCount = () => {
  resetGlobalDailyCountIfNeeded();
  globalDailyCount++;
};

const getGlobalDailyCount = () => {
  resetGlobalDailyCountIfNeeded();
  return globalDailyCount;
};

const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashOtp = (otp) => {
  return OTP.hashOtp(otp);
};

const checkGlobalLimit = () => {
  const current = getGlobalDailyCount();
  if (current >= OTP_CONSTANTS.GLOBAL_DAILY_LIMIT) {
    return { allowed: false, message: "Global daily OTP limit reached. Please try again tomorrow." };
  }
  return { allowed: true, remaining: OTP_CONSTANTS.GLOBAL_DAILY_LIMIT - current };
};

const checkUserLimit = async (userId) => {
  const user = await User.findById(userId).select("otpDailyCount otpDailyCountDate");
  if (!user) return { allowed: false, message: "User not found." };

  const today = OTP.getStartOfDay();
  const userDate = user.otpDailyCountDate ? new Date(user.otpDailyCountDate) : null;
  const currentCount = (userDate && userDate.getTime() === today.getTime()) ? (user.otpDailyCount || 0) : 0;

  if (currentCount >= OTP_CONSTANTS.USER_DAILY_LIMIT) {
    return {
      allowed: false,
      message: `Daily OTP limit reached. You have used all ${OTP_CONSTANTS.USER_DAILY_LIMIT} OTP requests for today. Please try again tomorrow.`,
      used: currentCount,
      limit: OTP_CONSTANTS.USER_DAILY_LIMIT,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    used: currentCount,
    limit: OTP_CONSTANTS.USER_DAILY_LIMIT,
    remaining: OTP_CONSTANTS.USER_DAILY_LIMIT - currentCount,
  };
};

const incrementUserDailyCount = async (userId) => {
  const today = OTP.getStartOfDay();
  await User.findByIdAndUpdate(userId, {
    $inc: { otpDailyCount: 1 },
    $set: { otpDailyCountDate: today },
  });
};

const getUserOtpUsage = async (userId) => {
  const user = await User.findById(userId).select("otpDailyCount otpDailyCountDate");
  if (!user) return { used: 0, limit: OTP_CONSTANTS.USER_DAILY_LIMIT, remaining: OTP_CONSTANTS.USER_DAILY_LIMIT };

  const today = OTP.getStartOfDay();
  const userDate = user.otpDailyCountDate ? new Date(user.otpDailyCountDate) : null;
  const used = (userDate && userDate.getTime() === today.getTime()) ? (user.otpDailyCount || 0) : 0;

  return {
    used,
    limit: OTP_CONSTANTS.USER_DAILY_LIMIT,
    remaining: Math.max(0, OTP_CONSTANTS.USER_DAILY_LIMIT - used),
  };
};

const storeOtp = async ({ identifier, userId, purpose, channel = "email" }) => {
  if (!OTP_PURPOSES.includes(purpose)) {
    throw new Error(`Invalid OTP purpose: ${purpose}`);
  }
  if (!OTP_CHANNELS.includes(channel)) {
    throw new Error(`Invalid OTP channel: ${channel}`);
  }

  const globalCheck = checkGlobalLimit();
  if (!globalCheck.allowed) {
    throw new Error(globalCheck.message);
  }

  let userLimitCheck = { allowed: true, remaining: OTP_CONSTANTS.USER_DAILY_LIMIT };
  if (userId) {
    userLimitCheck = await checkUserLimit(userId);
    if (!userLimitCheck.allowed) {
      throw new Error(userLimitCheck.message);
    }
  }

  const existing = await OTP.findOne({ identifier, purpose });
  const prevOtpHash = existing?.otpHash;
  if (existing) {
    await existing.deleteOne();
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000);

  const otpDoc = await OTP.create({
    user: userId,
    identifier,
    otpHash,
    purpose,
    channel,
    expiresAt,
    attempts: 0,
    maxAttempts: OTP_CONSTANTS.MAX_ATTEMPTS,
    verified: false,
    prevOtpHash,
    prevOtpInvalidatedAt: prevOtpHash ? new Date() : null,
    dailyCount: 0,
    dailyCountDate: OTP.getStartOfDay(),
  });

  incrementGlobalDailyCount();
  if (userId) {
    await incrementUserDailyCount(userId);
  }

  logger.info(`OTP generated`, {
    identifier: identifier.replace(/(.{2}).+(@.+)/, "$1***$2"),
    purpose,
    channel,
    userId,
    globalCount: getGlobalDailyCount(),
    userCount: userLimitCheck.used + 1,
  });

  return { otp, otpDoc, remainingGlobal: globalCheck.remaining - 1, remainingUser: userLimitCheck.remaining - 1 };
};

const sendOtpEmail = async ({ identifier, otp, purpose, userName }) => {
  const html = getOtpEmailTemplate({ otp, purpose, userName });
  await sendEmail({
    to: identifier,
    subject: getOtpSubject(purpose),
    html,
  });
};

const getOtpSubject = (purpose) => {
  const subjects = {
    registration: "Welcome to VideoTube — Verify Your Account",
    "forgot-password": "VideoTube — Reset Your Password",
    "change-password": "VideoTube — Verify Password Change",
    "verify-email": "VideoTube — Verify Your Email Address",
    "social-link": "VideoTube — Link Your Social Account",
    login: "VideoTube — Sign-In Verification Code",
    "email-registration": "VideoTube — Complete Your Registration",
    "delete-account": "VideoTube — Confirm Account Deletion",
    "forgot-password-change": "VideoTube — Reset Your Password",
    reset: "VideoTube — Your Verification Code",
  };
  return subjects[purpose] || "VideoTube — Your Verification Code";
};

const getOtpEmailTemplate = ({ otp, purpose, userName }) => {
  const purposeLabels = {
    registration: "Account Registration",
    "forgot-password": "Password Reset",
    "change-password": "Password Change Verification",
    "verify-email": "Email Verification",
    "social-link": "Social Account Linking",
    login: "Sign-In Verification",
    "email-registration": "Email Registration",
    "delete-account": "Account Deletion Confirmation",
    "forgot-password-change": "Password Reset",
    reset: "Verification",
  };

  const label = purposeLabels[purpose] || "Verification";
  const expiryMinutes = OTP_CONSTANTS.OTP_EXPIRY_MINUTES;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${label} — VideoTube</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 12px; display: inline-block; padding: 12px 20px;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Video<span style="color: #fecaca;">Tube</span></span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827; text-align: center;">${label}</h1>
              <p style="margin: 0 0 24px; font-size: 16px; color: #4b5563; text-align: center; line-height: 1.6;">
                ${userName ? `Hi ${userName},` : "Hello,"}
              </p>
              <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                Use the verification code below to complete your ${label.toLowerCase()}. This code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fecaca; border-radius: 12px;">
                      <tr>
                        <td style="padding: 24px 40px; text-align: center;">
                          <div style="font-size: 11px; font-weight: 600; color: #dc2626; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your Verification Code</div>
                          <div style="font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace; font-size: 36px; font-weight: 800; color: #dc2626; letter-spacing: 8px; line-height: 1.2;">
                            ${otp.match(/.{1,3}/g).join("&nbsp;&nbsp;")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 28px 0 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
                If you didn't request this, you can safely ignore this email. Your account security is important to us.
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="background: #fef2f2; border-top: 1px solid #fecaca; padding: 20px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width: 24px; vertical-align: top;">
                    <span style="font-size: 16px;">⚠</span>
                  </td>
                  <td style="font-size: 12px; color: #991b1b; line-height: 1.6;">
                    <strong>Security Notice:</strong> Never share this code with anyone. VideoTube will never ask for your verification code via phone, email, or social media. If someone requests this code, it's a scam.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply.</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} VideoTube. All rights reserved.</p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Need help? Contact our support team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const verifyOtp = async ({ identifier, otp, purpose }) => {
  const otpHash = hashOtp(otp);

  const record = await OTP.findOneAndUpdate(
    {
      identifier,
      purpose,
      verified: false,
      attempts: { $lt: OTP_CONSTANTS.MAX_ATTEMPTS },
      expiresAt: { $gt: new Date() },
    },
    { $inc: { attempts: 1 } },
    { new: true }
  );

  if (!record) {
    const existing = await OTP.findOne({ identifier, purpose });
    if (!existing) {
      logger.warn("OTP verification failed: not found", { identifier, purpose });
      return { valid: false, message: "OTP not found. Please request a new one." };
    }
    if (existing.verified) {
      return { valid: false, message: "OTP already used." };
    }
    if (existing.attempts >= OTP_CONSTANTS.MAX_ATTEMPTS) {
      return { valid: false, message: "Too many attempts. Request a new OTP." };
    }
    if (new Date() > existing.expiresAt) {
      return { valid: false, message: "OTP expired. Request a new one." };
    }
    return { valid: false, message: "Invalid OTP." };
  }

  if (record.otpHash !== otpHash) {
    logger.warn("OTP verification failed: invalid code", { identifier, purpose, attempts: record.attempts });
    return { valid: false, message: "Invalid OTP.", attemptsRemaining: OTP_CONSTANTS.MAX_ATTEMPTS - record.attempts };
  }

  await OTP.findOneAndUpdate(
    { _id: record._id },
    { $set: { verified: true, verifiedAt: new Date() } }
  );

  logger.info("OTP verified successfully", { identifier, purpose, userId: record.user });

  return { valid: true, message: "OTP verified.", channel: record.channel, userId: record.user };
};

const cleanupExpiredOtps = async () => {
  const result = await OTP.deleteMany({ expiresAt: { $lt: new Date() } });
  logger.info(`Cleaned up ${result.deletedCount} expired OTPs`);
  return result.deletedCount;
};

export const otpService = {
  generateOtp,
  hashOtp,
  storeOtp,
  sendOtpEmail,
  verifyOtp,
  checkGlobalLimit,
  checkUserLimit,
  getUserOtpUsage,
  incrementUserDailyCount,
  cleanupExpiredOtps,
  OTP_CONSTANTS,
};