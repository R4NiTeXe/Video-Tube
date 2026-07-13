import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      enum: ["video", "comment", "user"],
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      refPath: "targetType",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ targetType: 1, target: 1 });

export const Report = mongoose.model("Report", reportSchema);
