import { otpService } from "../services/otp.service.js";
import logger from "./logger.js";

// Send OTP via Meta WhatsApp Business API (uses unified OTP service)
export const sendWhatsAppOTP = async (mobile, otp) => {
  const API_URL = process.env.WHATSAPP_API_URL;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification";
  const LANGUAGE_CODE = process.env.WHATSAPP_LANGUAGE_CODE || "en";
  const WHATSAPP_MODE = process.env.WHATSAPP_MODE || "text";

  // Dev mode: console.log fallback
  if (!API_URL || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    if (process.env.NODE_ENV === "production") return { success: false, mode: "unconfigured", delivered: false, message: "WhatsApp not configured" };
    logger.debug("--- Development WhatsApp OTP (masked) ---");
    logger.debug(`Mobile: ${mobile.slice(0, 4)}****${mobile.slice(-2)}`);
    logger.debug("OTP: [REDACTED]");
    logger.debug("----------------------------------------");
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
      logger.error("WhatsApp API error", { error: data.error?.message || response.statusText });
      if (process.env.NODE_ENV === "production") return { success: false, mode: "error", delivered: false, message: `WhatsApp API error: ${data.error?.message || "Unknown"}` };
      logger.debug("--- WhatsApp API failed, fallback OTP (masked) ---");
      logger.debug(`Mobile: ${mobile.slice(0, 4)}****${mobile.slice(-2)}`);
      logger.debug("OTP: [REDACTED]");
      logger.debug(`Error: ${data.error?.message || "Unknown"}`);
      logger.debug("-------------------------------------------------");
      return { success: false, mode: "console-fallback", delivered: false, message: `WhatsApp API error: ${data.error?.message || "Unknown"}` };
    }

    return { success: true, data };
  } catch (error) {
    logger.error("WhatsApp send error", { error: error.message });
    if (process.env.NODE_ENV === "production") return { success: false, mode: "error", delivered: false, message: `WhatsApp unreachable: ${error.message}` };
    logger.debug("--- WhatsApp API unreachable, fallback OTP (masked) ---");
    logger.debug(`Mobile: ${mobile.slice(0, 4)}****${mobile.slice(-2)}`);
    logger.debug("OTP: [REDACTED]");
    logger.debug(`Error: ${error.message}`);
    logger.debug("-------------------------------------------------------");
    return { success: false, mode: "console-fallback", delivered: false, message: `WhatsApp unreachable: ${error.message}` };
  }
};