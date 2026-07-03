import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(getNotifications);
router.route("/unread-count").get(getUnreadCount);
router.route("/read/:notificationId").patch(markAsRead);
router.route("/read-all").patch(markAllAsRead);
router.route("/:notificationId").delete(deleteNotification);

export default router;
