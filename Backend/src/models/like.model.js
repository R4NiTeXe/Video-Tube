import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
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

likeSchema.pre("validate", function () {
  const targetCount = [this.video, this.comment].filter(Boolean).length;
  if (targetCount !== 1) {
    throw new Error("Like must target exactly one resource");
  }
});

likeSchema.index({ video: 1, likedBy: 1 }, { unique: true });
likeSchema.index({ comment: 1, likedBy: 1 }, { unique: true });
likeSchema.index({ likedBy: 1 });

export const Like = mongoose.model("Like", likeSchema);
