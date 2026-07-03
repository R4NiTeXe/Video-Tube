import mongoose, { Schema } from "mongoose";

const captionSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    language: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
    },
    captionsFile: {
      type: String,
      required: true,
    },
    captionsFilePublicId: {
      type: String,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

captionSchema.index({ video: 1, language: 1 }, { unique: true });

export const Caption = mongoose.model("Caption", captionSchema);
