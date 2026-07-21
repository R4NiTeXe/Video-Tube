import { Router } from "express";
import {
  createReport,
  getMyReports,
} from "../controllers/report.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateBody, validateQuery } from "../middlewares/validation.middleware.js";
import { reportSchemas } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(validateBody(reportSchemas.createReport.body), createReport);
router.route("/mine").get(validateQuery(reportSchemas.getMyReports.query), getMyReports);

export default router;
