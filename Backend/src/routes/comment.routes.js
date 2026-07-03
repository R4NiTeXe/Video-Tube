import { Router } from "express";
import {
  addComment,
  addReply,
  deleteComment,
  getReplies,
  getVideoComments,
  pinComment,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { contentModerator } from "../middlewares/contentModeration.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").get(getVideoComments).post(contentModerator, addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);
router.route("/reply/:commentId").post(contentModerator, addReply);
router.route("/replies/:commentId").get(getReplies);
router.route("/pin/:commentId").patch(pinComment);

export default router;
