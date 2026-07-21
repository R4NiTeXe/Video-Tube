import mongoose, { Schema } from "mongoose";

const communityPostSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    image: {
      type: String,
    },
    imagePublicId: {
      type: String,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    poll: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

communityPostSchema.index({ owner: 1, createdAt: -1 });

export const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);
