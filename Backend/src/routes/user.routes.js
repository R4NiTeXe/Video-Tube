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
  sendDeleteAccountOTP,
  verifyAndDeleteAccount,
  sendForgotPasswordChangeOTP,
  verifyAndResetPasswordViaOTP,
  // New unified auth flows
  sendRegistrationOTP,
  verifyRegistrationOTP,
  registerUnified,
  sendLoginOTP,
  verifyLoginOTP,
  sendForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetPasswordWithResetToken,
  skipAndLogin,
  // Keep old exports for backward compatibility
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

// Email registration OTP routes (backward compatibility)
router.route("/email/send-registration-otp").post(authLimiter, sendEmailRegistrationOTP);
router.route("/email/verify-registration-otp").post(authLimiter, verifyEmailRegistrationOTP);
router.route("/email/register").post(authLimiter, registerWithEmailOTP);

// ── Unified Registration Flow ──
// Step 1: Send OTPs to both email and mobile
router.route("/send-registration-otp").post(authLimiter, sendRegistrationOTP);
// Step 2: Verify OTP for a specific channel (email or mobile)
router.route("/verify-registration-otp").post(authLimiter, verifyRegistrationOTP);
// Step 3: Complete registration (requires at least ONE verified)
router.route("/register-unified").post(
  authLimiter,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUnified
);

// ── OTP Login (Passwordless) ──
// Step 1: Send login OTP (email or mobile)
router.route("/send-login-otp").post(authLimiter, sendLoginOTP);
// Step 2: Verify login OTP and get tokens
router.route("/verify-login-otp").post(authLimiter, verifyLoginOTP);

// ── Forgot Password with Channel Selection ──
// Step 1: Send forgot password OTP (user chooses email or WhatsApp)
router.route("/send-forgot-otp").post(authLimiter, sendForgotPasswordOTP);
// Step 2: Verify forgot password OTP
router.route("/verify-forgot-otp").post(authLimiter, verifyForgotPasswordOTP);
// Step 3a: Reset password with reset token
router.route("/reset-password-token").post(authLimiter, resetPasswordWithResetToken);
// Step 3b: Skip password reset and just login
router.route("/skip-and-login").post(authLimiter, skipAndLogin);

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
router.route("/send-delete-account-otp").post(verifyJWT, sendDeleteAccountOTP);
router.route("/verify-and-delete-account").post(verifyJWT, verifyAndDeleteAccount);
router.route("/send-forgot-password-change-otp").post(verifyJWT, sendForgotPasswordChangeOTP);
router.route("/verify-and-reset-password-via-otp").post(verifyJWT, verifyAndResetPasswordViaOTP);
router.route("/").delete(verifyJWT, deleteCurrentUser);

export default router;
