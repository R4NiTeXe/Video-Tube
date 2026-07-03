import { Router } from "express";
import {
  getStreamChat,
  sendChatMessage,
  getUnreadCount,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/:streamId").get(getStreamChat);
router.route("/:streamId/send").post(sendChatMessage);
router.route("/:streamId/unread").get(getUnreadCount);

export default router;
