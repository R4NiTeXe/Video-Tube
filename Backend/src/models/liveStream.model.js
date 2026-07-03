import mongoose, { Schema } from "mongoose";

const liveStreamSchema = new Schema(
  {
    streamer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
    },
    streamKey: {
      type: String,
      required: true,
      unique: true,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    totalViewers: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    category: {
      type: String,
      default: "Just Chatting",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

liveStreamSchema.index({ isLive: 1 });
liveStreamSchema.index({ streamer: 1 });

export const LiveStream = mongoose.model("LiveStream", liveStreamSchema);
