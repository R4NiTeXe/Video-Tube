import crypto from "crypto";

// OTP Store (in-memory for dev, use Redis in production)
const otpStore = new Map();

// Generate 6-digit numeric OTP
export const generateMobileOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP for mobile (expires in 10 minutes)
export const storeMobileOTP = async (mobile, purpose = "registration") => {
  const otp = generateMobileOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const attempts = 0;

  otpStore.set(`${mobile}:${purpose}`, {
    otp,
    expiresAt,
    attempts,
    verified: false,
  });

  return otp;
};

// Verify OTP for mobile
export const verifyMobileOTP = async (mobile, otp, purpose = "registration") => {
  const key = `${mobile}:${purpose}`;
  const record = otpStore.get(key);

  if (!record) return { valid: false, message: "OTP not found. Please request a new one." };
  if (record.verified) return { valid: false, message: "OTP already used." };
  if (record.attempts >= 5) return { valid: false, message: "Too many attempts. Request a new OTP." };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { valid: false, message: "OTP expired. Request a new one." };
  }

  record.attempts += 1;

  if (record.otp !== otp) return { valid: false, message: "Invalid OTP." };

  record.verified = true;
  otpStore.set(key, record);

  return { valid: true, message: "OTP verified." };
};

// Send OTP via MSG91
export const sendMobileOTP = async (mobile, otp) => {
  const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
  const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

  // Dev mode: console.log fallback
  if (!MSG91_AUTH_KEY) {
    console.log("--- Development SMS OTP ---");
    console.log(`Mobile: ${mobile}`);
    console.log(`OTP: ${otp}`);
    console.log("---------------------------");
    return { success: true, mode: "console" };
  }

  try {
    const response = await fetch("https://api.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        mobile: mobile,
        otp: otp,
        template_id: MSG91_TEMPLATE_ID,
      }),
    });

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("MSG91 SMS error:", error.message);
    throw error;
  }
};

// Cleanup expired OTPs (call periodically)
export const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);
