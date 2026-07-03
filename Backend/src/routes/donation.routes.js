import { Router } from "express";
import {
  createDonation,
  getDonationsForUser,
  getDonationsByUser,
  getDonationsForStream,
} from "../controllers/donation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createDonation);
router.route("/sent").get(getDonationsByUser);
router.route("/received/:userId").get(getDonationsForUser);
router.route("/stream/:streamId").get(getDonationsForStream);

export default router;
