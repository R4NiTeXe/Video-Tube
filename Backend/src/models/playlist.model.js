import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videos: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public",
    },
  },
  {
    timestamps: true,
  }
);

playlistSchema.index({ owner: 1, visibility: 1, createdAt: -1 });
playlistSchema.index({ owner: 1 });
playlistSchema.index({ visibility: 1, createdAt: -1 });

export const Playlist = mongoose.model("Playlist", playlistSchema);
