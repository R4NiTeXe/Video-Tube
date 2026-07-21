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
import { validateParams, validateQuery, validateBody } from "../middlewares/validation.middleware.js";
import { adminSchemas } from "../validators/index.js";

const router = Router();

router.use(verifyJWT);
router.use(verifyAdmin);

router.route("/stats").get(getPlatformStats);
router.route("/users").get(validateQuery(adminSchemas.getAllUsers.query), getAllUsers);
router.route("/users/:userId/role").patch(validateParams(adminSchemas.updateUserRole.params), validateBody(adminSchemas.updateUserRole.body), updateUserRole);
router.route("/users/:userId/ban").delete(validateParams(adminSchemas.banUser.params), banUser);
router.route("/videos/:videoId").delete(validateParams(adminSchemas.adminDeleteVideo.params), adminDeleteVideo);
router.route("/activity").get(validateQuery(adminSchemas.getRecentActivity.query), getRecentActivity);
router.route("/reports").get(validateQuery(adminSchemas.getAllReports.query), getAllReports);

export default router;
