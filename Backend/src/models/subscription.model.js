import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: function (v) { return this.subscriber?.toString() !== v?.toString(); },
        message: "Cannot subscribe to yourself",
      },
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });
subscriptionSchema.index({ channel: 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
