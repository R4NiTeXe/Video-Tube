import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Video } from "../../models/video.model.js";
import {
  generateHlsManifest,
  generateVideoQualities,
  getPublicIdFromCloudinaryUrl,
} from "../../utils/cloudinary.js";
import { acquireLock, isRedisAvailable } from "../../utils/redis.js";
import logger from "../../utils/logger.js";

const TRANSCODE_MAX_ATTEMPTS = 3;
const TRANSCODE_BATCH_SIZE = 20;
const TRANSCODE_LOCK_TTL_SECONDS = 90;
const TRANSCODE_STALE_PROCESSING_MINUTES = 5;
const TRANSCODE_STALE_PENDING_MINUTES = 10;

const runPublishScheduledVideos = async () => {
  try {
    const now = new Date();
    const result = await Video.updateMany(
      { isPublished: false, scheduledAt: { $lte: now, $ne: null } },
      { $set: { isPublished: true } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Published ${result.modifiedCount} scheduled videos`);
    }
    return result.modifiedCount;
  } catch (err) {
    logger.error("Publish scheduled videos failed", { error: err.message });
    return 0;
  }
};

const runUpdateTrendingScores = async () => {
  try {
    const now = new Date();
    const result = await Video.updateMany(
      { isPublished: true },
      [
        {
          $set: {
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
                                { $subtract: [now, "$createdAt"] },
                                86400000,
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
      ],
      { updatePipeline: true }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Updated trending scores for ${result.modifiedCount} videos`);
    }
    return result.modifiedCount;
  } catch (err) {
    logger.error("Update trending scores failed", { error: err.message });
    return 0;
  }
};

const publishScheduledVideos = asyncHandler(async (req, res) => {
  const publishedCount = await runPublishScheduledVideos();
  return res
    .status(200)
    .json(
      new ApiResponse(200, { publishedCount }, "Scheduled videos published")
    );
});

const runReconcileTranscoding = async () => {
  const now = new Date();
  const staleProcessingCutoff = new Date(
    now.getTime() - TRANSCODE_STALE_PROCESSING_MINUTES * 60 * 1000
  );
  const stalePendingCutoff = new Date(
    now.getTime() - TRANSCODE_STALE_PENDING_MINUTES * 60 * 1000
  );

  try {
    const candidates = await Video.find({
      $or: [
        {
          transcodingStatus: "processing",
          updatedAt: { $lt: staleProcessingCutoff },
          transcodingAttempts: { $lt: TRANSCODE_MAX_ATTEMPTS },
        },
        {
          transcodingStatus: "pending",
          createdAt: { $lt: stalePendingCutoff },
          transcodingAttempts: { $lt: TRANSCODE_MAX_ATTEMPTS },
        },
        {
          transcodingStatus: "failed",
          transcodingAttempts: { $lt: TRANSCODE_MAX_ATTEMPTS },
          transcodingLastAttemptAt: { $lt: staleProcessingCutoff },
        },
      ],
    })
      .sort({ updatedAt: 1 })
      .limit(TRANSCODE_BATCH_SIZE)
      .select(
        "_id cloudinaryPublicId videoFile transcodingStatus transcodingAttempts"
      )
      .lean();

    if (!candidates.length) return 0;

    let recovered = 0;
    let markedFailed = 0;

    for (const doc of candidates) {
      const lockKey = `transcoding:${doc._id.toString()}`;
      let release = null;
      const redisAvailable = isRedisAvailable();
      if (redisAvailable) {
        release = await acquireLock(lockKey, TRANSCODE_LOCK_TTL_SECONDS);
        if (!release) {
          continue;
        }
      }
      try {
        // Re-fetch with lock to ensure still needs recovery
        const video = await Video.findOne({
          _id: doc._id,
          transcodingStatus: { $ne: "completed" },
          transcodingAttempts: { $lt: TRANSCODE_MAX_ATTEMPTS },
        });
        if (!video) {
          continue;
        }

        // Permanent failure if max attempts reached (should not be in candidates, but guard)
        if (video.transcodingAttempts >= TRANSCODE_MAX_ATTEMPTS) {
          await Video.findOneAndUpdate(
            { _id: video._id, transcodingStatus: { $ne: "completed" } },
            {
              $set: {
                transcodingStatus: "failed",
                transcodingLastAttemptAt: new Date(),
                transcodingError: "Max transcoding attempts reached",
              },
            }
          );
          markedFailed++;
          continue;
        }

        let publicId = video.cloudinaryPublicId;
        if (!publicId && video.videoFile) {
          publicId = getPublicIdFromCloudinaryUrl(video.videoFile);
        }
        if (!publicId) {
          await Video.findOneAndUpdate(
            { _id: video._id, transcodingStatus: { $ne: "completed" } },
            {
              $set: {
                transcodingStatus: "failed",
                transcodingLastAttemptAt: new Date(),
                transcodingError: "Unable to determine Cloudinary public_id",
              },
              $inc: { transcodingAttempts: 1 },
            }
          );
          markedFailed++;
          continue;
        }

        // Mark processing and increment attempts atomically
        await Video.findOneAndUpdate(
          { _id: video._id, transcodingStatus: { $ne: "completed" } },
          {
            $set: {
              transcodingStatus: "processing",
              transcodingLastAttemptAt: new Date(),
              cloudinaryPublicId: publicId,
              transcodingError: null,
            },
            $inc: { transcodingAttempts: 1 },
          }
        );

        try {
          const [hlsUrl, qualities] = await Promise.all([
            generateHlsManifest(publicId),
            generateVideoQualities(publicId),
          ]);
          const updateData = {
            transcodingStatus: "completed",
            transcodingLastAttemptAt: new Date(),
            transcodingError: null,
          };
          if (hlsUrl) updateData.hlsUrl = hlsUrl;
          if (qualities?.length) updateData.qualities = qualities;
          await Video.findOneAndUpdate(
            { _id: video._id, transcodingStatus: { $ne: "completed" } },
            { $set: updateData }
          );
          recovered++;
        } catch (hlsErr) {
          const attemptsAfter = (video.transcodingAttempts || 0) + 1;
          const isFinal = attemptsAfter >= TRANSCODE_MAX_ATTEMPTS;
          await Video.findOneAndUpdate(
            { _id: video._id, transcodingStatus: { $ne: "completed" } },
            {
              $set: {
                transcodingStatus: isFinal ? "failed" : "failed",
                transcodingLastAttemptAt: new Date(),
                transcodingError: hlsErr.message?.slice(0, 500) || "HLS generation failed",
              },
            }
          );
          if (isFinal) markedFailed++;
        }
      } catch (err) {
        logger.warn("Transcoding reconciliation failed for video", {
          videoId: doc._id.toString(),
          error: err.message,
        });
      } finally {
        if (release) {
          try {
            await release();
          } catch {
            // ignore
          }
        }
      }
    }

    if (recovered > 0 || markedFailed > 0) {
      logger.info("Transcoding reconciliation completed", {
        candidates: candidates.length,
        recovered,
        markedFailed,
      });
    }
    return recovered;
  } catch (err) {
    logger.error("Transcoding reconciliation cron failed", { error: err.message });
    return 0;
  }
};

export {
  runPublishScheduledVideos,
  runUpdateTrendingScores,
  runReconcileTranscoding,
  publishScheduledVideos,
};
