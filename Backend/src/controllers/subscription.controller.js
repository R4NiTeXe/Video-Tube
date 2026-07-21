import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { sendSSENotification } from "./sse.controller.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }

  const existingSub = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  }).select("_id").lean();

  let subscribed;

  if (existingSub) {
    await Subscription.findByIdAndDelete(existingSub._id);
    subscribed = false;
  } else {
    await Subscription.create({ subscriber: req.user._id, channel: channelId });
    subscribed = true;
  }

  const subscribersCount = await Subscription.countDocuments({ channel: channelId });

  if (subscribed) {
    try {
      if (channelId !== req.user._id.toString()) {
        const recipient = await User.findById(channelId).select("notificationPrefs mutedChannels").lean();
        const isMuted = recipient?.mutedChannels?.some((id) => id.toString() === req.user._id.toString());
        if (recipient?.notificationPrefs?.subscriptions !== false && !isMuted) {
          const notif = await Notification.create({
            recipient: channelId,
            sender: req.user._id,
            type: "subscribe",
            message: `${req.user.fullName || req.user.username} subscribed to your channel`,
          });
          sendSSENotification(channelId, notif);
        }
      }
    } catch (err) { logger.warn("Subscription notification failed", { error: err.message }); }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { subscribed, subscribersCount }, subscribed ? "Subscribed successfully" : "Unsubscribed successfully")
    );
});

// get list of subscribers for a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [{ data, metadata } = { data: [], metadata: [{ total: 0 }] }] = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limitNumber },
          {
            $lookup: {
              from: "users",
              localField: "subscriber",
              foreignField: "_id",
              as: "subscriber",
              pipeline: [
                {
                  $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribedToSubscriber",
                  },
                },
                {
                  $addFields: {
                    subscribedToSubscriber: {
                      $cond: {
                        if: {
                          $in: [channelId, "$subscribedToSubscriber.subscriber"],
                        },
                        then: true,
                        else: false,
                      },
                    },
                    subscribersCount: { $size: "$subscribedToSubscriber" },
                  },
                },
              ],
            },
          },
          {
            $unwind: "$subscriber",
          },
          {
            $project: {
              _id: 0,
              subscriber: {
                _id: 1,
                fullName: 1,
                username: 1,
                avatar: 1,
                subscribedToSubscriber: 1,
                subscribersCount: 1,
              },
            },
          },
        ],
      },
    },
  ]);

  const total = metadata[0]?.total || 0;
  const docs = data.map((d) => d.subscriber);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { docs, total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) }, "Subscribers fetched successfully")
    );
});

// get list of channels a user has subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  if (!mongoose.isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber id");
  }

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [{ data, metadata } = { data: [], metadata: [{ total: 0 }] }] = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limitNumber },
          {
            $lookup: {
              from: "users",
              localField: "channel",
              foreignField: "_id",
              as: "subscribedChannel",
              pipeline: [
                {
                  $lookup: {
                    from: "videos",
                    localField: "_id",
                    foreignField: "owner",
                    as: "videos",
                  },
                },
                {
                  $addFields: {
                    latestVideo: { $last: "$videos" },
                  },
                },
              ],
            },
          },
          {
            $unwind: "$subscribedChannel",
          },
          {
            $project: {
              _id: 0,
              subscribedChannel: {
                _id: 1,
                fullName: 1,
                username: 1,
                avatar: 1,
                latestVideo: {
                  _id: 1,
                  videoFile: 1,
                  thumbnail: 1,
                  title: 1,
                  description: 1,
                  duration: 1,
                  createdAt: 1,
                  views: 1,
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const total = metadata[0]?.total || 0;
  const docs = data.map((d) => d.subscribedChannel);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { docs, total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) },
        "Subscribed channels fetched successfully"
      )
    );
});

const getChannelNotificationStatus = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  const user = await User.findById(req.user._id).select("mutedChannels").lean();
  const isMuted = user?.mutedChannels?.some((id) => id.toString() === channelId);

  return res
    .status(200)
    .json(new ApiResponse(200, { isMuted: !!isMuted }, "Channel notification status fetched"));
});

const toggleChannelNotifications = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot mute notifications for your own channel");
  }

  const user = await User.findById(req.user._id).select("mutedChannels");
  const idx = user.mutedChannels.findIndex((id) => id.toString() === channelId);

  if (idx >= 0) {
    user.mutedChannels.splice(idx, 1);
  } else {
    user.mutedChannels.push(channelId);
  }

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isMuted: idx >= 0 ? false : true }, idx >= 0 ? "Notifications enabled" : "Notifications muted"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels, getChannelNotificationStatus, toggleChannelNotifications };
