import { Router } from "express";
import {
  createCommunityPost,
  getAllCommunityPosts,
  getChannelPosts,
  updateCommunityPost,
  deleteCommunityPost,
  togglePostLike,
} from "../controllers/communityPost.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload, validateFileSize } from "../middlewares/multer.middleware.js";
import { contentModerator } from "../middlewares/contentModeration.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validation.middleware.js";
import { communityPostSchemas } from "../validators/index.js";

const router = Router();

router.route("/").get(validateQuery(communityPostSchemas.getAllCommunityPosts.query), getAllCommunityPosts);
router.route("/channel/:username").get(validateParams(communityPostSchemas.getChannelPosts.params), validateQuery(communityPostSchemas.getChannelPosts.query), getChannelPosts);

router.use(verifyJWT);

router.route("/").post(upload.fields([{ name: "image", maxCount: 1 }]), validateFileSize, contentModerator, validateBody(communityPostSchemas.createCommunityPost.body), createCommunityPost);
router.route("/:postId").patch(upload.fields([{ name: "image", maxCount: 1 }]), validateFileSize, contentModerator, validateParams(communityPostSchemas.updateCommunityPost.params), validateBody(communityPostSchemas.updateCommunityPost.body), updateCommunityPost).delete(validateParams(communityPostSchemas.deleteCommunityPost.params), deleteCommunityPost);
router.route("/:postId/like").post(validateParams(communityPostSchemas.togglePostLike.params), togglePostLike);

export default router;
