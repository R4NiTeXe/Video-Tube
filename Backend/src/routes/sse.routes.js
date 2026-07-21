import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { streamNotifications } from "../controllers/sse.controller.js";
import { validateQuery } from "../middlewares/validation.middleware.js";
import { sseSchemas } from "../validators/index.js";

const router = Router();

router.get("/notifications", verifyJWT, validateQuery(sseSchemas.streamNotifications.query), streamNotifications);

export default router;
