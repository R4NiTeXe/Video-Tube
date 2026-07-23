import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  forgotPassword,
  resetPassword,
  socialLogin,
} from "../controllers/auth/auth.controller.js";

import {
  forgotPasswordOTP,
  verifyResetOTP,
  resetPasswordWithOTP,
  skipAndLogin,
  generateAccessAndRefreshToken,
  getCookieOptions,
} from "../controllers/user.controller.js";

import {
  sendOtp,
  verifyOtp,
  resendOtp,
  getOtpUsage,
} from "../controllers/auth/otp.controller.js";

import {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  registerUnified,
  sendLoginOTP,
  verifyLoginOTP,
} from "../controllers/auth/unifiedAuth.controller.js";

import {
  sendChangePasswordOTP,
  verifyAndChangePassword,
  sendDeleteAccountOTP,
  verifyAndDeleteAccount,
  sendForgotPasswordChangeOTP,
  verifyAndResetPasswordViaOTP,
  getNotificationPrefs,
  updateNotificationPrefs,
  updatePrivacySettings,
  addSearchHistory,
  getSearchHistory,
  clearSearchHistory,
  clearWatchHistory,
  getWatchLater,
} from "../controllers/user/settings.controller.js";

import {
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserBanner,
  getUserChannelProfile,
  getWatchHistory,
  deleteCurrentUser,
  updateUserProfile,
  getUserProfile,
  searchUsers,
  blockUser,
  muteUser,
  addToWatchLater,
} from "../controllers/user/profile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload, validateFileSize } from "../middlewares/multer.middleware.js";
import { authLimiter, searchLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validateBody, validateParams, validateQuery, validateAll } from "../middlewares/validation.middleware.js";
import {
  userSchemas,
  otpSchemas,
  settingsSchemas,
} from "../validators/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { verifyOTP } from "../utils/otp.js";
import { createSession } from "../controllers/session.controller.js";

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
  validateBody(userSchemas.register.body),
  registerUser
);
router.route("/login").post(authLimiter, validateBody(userSchemas.login.body), loginUser);
router.route("/refresh-token").post(authLimiter, validateBody(userSchemas.refreshToken.body), refreshAccessToken);
router.route("/forgot-password").post(authLimiter, validateBody(userSchemas.forgotPassword.body), forgotPassword);
router.route("/reset-password").post(authLimiter, validateBody(userSchemas.resetPassword.body), resetPassword);
router.route("/social-login").post(authLimiter, validateBody(userSchemas.socialLogin.body), socialLogin);

router.route("/send-forgot-otp").post(authLimiter, validateBody(userSchemas.sendForgotPasswordOTP.body), forgotPasswordOTP);
router.route("/verify-forgot-otp").post(authLimiter, validateBody(userSchemas.verifyResetOTP.body), verifyResetOTP);
router.route("/reset-password-token").post(authLimiter, validateBody(userSchemas.resetPasswordWithOTP.body), resetPasswordWithOTP);
router.route("/skip-and-login").post(authLimiter, validateBody(userSchemas.skipAndLogin.body), skipAndLogin);

router.route("/otp/send").post(authLimiter, validateBody(otpSchemas.sendOtp.body), sendOtp);
router.route("/otp/verify").post(authLimiter, validateBody(otpSchemas.verifyOtp.body), verifyOtp);
router.route("/otp/resend").post(authLimiter, validateBody(otpSchemas.resendOtp.body), resendOtp);
router.route("/otp/usage").get(verifyJWT, validateQuery(otpSchemas.getOtpUsage.query), getOtpUsage);

router.route("/send-registration-otp").post(authLimiter, validateBody(userSchemas.sendRegistrationOTP.body), sendRegistrationOTP);
router.route("/verify-registration-otp").post(authLimiter, validateBody(userSchemas.verifyRegistrationOTP.body), verifyRegistrationOTP);
router.route("/register-unified").post(
  authLimiter,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  validateBody(userSchemas.registerUnified.body),
  registerUnified
);

router.route("/send-login-otp").post(authLimiter, validateBody(userSchemas.sendLoginOTP.body), sendLoginOTP);
router.route("/verify-login-otp").post(authLimiter, validateBody(userSchemas.verifyLoginOTP.body), verifyLoginOTP);

