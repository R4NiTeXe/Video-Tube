import mongoose, { Schema } from "mongoose";

const donationSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "USD",
    },
    message: {
      type: String,
      default: "",
      maxlength: 500,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ recipient: 1, createdAt: -1 });
donationSchema.index({ sender: 1, createdAt: -1 });

export const Donation = mongoose.model("Donation", donationSchema);
