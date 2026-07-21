import nodemailer from "nodemailer";
import { Resend } from "resend";
import logger from "./logger.js";

// Brevo SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

// Resend fallback
const isResendConfigured = Boolean(process.env.RESEND_API_KEY);
let resend = null;
if (isResendConfigured) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const maskEmail = (e) => { const at = e.indexOf("@"); return at > 0 ? `${e.slice(0, 2)}***${e.slice(at)}` : `${e.slice(0, 2)}***`; };

const sendEmail = async ({ to, subject, html }) => {
  // 1. Try Brevo SMTP first
  if (isSmtpConfigured) {
    try {
      const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        replyTo: fromAddress,
      });

      logger.info(`Email sent via Brevo SMTP to ${maskEmail(to)}`);
      return { success: true, messageId: info.messageId, provider: "brevo" };
    } catch (error) {
      logger.error("Brevo SMTP failed, trying Resend:", { error: error.message });
    }
  }

  // 2. Fallback to Resend
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
      return { success: true, messageId: result.data?.id, provider: "resend" };
    } catch (error) {
      logger.error("Resend failed:", { error: error.message });
    }
  }

  // 3. Console fallback (dev mode)
  if (process.env.NODE_ENV === "production") return { success: false, mode: "unconfigured", message: "No email provider configured" };
  logger.debug("--- Development Email (No provider configured) ---");
  logger.debug(`To: ${maskEmail(to)}`);
  logger.debug(`Subject: ${subject}`);
  logger.debug(`Body length: ${Buffer.byteLength(html, "utf8")} bytes`);
  logger.debug("-------------------------------------------------");
  return { success: true, mode: "console" };
};

export { sendEmail };
