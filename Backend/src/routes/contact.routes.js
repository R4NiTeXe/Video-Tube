import { Router } from "express";
import { createContact } from "../controllers/contact.controller.js";
import { validateBody } from "../middlewares/validation.middleware.js";
import { contactSchemas } from "../validators/index.js";

const router = Router();

router.route("/").post(
  validateBody(contactSchemas.createContact.body),
  createContact
);

export default router;
