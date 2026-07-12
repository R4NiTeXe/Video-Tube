import { otpService } from "../services/otp.service.js";

// Generate 6-digit numeric OTP (delegates to service)
export const generateOTP = () => otpService.generateOtp();

// Store OTP in database (expires in 10 minutes)
// identifier: email or mobile number
// channel: "email" | "whatsapp"
// userId: optional, for tracking user daily limit
export const storeOTP = async (identifier, purpose, channel = "email", userId = null) => {
  const { otp } = await otpService.storeOtp({
    identifier: identifier.toLowerCase(),
    purpose,
    channel,
    userId,
  });
  return otp;
};

// Verify OTP — atomic attempt increment to prevent race conditions
// identifier: email or mobile number
export const verifyOTP = async (identifier, otp, purpose) => {
  const result = await otpService.verifyOtp({
    identifier: identifier.toLowerCase(),
    otp,
    purpose,
  });
  return result;
};

export { otpService } from "../services/otp.service.js";