import { Router } from "express";
import {
  getChannelStats,
  getChannelVideos,
  getSubscriberGrowth,
  getVideoDetailedStats,
  getChannelAnalytics,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateQuery, validateParams } from "../middlewares/validation.middleware.js";
import { dashboardSchemas } from "../validators/index.js";

const router = Router();
router.use(verifyJWT);

router.route("/stats").get(getChannelStats);
router.route("/videos").get(validateQuery(dashboardSchemas.getChannelVideos.query), getChannelVideos);
router.route("/analytics").get(validateQuery(dashboardSchemas.getChannelAnalytics.query), getChannelAnalytics);
router.route("/subscriber-growth").get(validateQuery(dashboardSchemas.getSubscriberGrowth.query), getSubscriberGrowth);
router.route("/video/:videoId").get(validateParams(dashboardSchemas.getVideoDetailedStats.params), getVideoDetailedStats);

export default router;
