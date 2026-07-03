import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
  purpose: {
    type: String,
    required: true,
    enum: ["forgot-password", "change-password", "verify-email", "social-link"],
  },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0, max: 5 },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// One OTP per email+purpose at a time
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export const OTP = mongoose.model("OTP", otpSchema);