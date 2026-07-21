import { Router } from "express";
import { voteOnPoll } from "../controllers/poll.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateParams, validateBody } from "../middlewares/validation.middleware.js";
import { pollSchemas } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/:pollId/vote").post(validateParams(pollSchemas.voteOnPoll.params), validateBody(pollSchemas.voteOnPoll.body), voteOnPoll);

export default router;
