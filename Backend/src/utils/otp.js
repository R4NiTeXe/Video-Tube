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

// Verify OTP
// identifier: email or mobile number
export const verifyOTP = async (identifier, otp, purpose) => {
  const record = await OTP.findOne({ identifier, purpose });

  if (!record) return { valid: false, message: "OTP not found. Please request a new one." };
  if (record.verified) return { valid: false, message: "OTP already used." };
  if (record.attempts >= 5) return { valid: false, message: "Too many attempts. Request a new OTP." };
  if (new Date() > record.expiresAt) return { valid: false, message: "OTP expired. Request a new one." };

  // Increment attempts
  record.attempts += 1;
  await record.save();

  if (record.otp !== otp) return { valid: false, message: "Invalid OTP." };

  // Mark as verified
  record.verified = true;
  await record.save();

  return { valid: true, message: "OTP verified.", channel: record.channel };
};
