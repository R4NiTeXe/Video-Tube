import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateHlsManifest,
  generateVideoQualities,
  getPublicIdFromCloudinaryUrl,
} from "../utils/cloudinary.js";
import { escapeRegex } from "../utils/sanitizer.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
    category,
    tag,
  } = req.query;

  const pipeline = [];

  // search by title, description, or tags (escape regex to prevent ReDoS)
  if (query) {
    const safeQuery = escapeRegex(query);
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } },
          { tags: { $in: [new RegExp(safeQuery, "i")] } },
        ],
      },
    });
  }

  // filter by userId if provided
  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // filter by category
  if (category?.trim()) {
    pipeline.push({
      $match: {
        category: category.trim(),
      },
    });
  }

  // filter by tag
  if (tag?.trim()) {
    pipeline.push({
      $match: {
        tags: { $in: [new RegExp(escapeRegex(tag.trim()), "i")] },
      },
    });
  }

  // only show published videos (hide scheduled-for-future unpublished)
  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  // sort
  const sortStage = {};
  sortStage[sortBy] = sortType === "asc" ? 1 : -1;
  pipeline.push({ $sort: sortStage });

  // lookup owner details
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    }
  );

  // lookup likes count and isLiked
  pipeline.push(
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        likes: 0,
      },
    }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 10, 50),
  };

  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, tags, category, chapters, scheduledAt } = req.body;

  if (
    [title, description].some(
      (field) => typeof field !== "string" || !field.trim()
    )
  ) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Error while uploading video file");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Error while uploading thumbnail");
  }

  // Parse tags
  let parsedTags = [];
  if (tags) {
    if (typeof tags === "string") {
      parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
  }

  // Parse chapters
  let parsedChapters = [];
  if (chapters) {
    try {
      parsedChapters = typeof chapters === "string" ? JSON.parse(chapters) : chapters;
      if (!Array.isArray(parsedChapters)) parsedChapters = [];
      parsedChapters = parsedChapters.filter(
        (ch) => ch && ch.title && typeof ch.startTime === "number"
      );
    } catch {
      parsedChapters = [];
    }
  }

  // Validate scheduledAt
  let scheduledDate = null;
  if (scheduledAt) {
    scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new ApiError(400, "scheduledAt must be a valid future date");
    }
  }

  const video = await Video.create({
    title: title.trim(),
    description: description.trim(),
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
    owner: req.user._id,
    tags: parsedTags,
    category: category?.trim() || "General",
    chapters: parsedChapters,
    scheduledAt: scheduledDate,
    isPublished: !scheduledDate,
    transcodingStatus: "pending",
  });

  const createdVideo = await Video.findById(video._id);

  if (!createdVideo) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  // Trigger HLS transcoding in background
  const publicId = getPublicIdFromCloudinaryUrl(videoFile.url);
  if (publicId) {
    Video.findByIdAndUpdate(video._id, { transcodingStatus: "processing" }).then(() => {
      Promise.all([
        generateHlsManifest(publicId),
        generateVideoQualities(publicId),
      ]).then(([hlsUrl, qualities]) => {
        const updateData = { transcodingStatus: "completed" };
        if (hlsUrl) updateData.hlsUrl = hlsUrl;
        if (qualities?.length) updateData.qualities = qualities;
        Video.findByIdAndUpdate(video._id, { $set: updateData }).catch((err) => {
          console.error("Failed to update video with HLS data:", err);
        });
      }).catch((err) => {
        console.error("HLS generation failed:", err);
        Video.findByIdAndUpdate(video._id, { transcodingStatus: "failed" }).catch(() => {});
      });
    }).catch(() => {});
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        owner: { $first: "$owner" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        hlsUrl: 1,
        qualities: 1,
        transcodingStatus: 1,
        videoFile: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        isPublished: 1,
        tags: 1,
        category: 1,
        chapters: 1,
        thumbnail: 1,
        scheduledAt: 1,
      },
    },
  ]);

  if (!video?.length) {
    throw new ApiError(404, "Video not found");
  }

  const videoData = video[0];

  // If video is not published, only the owner can view it
  if (!videoData.isPublished && videoData.owner?._id?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "This video is private");
  }

  // increment views only if not the owner and not already watched
  const isOwner = videoData.owner?._id?.toString() === req.user?._id?.toString();
  if (!isOwner) {
    const user = await mongoose.model("User").findById(req.user?._id).select("watchHistory");
    const alreadyWatched = user?.watchHistory?.some(
      (id) => id.toString() === videoId.toString()
    );

    if (!alreadyWatched) {
      await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    }
  }

  // add to watch history
  await mongoose.model("User").findByIdAndUpdate(req.user?._id, {
    $addToSet: { watchHistory: videoId },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description, tags, category } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const updateFields = {};

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "Title cannot be empty");
    }
    updateFields.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      throw new ApiError(400, "Description cannot be empty");
    }
    updateFields.description = description.trim();
  }

  if (tags !== undefined) {
    if (typeof tags === "string") {
      updateFields.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      updateFields.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else {
      updateFields.tags = [];
    }
  }

  if (category !== undefined) {
    updateFields.category = typeof category === "string" ? category.trim() : "General";
  }

  // handle thumbnail update
  const thumbnailLocalPath = req.file?.path;

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail?.url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }

    // delete old thumbnail from cloudinary
    if (video.thumbnail) {
      await deleteFromCloudinary(video.thumbnail);
    }

    updateFields.thumbnail = thumbnail.url;
  }

  if (!Object.keys(updateFields).length) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { returnDocument: "after" }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  // delete video and thumbnail from cloudinary
  await deleteFromCloudinary(video.videoFile, "video");
  await deleteFromCloudinary(video.thumbnail, "image");

  await Video.findByIdAndDelete(videoId);

  // clean up related data (safe even if models are not yet registered)
  if (mongoose.modelNames().includes("Like")) {
    await mongoose.model("Like").deleteMany({ video: videoId });
  }
  if (mongoose.modelNames().includes("Comment")) {
    await mongoose.model("Comment").deleteMany({ video: videoId });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to toggle publish status of this video"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        "Publish status toggled successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const user = await mongoose.model("User").findOne({ username });

  if (!user) {
    throw new ApiError(404, "Channel not found");
  }

  const isOwner = user._id.toString() === req.user?._id?.toString();

  const sortField = ["createdAt", "views", "duration", "likesCount"].includes(sortBy) ? sortBy : "createdAt";
  const sortOrder = sortType === "asc" ? 1 : -1;

  const pipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user._id),
        ...(isOwner ? {} : { isPublished: true }),
      },
    },
    {
      $sort: { [sortField]: sortOrder },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
  ];

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 10, 50),
  };

  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

