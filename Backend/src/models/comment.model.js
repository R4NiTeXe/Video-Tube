import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "CommunityPost",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.pre("validate", function () {
  const targetCount = [this.video, this.post].filter(Boolean).length;
  if (targetCount !== 1) {
    throw new Error("Comment must target exactly one resource (video or post)");
  }
});

commentSchema.index({ video: 1, createdAt: -1 });
commentSchema.index({ owner: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ video: 1, parentComment: 1, createdAt: -1 });
commentSchema.index({ post: 1, createdAt: -1 });

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
