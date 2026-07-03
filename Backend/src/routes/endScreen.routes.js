import { Router } from "express";
import {
  getEndScreen,
  updateEndScreen,
  deleteEndScreen,
} from "../controllers/endScreen.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router
  .route("/:videoId")
  .get(getEndScreen)
  .put(verifyJWT, updateEndScreen)
  .delete(verifyJWT, deleteEndScreen);

export default router;
