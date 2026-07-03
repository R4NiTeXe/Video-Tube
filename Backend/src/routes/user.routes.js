import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  deleteCurrentUser,
  updateUserProfile,
  getUserProfile,
  searchUsers,
  forgotPassword,
  resetPassword,
  blockUser,
  muteUser,
  addToWatchLater,
  getWatchLater,
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  clearWatchHistory,
  updateNotificationPrefs,
  updatePrivacySettings,
  exportUserData,
  updateUserBanner,
  forgotPasswordOTP,
  verifyResetOTP,
  resetPasswordWithOTP,
  sendChangePasswordOTP,
  verifyAndChangePassword,
  socialLogin,
  linkSocialAccount,
  sendMobileRegistrationOTP,
  verifyMobileRegistrationOTP,
  registerUserWithMobile,
  loginUserWithMobile,
  sendMobileLoginOTP,
  sendEmailRegistrationOTP,
  verifyEmailRegistrationOTP,
  registerWithEmailOTP,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Auth routes with strict rate limiting
router.route("/register").post(
  authLimiter,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(authLimiter, loginUser);
router.route("/refresh-token").post(authLimiter, refreshAccessToken);
router.route("/forgot-password").post(authLimiter, forgotPassword);
router.route("/reset-password").post(authLimiter, resetPassword);
router.route("/forgot-password-otp").post(authLimiter, forgotPasswordOTP);
router.route("/verify-reset-otp").post(authLimiter, verifyResetOTP);
router.route("/reset-password-otp").post(authLimiter, resetPasswordWithOTP);
router.route("/social-login").post(authLimiter, socialLogin);

// Mobile OTP routes
router.route("/mobile/send-registration-otp").post(authLimiter, sendMobileRegistrationOTP);
router.route("/mobile/verify-registration-otp").post(authLimiter, verifyMobileRegistrationOTP);
router.route("/mobile/register").post(authLimiter, registerUserWithMobile);
router.route("/mobile/send-login-otp").post(authLimiter, sendMobileLoginOTP);
router.route("/mobile/login").post(authLimiter, loginUserWithMobile);

// Email registration OTP routes
router.route("/email/send-registration-otp").post(authLimiter, sendEmailRegistrationOTP);
router.route("/email/verify-registration-otp").post(authLimiter, verifyEmailRegistrationOTP);
router.route("/email/register").post(authLimiter, registerWithEmailOTP);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router
  .route("/banner")
  .patch(verifyJWT, upload.single("banner"), updateUserBanner);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);
router.route("/history/clear").delete(verifyJWT, clearWatchHistory);
router.route("/search").get(verifyJWT, searchUsers);
router.route("/search/history").get(verifyJWT, getSearchHistory);
router.route("/search/history").post(verifyJWT, addSearchHistory);
router.route("/search/history").delete(verifyJWT, clearSearchHistory);
router.route("/profile/:username").get(verifyJWT, getUserProfile);
router.route("/profile").patch(verifyJWT, updateUserProfile);
router.route("/watch-later/:videoId").post(verifyJWT, addToWatchLater);
router.route("/watch-later").get(verifyJWT, getWatchLater);
router.route("/block/:userId").post(verifyJWT, blockUser);
router.route("/mute/:userId").post(verifyJWT, muteUser);
router.route("/notification-prefs").patch(verifyJWT, updateNotificationPrefs);
router.route("/privacy").patch(verifyJWT, updatePrivacySettings);
router.route("/export-data").get(verifyJWT, exportUserData);
router.route("/send-change-password-otp").post(verifyJWT, sendChangePasswordOTP);
router.route("/verify-change-password").post(verifyJWT, verifyAndChangePassword);
router.route("/link-social").post(verifyJWT, linkSocialAccount);
router.route("/").delete(verifyJWT, deleteCurrentUser);

export default router;
