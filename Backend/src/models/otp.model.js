import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
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
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// One OTP per identifier+purpose at a time
otpSchema.index({ identifier: 1, purpose: 1 }, { unique: true });

const OTP = mongoose.model("OTP", otpSchema);

// Drop old "email_1_purpose_1" index if it exists (migration from old schema)
OTP.init().then(async () => {
  try {
    const collection = OTP.collection;
    const indexes = await collection.indexes();
    const hasOldIndex = indexes.some(
      (idx) => idx.name === "email_1_purpose_1"
    );
    if (hasOldIndex) {
      await collection.dropIndex("email_1_purpose_1");
      console.log("[OTP Model] Dropped old index: email_1_purpose_1");
    }
  } catch (error) {
    // Ignore errors during index migration
  }
});

export { OTP };