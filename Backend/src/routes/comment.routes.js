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
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.middleware.js";
import { commentSchemas } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").get(validateParams(commentSchemas.getVideoComments.params), validateQuery(commentSchemas.getVideoComments.query), getVideoComments).post(contentModerator, validateParams(commentSchemas.addComment.params), validateBody(commentSchemas.addComment.body), addComment);
router.route("/c/:commentId").delete(validateParams(commentSchemas.deleteComment.params), deleteComment).patch(validateParams(commentSchemas.updateComment.params), validateBody(commentSchemas.updateComment.body), updateComment);
router.route("/reply/:commentId").post(contentModerator, validateParams(commentSchemas.addReply.params), validateBody(commentSchemas.addReply.body), addReply);
router.route("/replies/:commentId").get(validateParams(commentSchemas.getReplies.params), validateQuery(commentSchemas.getReplies.query), getReplies);
router.route("/pin/:commentId").patch(validateParams(commentSchemas.pinComment.params), pinComment);

export default router;
