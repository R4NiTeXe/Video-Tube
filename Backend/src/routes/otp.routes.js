import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
  getOtpUsage,
  resendOtp,
} from "../controllers/otp.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { otpLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validateBody, validateQuery } from "../middlewares/validation.middleware.js";
import { otpSchemas } from "../validators/index.js";

const router = Router();

router.route("/send").post(otpLimiter, validateBody(otpSchemas.sendOtp.body), sendOtp);
router.route("/verify").post(otpLimiter, validateBody(otpSchemas.verifyOtp.body), verifyOtp);
router.route("/resend").post(otpLimiter, validateBody(otpSchemas.resendOtp.body), resendOtp);
router.route("/usage").get(verifyJWT, validateQuery(otpSchemas.getOtpUsage.query), getOtpUsage);

export default router;