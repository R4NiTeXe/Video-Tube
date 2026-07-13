import { Router } from "express";
import {
  getPlatformStats,
  getAllUsers,
  updateUserRole,
  banUser,
  adminDeleteVideo,
  getRecentActivity,
  getAllReports,
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

router.use(verifyJWT);
router.use(verifyAdmin);

router.route("/stats").get(getPlatformStats);
router.route("/users").get(getAllUsers);
router.route("/users/:userId/role").patch(updateUserRole);
router.route("/users/:userId/ban").delete(banUser);
router.route("/videos/:videoId").delete(adminDeleteVideo);
router.route("/activity").get(getRecentActivity);
router.route("/reports").get(getAllReports);

export default router;
