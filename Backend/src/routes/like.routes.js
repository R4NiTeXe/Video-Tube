import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateParams, validateQuery } from "../middlewares/validation.middleware.js";
import { likeSchemas } from "../validators/index.js";

const router = Router();
router.use(verifyJWT);

router.route("/toggle/v/:videoId").post(validateParams(likeSchemas.toggleVideoLike.params), toggleVideoLike);
router.route("/toggle/c/:commentId").post(validateParams(likeSchemas.toggleCommentLike.params), toggleCommentLike);
router.route("/videos").get(validateQuery(likeSchemas.getLikedVideos.query), getLikedVideos);

export default router;
