import crypto from "crypto";
import { OTP } from "../models/otp.model.js";

// Generate 6-digit numeric OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP in database (expires in 10 minutes)
// identifier: email or mobile number
// channel: "email" | "whatsapp"
export const storeOTP = async (identifier, purpose, channel = "email") => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OTP.findOneAndUpdate(
    { identifier, purpose },
    { otp, purpose, channel, identifier, expiresAt, attempts: 0, verified: false },
    { upsert: true, new: true }
  );

  return otp;
};

// Verify OTP — atomic attempt increment to prevent race conditions
// identifier: email or mobile number
export const verifyOTP = async (identifier, otp, purpose) => {
  // First, atomically increment attempts and check if OTP is valid in one operation
  const record = await OTP.findOneAndUpdate(
    {
      identifier,
      purpose,
      verified: false,
      attempts: { $lt: 5 },
      expiresAt: { $gt: new Date() },
    },
    {
      $inc: { attempts: 1 },
    },
    { new: true }
  );

  if (!record) {
    // Check why it failed for a better error message
    const existing = await OTP.findOne({ identifier, purpose });
    if (!existing) return { valid: false, message: "OTP not found. Please request a new one." };
    if (existing.verified) return { valid: false, message: "OTP already used." };
    if (existing.attempts >= 5) return { valid: false, message: "Too many attempts. Request a new OTP." };
    if (new Date() > existing.expiresAt) return { valid: false, message: "OTP expired. Request a new one." };
    return { valid: false, message: "Invalid OTP." };
  }

  if (record.otp !== otp) return { valid: false, message: "Invalid OTP." };

  // Mark as verified atomically
  await OTP.findOneAndUpdate(
    { _id: record._id },
    { $set: { verified: true } }
  );

  return { valid: true, message: "OTP verified.", channel: record.channel };
};
