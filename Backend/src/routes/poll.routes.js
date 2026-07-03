import { Router } from "express";
import {
  createPoll,
  getVideoPolls,
  getPollById,
  votePoll,
  deletePoll,
  closePoll,
} from "../controllers/poll.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/video/:videoId").get(getVideoPolls);
router.route("/:pollId").get(getPollById);
router.route("/").post(createPoll);
router.route("/:pollId/vote").post(votePoll);
router.route("/:pollId").delete(deletePoll);
router.route("/:pollId/close").patch(closePoll);

export default router;
