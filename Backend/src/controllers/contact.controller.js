import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Contact } from "../models/contact.model.js";
import { sendEmail } from "../utils/email.js";
import { getLocationInfo } from "../utils/location.js";
import {
  contactOwnerTemplate,
  contactUserConfirmationTemplate,
  formatDate,
} from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";

const createContact = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
  const userAgent = req.headers["user-agent"] || "";

  const contact = await Contact.create({
    name,
    email,
    subject,
    message,
    ipAddress,
    userAgent,
  });

  const contactLoc = await getLocationInfo(req).catch(() => ({
    timezone: undefined,
  }));
  const time = formatDate(undefined, contactLoc.timezone);
  const ownerEmail =
    process.env.CONTACT_EMAIL ||
    process.env.MAIL_FROM ||
    "videotube044.official@gmail.com";

  try {
    const ownerHtml = contactOwnerTemplate({
      name,
      email,
      subject,
      message,
      time,
      ip: ipAddress,
      userAgent,
    });

    await sendEmail({
      to: ownerEmail,
      subject: `[VideoTube Contact] ${subject}`,
      html: ownerHtml,
    });

    contact.ownerNotified = true;

    try {
      const userHtml = contactUserConfirmationTemplate(name);
      await sendEmail({
        to: email,
        subject: "We received your message",
        html: userHtml,
      });
      contact.userNotified = true;
    } catch (userEmailErr) {
      logger.warn("Failed to send confirmation email to user:", {
        error: userEmailErr.message,
        email,
      });
    }

    await contact.save({ validateBeforeSave: false });
  } catch (emailErr) {
    logger.error("Failed to send contact notification email:", {
      error: emailErr.message,
    });
    throw new ApiError(
      500,
      "Your message was saved but we could not send the notification. Please try again later."
    );
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { id: contact._id },
        "Your message has been sent successfully. We will get back to you as soon as possible."
      )
    );
});

export { createContact };
