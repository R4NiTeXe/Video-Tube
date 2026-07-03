import { Router } from "express";
import {
  getChannelStats,
  getChannelVideos,
  getSubscriberGrowth,
  getVideoDetailedStats,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);
router.route("/subscriber-growth").get(getSubscriberGrowth);
router.route("/video/:videoId").get(getVideoDetailedStats);

export default router;