router.route("/mobile/send-login-otp").post(authLimiter, validateBody(userSchemas.mobileSendLoginOTP.body), (req, _, next) => { req.body.identifier = req.body.mobile; next(); }, sendLoginOTP);
router.route("/mobile/login").post(authLimiter, validateBody(userSchemas.mobileVerifyLoginOTP.body), (req, _, next) => { req.body.identifier = req.body.mobile; next(); }, verifyLoginOTP);
router.route("/mobile/send-registration-otp").post(authLimiter, validateBody(userSchemas.mobileSendRegistrationOTP.body), (req, _, next) => { req.body.identifier = req.body.mobile; next(); }, sendRegistrationOTP);
router.route("/mobile/verify-registration-otp").post(authLimiter, validateBody(userSchemas.mobileVerifyRegistrationOTP.body), (req, _, next) => { req.body.identifier = req.body.mobile; next(); }, verifyRegistrationOTP);
router.route("/mobile/register").post(
  authLimiter,
  validateBody(userSchemas.mobileRegister.body),
  asyncHandler(async (req, res) => {
    const { mobile, otp: otpValue, fullName, username, password } = req.body;
    const normalizedMobile = mobile.trim();
    const result = await verifyOTP(normalizedMobile, otpValue, "login");
    if (!result.valid) {
      throw new ApiError(400, result.message);
    }
    const existing = await User.findOne({ $or: [{ mobile: normalizedMobile }, { username: username.toLowerCase() }] });
    if (existing) {
      throw new ApiError(409, existing.mobile === normalizedMobile ? "Mobile already registered" : "Username already taken");
    }
    const user = await User.create({
      username: username.toLowerCase(),
      fullName: fullName.trim(),
      mobile: normalizedMobile,
      password,
      isMobileVerified: true,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName.trim())}&background=6366f1&color=fff`,
    });
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken").lean();
    const options = getCookieOptions();
    await createSession(user._id, refreshToken, req);
    return res.status(201).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(201, { user: loggedInUser }, "User registered successfully"));
  })
);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/change-password").post(verifyJWT, validateBody(userSchemas.changePassword.body), changeCurrentPassword);
router.route("/update-account").patch(verifyJWT, validateBody(userSchemas.updateAccount.body), updateAccountDetails);
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), validateFileSize, updateUserAvatar);
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), validateFileSize, updateUserCoverImage);
router
  .route("/banner")
  .patch(verifyJWT, upload.single("banner"), validateFileSize, updateUserBanner);
router.route("/c/:username").get(verifyJWT, validateParams(userSchemas.getUserChannelProfile.params), getUserChannelProfile);
router.route("/history").get(verifyJWT, validateQuery(userSchemas.getWatchHistory.query), getWatchHistory);
router.route("/history/clear").delete(verifyJWT, clearWatchHistory);
router.route("/search").get(verifyJWT, searchLimiter, validateQuery(userSchemas.searchUsers.query), searchUsers);
router.route("/search/history").get(verifyJWT, getSearchHistory);
router.route("/search/history").post(verifyJWT, validateBody(userSchemas.addSearchHistory.body), addSearchHistory);
router.route("/search/history").delete(verifyJWT, clearSearchHistory);
router.route("/profile/:username").get(verifyJWT, validateParams(userSchemas.getUserProfile.params), getUserProfile);
router.route("/profile").patch(verifyJWT, validateBody(userSchemas.updateProfile.body), updateUserProfile);
router.route("/watch-later/:videoId").post(verifyJWT, validateParams(userSchemas.addToWatchLater.params), addToWatchLater);
router.route("/watch-later").get(verifyJWT, getWatchLater);
router.route("/block/:userId").post(verifyJWT, validateParams(userSchemas.blockUser.params), blockUser);
router.route("/mute/:userId").post(verifyJWT, validateParams(userSchemas.muteUser.params), muteUser);
router.route("/notification-prefs").get(verifyJWT, getNotificationPrefs);
router.route("/notification-prefs").patch(verifyJWT, validateBody(settingsSchemas.updateNotificationPrefs.body), updateNotificationPrefs);
router.route("/privacy").patch(verifyJWT, validateBody(userSchemas.updatePrivacy.body), updatePrivacySettings);
router.route("/language").patch(verifyJWT, validateBody(userSchemas.updateLanguage.body), asyncHandler(async (req, res) => {
  const { language } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { language } }, { new: true }).select("language").lean();
  res.status(200).json(new ApiResponse(200, user, "Language updated"));
}));
router.route("/content-defaults").patch(verifyJWT, validateBody(userSchemas.updateContentDefaults.body), asyncHandler(async (req, res) => {
  const { defaultVisibility, defaultCategory } = req.body;
  const update = {};
  if (defaultVisibility) update.defaultVisibility = defaultVisibility;
  if (defaultCategory) update.defaultCategory = defaultCategory;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select("defaultVisibility defaultCategory").lean();
  res.status(200).json(new ApiResponse(200, user, "Content defaults updated"));
}));
router.route("/send-change-password-otp").post(verifyJWT, validateBody(userSchemas.sendChangePasswordOTP.body), sendChangePasswordOTP);
router.route("/verify-change-password").post(verifyJWT, validateBody(userSchemas.verifyAndChangePassword.body), verifyAndChangePassword);
router.route("/send-delete-account-otp").post(verifyJWT, validateBody(userSchemas.sendDeleteAccountOTP.body), sendDeleteAccountOTP);
router.route("/verify-and-delete-account").post(verifyJWT, validateBody(userSchemas.verifyAndDeleteAccount.body), verifyAndDeleteAccount);
router.route("/send-forgot-password-change-otp").post(verifyJWT, validateBody(userSchemas.sendForgotPasswordChangeOTP.body), sendForgotPasswordChangeOTP);
router.route("/verify-and-reset-password-via-otp").post(verifyJWT, validateBody(userSchemas.verifyAndResetPasswordViaOTP.body), verifyAndResetPasswordViaOTP);
router.route("/").delete(verifyJWT, deleteCurrentUser);

export default router;
