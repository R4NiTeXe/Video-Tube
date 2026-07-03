import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description, visibility } = req.body;

  if ([name, description].some((field) => !field?.trim())) {
    throw new ApiError(400, "Name and description are required");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user._id,
    visibility: ["public", "private", "unlisted"].includes(visibility) ? visibility : "public",
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $match: { isPublished: true },
          },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              views: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        // get the thumbnail of the first video to represent the playlist cover
        coverImage: { $first: "$videos.thumbnail" },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        totalVideos: 1,
        coverImage: 1,
        updatedAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $match: { isPublished: true },
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
          {
            $project: {
              title: 1,
              thumbnail: 1,
              videoFile: 1,
              views: 1,
              duration: 1,
              createdAt: 1,
              owner: 1,
            },
          },
        ],
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
        totalVideos: { $size: "$videos" },
      },
    },
  ]);

  if (!playlist?.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist id or video id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  // Avoid duplicates
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video is already in the playlist");
  }

  playlist.videos.push(videoId);
  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!mongoose.isValidObjectId(playlistId) || !mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlist id or video id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  playlist.videos = playlist.videos.filter(
    (id) => id.toString() !== videoId.toString()
  );

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description, visibility } = req.body;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }

  if (!name && !description && visibility === undefined) {
    throw new ApiError(400, "Name, description, or visibility is required");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  if (name) playlist.name = name.trim();
  if (description) playlist.description = description.trim();
  if (visibility && ["public", "private", "unlisted"].includes(visibility)) {
    playlist.visibility = visibility;
  }

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

const reorderPlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { videoIds } = req.body;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist id");
  }
  if (!Array.isArray(videoIds)) {
    throw new ApiError(400, "videoIds must be an array");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized");
  }

  // Validate all IDs are in the playlist
  const playlistVideoIds = playlist.videos.map((id) => id.toString());
  const reorderedIds = videoIds.filter((id) => playlistVideoIds.includes(id));

  // Add any videos that were in playlist but not in the new order at the end
  for (const id of playlistVideoIds) {
    if (!reorderedIds.includes(id)) {
      reorderedIds.push(id);
    }
  }

  playlist.videos = reorderedIds;
  await playlist.save();

  return res.status(200).json(new ApiResponse(200, playlist, "Playlist reordered"));
});

const getChannelPlaylists = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const user = await mongoose.model("User").findOne({ username: username.toLowerCase().trim() });
  if (!user) throw new ApiError(404, "Channel not found");

  const isOwner = user._id.toString() === req.user?._id?.toString();

  const matchStage = { owner: user._id };
  if (!isOwner) {
    matchStage.visibility = { $in: ["public", "unlisted"] };
  }

  const playlists = await Playlist.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [{ $project: { thumbnail: 1 } }],
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        coverImage: { $first: "$videos.thumbnail" },
      },
    },
    {
      $project: { name: 1, description: 1, totalVideos: 1, coverImage: 1, visibility: 1, updatedAt: 1 },
    },
    { $sort: { updatedAt: -1 } },
  ]);

  return res.status(200).json(new ApiResponse(200, playlists, "Channel playlists fetched"));
});

const getPublicPlaylists = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNumber = parseInt(page, 10) || 1;
  const limitNumber = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (pageNumber - 1) * limitNumber;

  const [playlists, total] = await Promise.all([
    Playlist.find({ visibility: "public" })
      .populate("owner", "fullName username avatar")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Playlist.countDocuments({ visibility: "public" }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { docs: playlists, totalDocs: total, page: pageNumber, limit: limitNumber }, "Public playlists fetched")
  );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
  reorderPlaylist,
  getChannelPlaylists,
  getPublicPlaylists,
};
