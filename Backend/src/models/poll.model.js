import mongoose, { Schema } from "mongoose";

const optionSchema = new Schema({
  text: { type: String, required: true, trim: true },
  voters: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { _id: false });

const pollSchema = new Schema({
  question: { type: String, required: true, trim: true, maxlength: 300 },
  options: {
    type: [optionSchema],
    validate: {
      validator: (v) => v.length >= 2 && v.length <= 10,
      message: "A poll must have between 2 and 10 options",
    },
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  video: { type: Schema.Types.ObjectId, ref: "Video" },
  isActive: { type: Boolean, default: true },
  endsAt: { type: Date },
}, { timestamps: true });

pollSchema.index({ video: 1 });
pollSchema.index({ createdBy: 1 });

export const Poll = mongoose.model("Poll", pollSchema);
