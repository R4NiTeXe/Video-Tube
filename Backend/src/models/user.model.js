import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
      lowercase: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    coverImagePublicId: {
      type: String,
    },
    channelBanner: {
      type: String,
    },
    channelBannerPublicId: {
      type: String,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    socialLinks: {
      youtube: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      github: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    socialAccounts: {
      type: Map,
      of: String,
      default: () => new Map(),
    },
    language: {
      type: String,
      default: "en",
      trim: true,
    },
    defaultVisibility: {
      type: String,
      enum: ["public", "unlisted", "private"],
      default: "public",
    },
    defaultCategory: {
      type: String,
      default: "General",
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    banned: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    notificationPrefs: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      replies: { type: Boolean, default: true },
      subscriptions: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    blockedUsers: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: "User",
      }],
      validate: {
        validator: (v) => !v || v.length <= 1000,
        message: "Blocked users list cannot exceed 1000 entries",
      },
    },
    mutedUsers: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: "User",
      }],
      validate: {
        validator: (v) => !v || v.length <= 1000,
        message: "Muted users list cannot exceed 1000 entries",
      },
    },
    mutedChannels: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: "User",
      }],
      validate: {
        validator: (v) => !v || v.length <= 1000,
        message: "Muted channels list cannot exceed 1000 entries",
      },
    },
    watchLater: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: "Video",
      }],
      validate: {
        validator: (v) => !v || v.length <= 200,
        message: "Watch later list cannot exceed 200 entries",
      },
    },
    searchHistory: {
      type: [String],
      validate: {
        validator: (v) => !v || v.length <= 50,
        message: "Search history cannot exceed 50 entries",
      },
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
    },
    otpDailyCount: {
      type: Number,
      default: 0,
    },
    otpDailyCountDate: {
      type: Date,
    },
    watchHistory: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: "Video",
      }],
      validate: {
        validator: (v) => !v || v.length <= 500,
        message: "Watch history cannot exceed 500 entries",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1 });
userSchema.index({ role: 1, banned: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ username: "text", fullName: "text" });
userSchema.index({ passwordResetToken: 1, passwordResetExpires: 1 });
userSchema.index({ emailVerificationToken: 1 });

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("emailVerificationToken") && this.emailVerificationToken) {
    this.emailVerificationToken = crypto.createHash("sha256").update(this.emailVerificationToken).digest("hex");
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d",
    }
  );
};

export const User = mongoose.model("User", userSchema);
