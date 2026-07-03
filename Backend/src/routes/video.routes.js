import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
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
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadLimiter } from "../middlewares/rateLimiter.middleware.js";
import { contentModerator } from "../middlewares/contentModeration.middleware.js";

const router = Router();

// public routes
router.route("/trending").get(verifyJWT, getTrendingVideos);
router.route("/categories").get(verifyJWT, getVideoCategories);
router.route("/scheduled/publish").post(verifyJWT, publishScheduledVideos);
router.route("/search/channels").get(verifyJWT, searchChannels);
router.route("/shorts/feed").get(verifyJWT, getShortsFeed);
router.route("/channel/:username/about").get(verifyJWT, getChannelAbout);

// all routes require authentication
router.use(verifyJWT);

router
  .route("/")
  .get(getAllVideos)
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
    contentModerator,
    publishAVideo
  );

router.route("/channel/:username").get(getChannelVideos);

router.route("/bulk/delete").post(bulkDeleteVideos);
router.route("/bulk/publish").post(bulkPublishVideos);

router
  .route("/:videoId")
  .get(getVideoById)
  .patch(upload.single("thumbnail"), updateVideo)
  .delete(deleteVideo);

router.route("/:videoId/tags").patch(updateVideoTags);
router.route("/:videoId/chapters").patch(updateVideoChapters);
router.route("/:videoId/related").get(getRelatedVideos);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
