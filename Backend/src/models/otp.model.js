import mongoose from "mongoose";
import crypto from "crypto";

const otpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  identifier: { type: String, required: true, lowercase: true, index: true },
  otpHash: { type: String, required: true },
  purpose: {
    type: String,
    required: true,
    enum: [
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
    ],
  },
  channel: {
    type: String,
    required: true,
    enum: ["email", "whatsapp"],
    default: "email",
  },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0, max: 5 },
  maxAttempts: { type: Number, default: 5 },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  prevOtpHash: { type: String },
  prevOtpInvalidatedAt: { type: Date },
  dailyCount: { type: Number, default: 0 },
  dailyCountDate: { type: Date, default: () => new Date(new Date().setHours(0, 0, 0, 0)) },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, purpose: 1 }, { unique: true });
otpSchema.index({ user: 1, dailyCountDate: 1 });

otpSchema.statics.hashOtp = function (otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

otpSchema.statics.getStartOfDay = function () {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

otpSchema.methods.verifyOtp = function (otp) {
  const hash = this.constructor.hashOtp(otp);
  return this.otpHash === hash;
};

otpSchema.methods.invalidatePrevious = function () {
  this.prevOtpHash = this.otpHash;
  this.prevOtpInvalidatedAt = new Date();
};

export const OTP = mongoose.model("OTP", otpSchema);

OTP.init().then(async () => {
  try {
    const collection = OTP.collection;
    const indexes = await collection.indexes();
    const hasOldIndex = indexes.some((idx) => idx.name === "email_1_purpose_1");
    if (hasOldIndex) {
      await collection.dropIndex("email_1_purpose_1");
      console.log("[OTP Model] Dropped old index: email_1_purpose_1");
    }
  } catch (error) {
    // Ignore errors during index migration
  }
});