const searchChannels = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  if (!query?.trim()) {
    throw new ApiError(400, "Search query is required");
  }

  const searchRegex = new RegExp(escapeRegex(query.trim()), "i");

  const filter = {
    $or: [{ username: searchRegex }, { fullName: searchRegex }],
  };

  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 10, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [channels, totalCount] = await Promise.all([
    mongoose
      .model("User")
      .find(filter)
      .select("_id username fullName avatar isVerified")
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    mongoose.model("User").countDocuments(filter),
  ]);

  // Attach subscriber counts
  const channelIds = channels.map((c) => c._id);
  const subCounts = await mongoose
    .model("Subscription")
    .aggregate([
      { $match: { channel: { $in: channelIds } } },
      { $group: { _id: "$channel", count: { $sum: 1 } } },
    ]);

  const subMap = {};
  for (const s of subCounts) {
    subMap[s._id.toString()] = s.count;
  }

  const result = channels.map((c) => ({
    ...c,
    subscribersCount: subMap[c._id.toString()] || 0,
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { docs: result, totalDocs: totalCount, page: pageNumber, limit: limitNumber },
        "Channels fetched successfully"
      )
    );
});

const getTrendingVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category } = req.query;

  const matchStage = { isPublished: true };
  if (category?.trim()) {
    matchStage.category = category.trim();
  }

  const pipeline = [
    { $match: matchStage },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ["$views", 0.4] },
            { $multiply: ["$likesCount", 3] },
            {
              $multiply: [
                {
                  $divide: [
                    1,
                    {
                      $add: [
                        1,
                        {
                          $divide: [
                            { $subtract: [new Date(), "$createdAt"] },
                            86400000, // ms per day
                          ],
                        },
                      ],
                    },
                  ],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    { $sort: { trendingScore: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
    { $addFields: { owner: { $first: "$owner" } } },
    {
      $project: {
        videoFile: 1, title: 1, thumbnail: 1, views: 1, duration: 1,
        createdAt: 1, owner: 1, likesCount: 1, category: 1, tags: 1,
      },
    },
  ];

  const videoAggregate = Video.aggregate(pipeline);
  const options = { page: parseInt(page, 10) || 1, limit: Math.min(parseInt(limit, 10) || 20, 50) };
  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Trending videos fetched successfully"));
});

const getRelatedVideos = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { limit = 12 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const currentVideo = await Video.findById(videoId).select("title description tags category owner");
  if (!currentVideo) {
    throw new ApiError(404, "Video not found");
  }

  // Find related videos by tags, category, or same owner — exclude current
  const orConditions = [];
  if (currentVideo.tags?.length) {
    orConditions.push({ tags: { $in: currentVideo.tags } });
  }
  if (currentVideo.category) {
    orConditions.push({ category: currentVideo.category });
  }
  orConditions.push({ owner: currentVideo.owner });

  const relatedVideos = await Video.find({
    _id: { $ne: videoId },
    isPublished: true,
    $or: orConditions,
  })
    .select("title thumbnail views duration createdAt likesCount")
    .populate("owner", "fullName username avatar")
    .sort({ views: -1 })
    .limit(Math.min(parseInt(limit, 10) || 12, 30))
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, relatedVideos, "Related videos fetched successfully"));
});

