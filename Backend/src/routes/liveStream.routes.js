import { Router } from "express";
import {
  createStream,
  goLive,
  endStream,
  getActiveStreams,
  getStreamById,
  incrementViewerCount,
  decrementViewerCount,
  getUserStream,
} from "../controllers/liveStream.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/active").get(verifyJWT, getActiveStreams);
router.route("/my-stream").get(verifyJWT, getUserStream);
router.route("/:streamId").get(verifyJWT, getStreamById);
router.route("/").post(verifyJWT, createStream);
router.route("/:streamId/go-live").post(verifyJWT, goLive);
router.route("/:streamId/end").post(verifyJWT, endStream);
router.route("/:streamId/viewer-increment").post(verifyJWT, incrementViewerCount);
router.route("/:streamId/viewer-decrement").post(verifyJWT, decrementViewerCount);

export default router;
