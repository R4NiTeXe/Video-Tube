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
import { upload } from "../middlewares/multer.middleware.js";
import { contentModerator } from "../middlewares/contentModeration.middleware.js";

const router = Router();

router.route("/").get(getAllCommunityPosts);
router.route("/channel/:username").get(getChannelPosts);

router.use(verifyJWT);

router.route("/").post(upload.fields([{ name: "image", maxCount: 1 }]), contentModerator, createCommunityPost);
router.route("/:postId").patch(upload.fields([{ name: "image", maxCount: 1 }]), contentModerator, updateCommunityPost).delete(deleteCommunityPost);
router.route("/:postId/like").post(togglePostLike);

export default router;
