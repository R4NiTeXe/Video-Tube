export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  forgotPassword,
  resetPassword,
  socialLogin,
} from "./auth.controller.js";

export {
  sendOtp,
  verifyOtp,
  resendOtp,
  getOtpUsage,
} from "./otp.controller.js";

export {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  registerUnified,
  sendLoginOTP,
  verifyLoginOTP,
} from "./unifiedAuth.controller.js";

export {
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
} from "./settings.controller.js";