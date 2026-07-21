import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Video } from "../../models/video.model.js";
import mongoose from "mongoose";
import logger from "../../utils/logger.js";

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
      ]
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
    .json(new ApiResponse(200, { publishedCount }, "Scheduled videos published"));
});

export {
  runPublishScheduledVideos,
  runUpdateTrendingScores,
  publishScheduledVideos,
};