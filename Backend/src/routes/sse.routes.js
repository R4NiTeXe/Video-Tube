import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { streamNotifications } from "../controllers/sse.controller.js";

const router = Router();

router.get("/notifications", verifyJWT, streamNotifications);

export default router;
