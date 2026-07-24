import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load the .env file so we get the SMTP variables
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  await transporter.verify();
  console.log("✅ SMTP Connected Successfully");
} catch (err) {
  console.error("❌ SMTP Verify Failed:", err);
}
