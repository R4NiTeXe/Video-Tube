import mongoose from "mongoose";

const endScreenSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    elements: [
      {
        type: {
          type: String,
          enum: ["video", "playlist", "subscribe"],
          required: true,
        },
        videoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Video",
        },
        playlistId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Playlist",
        },
        startTime: {
          type: Number,
          required: true,
        },
        position: {
          type: String,
          enum: ["top-left", "top-right", "bottom-left", "bottom-right"],
          default: "bottom-right",
        },
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

endScreenSchema.index({ video: 1 });

export const EndScreen = mongoose.model("EndScreen", endScreenSchema);
