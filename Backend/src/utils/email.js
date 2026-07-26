import { Resend } from "resend";
import logger from "./logger.js";
import { checkMessagingLimit, incrementMessagingLimit } from "../services/messagingLimit.service.js";

const isBrevoConfigured = Boolean(process.env.BREVO_API_KEY);

const isResendConfigured = Boolean(process.env.RESEND_API_KEY);
let resend = null;
if (isResendConfigured) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const maskEmail = (e) => { const at = e.indexOf("@"); return at > 0 ? `${e.slice(0, 2)}***${e.slice(at)}` : `${e.slice(0, 2)}***`; };

const sendEmail = async ({ to, subject, html }) => {
  let lastError = null;

  // Check limits before sending — wrap in try/catch so Redis issues don't crash the flow
  try {
    await checkMessagingLimit(to);
  } catch (limitError) {
    // Re-throw rate limit errors (429) so callers can handle them
    if (limitError?.statusCode === 429 || limitError?.status === 429) throw limitError;
    // For unexpected errors (Redis down, etc), log and continue
    logger.warn("Messaging limit check failed (skipping):", { error: limitError?.message });
  }

  // Try Brevo API first
  if (isBrevoConfigured) {
    try {
      const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@videotube.com";
      const fromName = "VideoTube";

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromAddress },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html,
          replyTo: { email: fromAddress }
        })
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(`Brevo API Error: ${response.status} - ${JSON.stringify(responseData)}`);
      }

      logger.info(`Email sent via Brevo API to ${maskEmail(to)}`);
      await incrementMessagingLimit(to);
      return { success: true, messageId: responseData?.messageId, provider: "brevo" };
    } catch (error) {
      lastError = error;
      logger.error("Brevo API failed, trying Resend:", {
        message: error.message,
        stack: error.stack,
      });
    }
  }

  // Fallback to Resend
  if (isResendConfigured && resend) {
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM || "VideoTube <onboarding@resend.dev>",
        to,
        subject,
        html,
      });

      if (result.error) {
        logger.error("Resend API error:", { error: result.error });
        throw new Error(result.error.message || "Resend failed");
      }

      logger.info(`Email sent via Resend to ${maskEmail(to)}`);
      await incrementMessagingLimit(to);
      return { success: true, messageId: result.data?.id, provider: "resend" };
    } catch (error) {
      lastError = error;
      logger.error("Resend failed:", {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  if (lastError) {
    throw new Error(`Failed to send email: ${lastError.message}`);
  }

  // Console fallback (dev mode)
  if (process.env.NODE_ENV === "production") throw new Error("No email provider configured");
  logger.debug("--- Development Email (No provider configured) ---");
  logger.debug(`To: ${maskEmail(to)}`);
  logger.debug(`Subject: ${subject}`);
  logger.debug(`Body length: ${Buffer.byteLength(html, "utf8")} bytes`);
  logger.debug("-------------------------------------------------");
  return { success: true, mode: "console" };
};

export { sendEmail };
