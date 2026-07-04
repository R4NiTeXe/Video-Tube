import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
  getChannelNotificationStatus,
  toggleChannelNotifications,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// all routes require authentication
router.use(verifyJWT);

router
  .route("/c/:channelId")
  .get(getUserChannelSubscribers)
  .post(toggleSubscription);

router
  .route("/c/:channelId/notifications")
  .get(getChannelNotificationStatus)
  .patch(toggleChannelNotifications);

router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
