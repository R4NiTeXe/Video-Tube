import { otpService } from "../services/otp.service.js";

// Generate 6-digit OTP
export const generateOTP = () => otpService.generateOtp();

// Store OTP (10min expiry)
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