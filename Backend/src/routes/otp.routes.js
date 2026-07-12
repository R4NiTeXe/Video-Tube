import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
  getOtpUsage,
  resendOtp,
} from "../controllers/otp.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { otpLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

router.route("/send").post(otpLimiter, sendOtp);
router.route("/verify").post(otpLimiter, verifyOtp);
router.route("/resend").post(otpLimiter, resendOtp);
router.route("/usage").get(verifyJWT, getOtpUsage);

export default router;