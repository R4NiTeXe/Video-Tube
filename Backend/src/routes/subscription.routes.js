import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
  getChannelNotificationStatus,
  toggleChannelNotifications,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateParams, validateQuery } from "../middlewares/validation.middleware.js";
import { subscriptionSchemas } from "../validators/index.js";

const router = Router();

// all routes require authentication
router.use(verifyJWT);

router
  .route("/c/:channelId")
  .get(validateParams(subscriptionSchemas.getUserChannelSubscribers.params), validateQuery(subscriptionSchemas.getUserChannelSubscribers.query), getUserChannelSubscribers)
  .post(validateParams(subscriptionSchemas.toggleSubscription.params), toggleSubscription);

router
  .route("/c/:channelId/notifications")
  .get(validateParams(subscriptionSchemas.getChannelNotificationStatus.params), getChannelNotificationStatus)
  .patch(validateParams(subscriptionSchemas.toggleChannelNotifications.params), toggleChannelNotifications);

router.route("/u/:subscriberId").get(validateParams(subscriptionSchemas.getSubscribedChannels.params), validateQuery(subscriptionSchemas.getSubscribedChannels.query), getSubscribedChannels);

export default router;
