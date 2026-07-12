import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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
      required: true,
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
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
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
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    mutedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    mutedChannels: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    watchLater: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    searchHistory: [
      {
        type: String,
      },
    ],
    passwordResetToken: {
      type: String,
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
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
    socialAccounts: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// using the pre function to encrypt the password
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// this method is used to compare the password
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
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
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
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);