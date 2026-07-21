import { Router } from "express";
import {
  getAllVideos,
  getVideoById,
  getChannelVideos,
  searchChannels,
  getTrendingVideos,
  getRelatedVideos,
  getVideoCategories,
  getShortsFeed,
  getChannelAbout,
  getTranscodingStatus,
} from "../controllers/video/query.controller.js";

import {
  publishAVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  updateVideoTags,
  updateVideoChapters,
  bulkDeleteVideos,
  bulkPublishVideos,
} from "../controllers/video/mutation.controller.js";

import {
  publishScheduledVideos,
  runPublishScheduledVideos,
  runUpdateTrendingScores,
} from "../controllers/video/cron.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload, validateFileSize } from "../middlewares/multer.middleware.js";
import { uploadLimiter, searchLimiter, viewLimiter } from "../middlewares/rateLimiter.middleware.js";
import { contentModerator } from "../middlewares/contentModeration.middleware.js";
import { validateBody, validateParams, validateQuery, validateAll } from "../middlewares/validation.middleware.js";
import { videoSchemas } from "../validators/index.js";

const router = Router();

// public routes
router.route("/trending").get(verifyJWT, validateQuery(videoSchemas.getTrendingVideos.query), getTrendingVideos);
router.route("/categories").get(verifyJWT, getVideoCategories);
router.route("/scheduled/publish").post(verifyJWT, publishScheduledVideos);
router.route("/search/channels").get(verifyJWT, searchLimiter, validateQuery(videoSchemas.searchChannels.query), searchChannels);
router.route("/shorts/feed").get(verifyJWT, validateQuery(videoSchemas.getShortsFeed.query), getShortsFeed);
router.route("/channel/:username/about").get(verifyJWT, validateParams(videoSchemas.getChannelAbout.params), getChannelAbout);

// all routes require authentication
router.use(verifyJWT);

router
  .route("/")
  .get(searchLimiter, validateQuery(videoSchemas.getAllVideos.query), getAllVideos)
  .post(
    uploadLimiter,
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    validateFileSize,
    contentModerator,
    validateBody(videoSchemas.publishVideo.body),
    publishAVideo
  );

router.route("/channel/:username").get(validateParams(videoSchemas.getChannelVideos.params), validateQuery(videoSchemas.getChannelVideos.query), getChannelVideos);

router.route("/bulk/delete").post(validateBody(videoSchemas.bulkDeleteVideos.body), bulkDeleteVideos);
router.route("/bulk/publish").post(validateBody(videoSchemas.bulkPublishVideos.body), bulkPublishVideos);

router
  .route("/:videoId")
  .get(viewLimiter, validateParams(videoSchemas.getVideoById.params), getVideoById)
  .patch(upload.single("thumbnail"), validateFileSize, validateBody(videoSchemas.updateVideo.body), updateVideo)
  .delete(validateParams(videoSchemas.deleteVideo.params), deleteVideo);

router.route("/:videoId/tags").patch(validateParams(videoSchemas.updateVideoTags.params), validateBody(videoSchemas.updateVideoTags.body), updateVideoTags);
router.route("/:videoId/chapters").patch(validateParams(videoSchemas.updateVideoChapters.params), validateBody(videoSchemas.updateVideoChapters.body), updateVideoChapters);
router.route("/:videoId/related").get(validateParams(videoSchemas.getRelatedVideos.params), validateQuery(videoSchemas.getRelatedVideos.query), getRelatedVideos);
router.route("/:videoId/transcoding").get(validateParams(videoSchemas.getTranscodingStatus.params), getTranscodingStatus);

router.route("/toggle/publish/:videoId").patch(validateParams(videoSchemas.togglePublishStatus.params), togglePublishStatus);

export default router;
