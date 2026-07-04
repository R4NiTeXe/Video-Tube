import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/session.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getActiveSessions);
router.route("/:sessionId").delete(revokeSession);
router.route("/").delete(revokeAllSessions);

export default router;
