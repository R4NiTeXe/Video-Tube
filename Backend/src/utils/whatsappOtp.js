import crypto from "crypto";

// In-memory OTP store (replace with Redis in production)
const whatsappOtpStore = new Map();

export const generateWhatsAppOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const storeWhatsAppOTP = async (mobile, purpose = "registration") => {
  const otp = generateWhatsAppOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  whatsappOtpStore.set(`${mobile}:${purpose}`, {
    otp,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return otp;
};

export const verifyWhatsAppOTP = async (mobile, otp, purpose = "registration") => {
  const key = `${mobile}:${purpose}`;
  const record = whatsappOtpStore.get(key);

  if (!record) return { valid: false, message: "OTP not found. Please request a new one." };
  if (record.verified) return { valid: false, message: "OTP already used." };
  if (record.attempts >= 5) return { valid: false, message: "Too many attempts. Request a new OTP." };
  if (Date.now() > record.expiresAt) {
    whatsappOtpStore.delete(key);
    return { valid: false, message: "OTP expired. Request a new one." };
  }

  record.attempts += 1;

  if (record.otp !== otp) {
    whatsappOtpStore.set(key, record);
    return { valid: false, message: "Invalid OTP." };
  }

  record.verified = true;
  whatsappOtpStore.set(key, record);

  return { valid: true, message: "OTP verified." };
};

// Send OTP via Meta WhatsApp Business API
export const sendWhatsAppOTP = async (mobile, otp) => {
  const API_URL = process.env.WHATSAPP_API_URL;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification";
  const LANGUAGE_CODE = process.env.WHATSAPP_LANGUAGE_CODE || "en";
  // "text" for dev/test (free-form messages), "template" for production (requires approved template)
  const WHATSAPP_MODE = process.env.WHATSAPP_MODE || "text";

  // Dev mode: console.log fallback
  if (!API_URL || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log("--- Development WhatsApp OTP ---");
    console.log(`Mobile: ${mobile}`);
    console.log(`OTP: ${otp}`);
    console.log("-------------------------------");
    return { success: true, mode: "console", delivered: false, message: "OTP logged to console (dev mode)" };
  }

  // Format mobile number (remove + if present, ensure country code)
  const formattedMobile = mobile.startsWith("+") ? mobile.slice(1) : mobile;

  try {
    let body;

    if (WHATSAPP_MODE === "template") {
      // Production: Use approved template message
      body = {
        messaging_product: "whatsapp",
        to: formattedMobile,
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: { code: LANGUAGE_CODE },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: otp },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [
                { type: "text", text: otp },
              ],
            },
          ],
        },
      };
    } else {
      // Dev/Test: Use free-form text message (works with test phone numbers)
      body = {
        messaging_product: "whatsapp",
        to: formattedMobile,
        type: "text",
        text: {
          body: `🔐 Your VideoTube verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share this code with anyone.`,
        },
      };
    }

    const response = await fetch(
      `${API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", data);
      // Fallback: log OTP to console so dev workflow isn't broken
      console.log("--- WhatsApp API failed, fallback OTP ---");
      console.log(`Mobile: ${mobile}`);
      console.log(`OTP: ${otp}`);
      console.log(`Error: ${data.error?.message || "Unknown"}`);
      console.log("------------------------------------------");
      return { success: false, mode: "console-fallback", delivered: false, message: `WhatsApp API error: ${data.error?.message || "Unknown"}` };
    }

    return { success: true, data };
  } catch (error) {
    console.error("WhatsApp send error:", error.message);
    // Fallback: log OTP to console so dev workflow isn't broken
    console.log("--- WhatsApp API unreachable, fallback OTP ---");
    console.log(`Mobile: ${mobile}`);
    console.log(`OTP: ${otp}`);
    console.log(`Error: ${error.message}`);
    console.log("----------------------------------------------");
    return { success: false, mode: "console-fallback", delivered: false, message: `WhatsApp unreachable: ${error.message}` };
  }
};

// Cleanup expired OTPs every 5 minutes
const cleanupExpiredWhatsAppOTPs = () => {
  const now = Date.now();
  for (const [key, record] of whatsappOtpStore.entries()) {
    if (now > record.expiresAt) {
      whatsappOtpStore.delete(key);
    }
  }
};

setInterval(cleanupExpiredWhatsAppOTPs, 5 * 60 * 1000);