const getVideoCategories = asyncHandler(async (req, res) => {
  const categories = await Video.distinct("category", { isPublished: true });
  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched successfully"));
});

const publishScheduledVideos = asyncHandler(async (req, res) => {
  const now = new Date();
  const result = await Video.updateMany(
    { isPublished: false, scheduledAt: { $lte: now, $ne: null } },
    { $set: { isPublished: true } }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, { publishedCount: result.modifiedCount }, "Scheduled videos published")
    );
});

const updateVideoTags = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { tags } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  let parsedTags = [];
  if (tags) {
    if (typeof tags === "string") {
      parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
  }

  video.tags = parsedTags;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Tags updated successfully"));
});

const updateVideoChapters = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { chapters } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  let parsedChapters = [];
  if (chapters) {
    try {
      parsedChapters = typeof chapters === "string" ? JSON.parse(chapters) : chapters;
      if (!Array.isArray(parsedChapters)) parsedChapters = [];
      parsedChapters = parsedChapters.filter(
        (ch) => ch && ch.title && typeof ch.startTime === "number"
      );
    } catch {
      parsedChapters = [];
    }
  }

  video.chapters = parsedChapters;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Chapters updated successfully"));
});

const bulkDeleteVideos = asyncHandler(async (req, res) => {
  const { videoIds } = req.body;

  if (!Array.isArray(videoIds) || !videoIds.length) {
    throw new ApiError(400, "videoIds array is required");
  }

  const validIds = videoIds.filter((id) => mongoose.isValidObjectId(id));
  if (!validIds.length) {
    throw new ApiError(400, "No valid video ids provided");
  }

  const videos = await Video.find({
    _id: { $in: validIds },
    owner: req.user._id,
  }).select("videoFile thumbnail");

  for (const video of videos) {
    if (video.videoFile) await deleteFromCloudinary(video.videoFile);
    if (video.thumbnail) await deleteFromCloudinary(video.thumbnail);
  }

  await Video.deleteMany({ _id: { $in: validIds }, owner: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, { deletedCount: videos.length }, "Videos deleted successfully"));
});

const bulkPublishVideos = asyncHandler(async (req, res) => {
  const { videoIds, isPublished } = req.body;

  if (!Array.isArray(videoIds) || !videoIds.length) {
    throw new ApiError(400, "videoIds array is required");
  }
  if (typeof isPublished !== "boolean") {
    throw new ApiError(400, "isPublished boolean is required");
  }

  const validIds = videoIds.filter((id) => mongoose.isValidObjectId(id));

  const result = await Video.updateMany(
    { _id: { $in: validIds }, owner: req.user._id },
    { $set: { isPublished } }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        `Videos ${isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

const getShortsFeed = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const pipeline = [
    {
      $match: {
        isPublished: true,
        duration: { $lte: 60 },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1, title: 1, thumbnail: 1, views: 1, duration: 1,
        createdAt: 1, owner: 1, likesCount: 1, isLiked: 1,
      },
    },
  ];

  const videoAggregate = Video.aggregate(pipeline);
  const options = { page: parseInt(page, 10) || 1, limit: Math.min(parseInt(limit, 10) || 20, 50) };
  const videos = await Video.aggregatePaginate(videoAggregate, options);

  return res.status(200).json(new ApiResponse(200, videos, "Shorts feed fetched"));
});

const getChannelAbout = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const profiles = await mongoose.model("User").aggregate([
    { $match: { username: username.toLowerCase().trim() } },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
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
        subscriberCount: { $size: "$subscribers" },
        videoCount: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
        joinDate: "$createdAt",
      },
    },
    {
      $project: {
        fullName: 1, username: 1, avatar: 1, coverImage: 1,
        bio: 1, socialLinks: 1, isVerified: 1,
        subscriberCount: 1, videoCount: 1, totalViews: 1, joinDate: 1,
      },
    },
  ]);

  if (!profiles?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res.status(200).json(new ApiResponse(200, profiles[0], "Channel about fetched"));
});

const getTranscodingStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId)
    .select("transcodingStatus hlsUrl qualities")
    .lean();

  if (!video) throw new ApiError(404, "Video not found");

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Transcoding status fetched"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getChannelVideos,
  searchChannels,
  getTrendingVideos,
  getRelatedVideos,
  getVideoCategories,
  publishScheduledVideos,
  updateVideoTags,
  updateVideoChapters,
  bulkDeleteVideos,
  bulkPublishVideos,
  getShortsFeed,
  getChannelAbout,
  getTranscodingStatus,
};
