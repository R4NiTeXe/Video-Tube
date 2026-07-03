import { Router } from "express";
import {
  addCaption,
  getCaptions,
  updateCaption,
  deleteCaption,
} from "../controllers/caption.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").get(getCaptions).post(
  upload.fields([{ name: "captionsFile", maxCount: 1 }]),
  addCaption
);
router.route("/edit/:captionId").patch(
  upload.fields([{ name: "captionsFile", maxCount: 1 }]),
  updateCaption
);
router.route("/delete/:captionId").delete(deleteCaption);

export default router;
