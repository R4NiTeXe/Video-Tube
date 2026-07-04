import nodemailer from "nodemailer";
import { Resend } from "resend";

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

      console.log(`✅ Email sent via Brevo SMTP to ${to}`);
      return { success: true, messageId: info.messageId, provider: "brevo" };
    } catch (error) {
      console.error("Brevo SMTP failed, trying Resend:", error.message);
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
        console.error("Resend API error:", result.error);
        throw new Error(result.error.message || "Resend failed");
      }

      console.log(`✅ Email sent via Resend to ${to}`);
      return { success: true, messageId: result.data?.id, provider: "resend" };
    } catch (error) {
      console.error("Resend failed:", error.message);
    }
  }

  // 3. Console fallback (dev mode)
  console.log("--- Development Email (No provider configured) ---");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${html}`);
  console.log("-----------------------------------------------");
  return { success: true, mode: "console" };
};

export { sendEmail };
