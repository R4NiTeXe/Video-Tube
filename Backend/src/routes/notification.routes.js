import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateParams, validateQuery } from "../middlewares/validation.middleware.js";
import { notificationSchemas } from "../validators/index.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(validateQuery(notificationSchemas.getNotifications.query), getNotifications);
router.route("/unread-count").get(getUnreadCount);
router.route("/read/:notificationId").patch(validateParams(notificationSchemas.markAsRead.params), markAsRead);
router.route("/read-all").patch(markAllAsRead);
router.route("/:notificationId").delete(validateParams(notificationSchemas.deleteNotification.params), deleteNotification);

export default router;
