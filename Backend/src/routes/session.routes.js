import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
} from "../controllers/session.controller.js";
import { validateParams } from "../middlewares/validation.middleware.js";
import { sessionSchemas } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getActiveSessions);
router.route("/:sessionId").delete(validateParams(sessionSchemas.revokeSession.params), revokeSession);
router.route("/").delete(revokeAllSessions);

export default router;
