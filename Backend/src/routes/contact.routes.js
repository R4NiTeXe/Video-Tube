import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createContact } from "../controllers/contact.controller.js";
import { validateBody } from "../middlewares/validation.middleware.js";
import { contactSchemas } from "../validators/index.js";

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many contact submissions. Try again later." },
});

router
  .route("/")
  .post(contactLimiter, validateBody(contactSchemas.createContact.body), createContact);

export default router;
