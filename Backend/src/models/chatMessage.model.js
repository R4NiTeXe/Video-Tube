import mongoose, { Schema } from "mongoose";

const chatMessageSchema = new Schema({
  stream: { type: Schema.Types.ObjectId, ref: "LiveStream", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ["message", "donation", "system"],
    default: "message",
  },
  donationAmount: { type: Number },
}, { timestamps: true });

chatMessageSchema.index({ stream: 1, createdAt: -1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
