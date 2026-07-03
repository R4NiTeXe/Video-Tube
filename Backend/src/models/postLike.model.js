import mongoose, { Schema } from "mongoose";

const postLikeSchema = new Schema(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "CommunityPost",
      required: true,
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

postLikeSchema.index({ post: 1, likedBy: 1 }, { unique: true });

export const PostLike = mongoose.model("PostLike", postLikeSchema);
