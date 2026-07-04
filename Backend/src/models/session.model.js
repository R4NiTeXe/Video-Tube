import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    deviceName: {
      type: String,
      default: "Unknown Device",
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ refreshToken: 1 });

export const Session = mongoose.model("Session", sessionSchema);
