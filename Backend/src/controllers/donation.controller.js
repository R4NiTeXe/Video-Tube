import mongoose from "mongoose";
import { Donation } from "../models/donation.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createDonation = asyncHandler(async (req, res) => {
  const { recipientId, videoId, amount, message, isAnonymous } = req.body;

  if (!mongoose.isValidObjectId(recipientId)) {
    throw new ApiError(400, "Invalid recipient id");
  }
  if (!amount || amount < 1) {
    throw new ApiError(400, "Amount must be at least 1");
  }
  if (recipientId === req.user._id.toString()) {
    throw new ApiError(400, "Cannot tip yourself");
  }

  const donation = await Donation.create({
    sender: req.user._id,
    recipient: recipientId,
    video: videoId || undefined,
    amount,
    message: message?.trim() || "",
    isAnonymous: Boolean(isAnonymous),
  });

  // Notify recipient
  try {
    const senderName = isAnonymous ? "Someone" : (req.user.fullName || req.user.username);
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: "mention",
      video: videoId || undefined,
      message: `${senderName} sent you a $${amount} tip!`,
    });
  } catch { /* notification failure should not block donation */ }

  return res.status(201).json(new ApiResponse(201, donation, "Donation created"));
});

const getDonationsForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [donations, total, totalAmount] = await Promise.all([
    Donation.find({ recipient: userId })
      .populate("sender", "fullName avatar username")
      .populate("video", "title thumbnail")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Donation.countDocuments({ recipient: userId }),
    Donation.aggregate([
      { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  // Anonymize if needed
  const anonymized = donations.map((d) => {
    if (d.isAnonymous) {
      return { ...d, sender: { fullName: "Anonymous", avatar: "", username: "" } };
    }
    return d;
  });

  return res.status(200).json(
    new ApiResponse(200, {
      docs: anonymized,
      totalDocs: total,
      totalAmount: totalAmount[0]?.total || 0,
      page: pageNumber,
      limit: limitNumber,
    }, "Donations fetched")
  );
});

const getDonationsByUser = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [donations, total] = await Promise.all([
    Donation.find({ sender: req.user._id })
      .populate("recipient", "fullName avatar username")
      .populate("video", "title thumbnail")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Donation.countDocuments({ sender: req.user._id }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { docs: donations, totalDocs: total, page: pageNumber }, "Your donations fetched")
  );
});

// Get donations for a specific stream (for gift overlay)
const getDonationsForStream = asyncHandler(async (req, res) => {
  const { streamId } = req.params;
  const { limit = 20 } = req.query;

  if (!mongoose.isValidObjectId(streamId)) {
    throw new ApiError(400, "Invalid stream ID");
  }

  const donations = await Donation.find({ video: streamId })
    .populate("sender", "fullName avatar username")
    .sort({ createdAt: -1 })
    .limit(Math.min(parseInt(limit, 10) || 20, 50))
    .lean();

  const anonymized = donations.map((d) => {
    if (d.isAnonymous) {
      return { ...d, sender: { fullName: "Anonymous", avatar: "", username: "" } };
    }
    return d;
  });

  return res.status(200).json(new ApiResponse(200, anonymized, "Stream donations fetched"));
});

export { createDonation, getDonationsForUser, getDonationsByUser, getDonationsForStream };
