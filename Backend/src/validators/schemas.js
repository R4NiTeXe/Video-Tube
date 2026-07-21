import { z } from "zod";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const pagination = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const passwordSchema = z
  .string()
  .min(8)
  .max(16)
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain number")
  .regex(/[^A-Za-z0-9]/, "Must contain special character");

const mobileSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid mobile number format");

const channelEnum = z.enum(["email", "mobile", "both"]).optional();

const identifierRefine = (data) =>
  Boolean(data.identifier || data.email || data.mobile);
const identifierMessage = "Either identifier, email, or mobile is required";

export const userSchemas = {
  register: {
    body: z.object({
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
      fullName: z.string().min(1).max(50).trim(),
      email: z.string().email(),
      password: z.string().min(8).max(16)
        .regex(/[A-Z]/, "Must contain uppercase")
        .regex(/[a-z]/, "Must contain lowercase")
        .regex(/[0-9]/, "Must contain number")
        .regex(/[^A-Za-z0-9]/, "Must contain special character"),
    }),
  },

  login: {
    body: z.object({
      email: z.string().email().optional(),
      username: z.string().optional(),
      mobile: z.string().optional(),
      password: z.string().min(1),
    }).refine((data) => data.email || data.username || data.mobile, {
      message: "Either email, username, or mobile is required",
    }),
  },

  refreshToken: {
    body: z
      .object({
        refreshToken: z.string().optional(),
      })
      .optional(),
  },

  socialLogin: {
    body: z.object({
      provider: z.enum(["google", "github"]),
      token: z.string().min(1),
    }),
  },

  skipAndLogin: {
    body: z.object({
      resetToken: z.string().min(1),
    }),
  },

  forgotPassword: {
    body: z.object({
      email: z.string().email(),
    }),
  },

  resetPassword: {
    body: z.object({
      token: z.string().min(1),
      newPassword: passwordSchema,
    }),
  },

  changePassword: {
    body: z.object({
      oldPassword: z.string().min(1),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1).optional(),
    }),
  },

  updateAccount: {
    body: z.object({
      fullName: z.string().min(1).max(50).trim().optional(),
      email: z.string().email().optional(),
    }).refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
  },

  updateProfile: {
    body: z.object({
      bio: z.string().max(500).optional(),
      location: z.string().max(100).optional(),
      website: z.string().url().optional().or(z.literal("")),
      socialLinks: z.object({
        twitter: z.string().url().optional().or(z.literal("")),
        instagram: z.string().url().optional().or(z.literal("")),
        linkedin: z.string().url().optional().or(z.literal("")),
        github: z.string().url().optional().or(z.literal("")),
      }).optional(),
    }),
  },

  updatePrivacy: {
    body: z.object({
      isPrivate: z.boolean().optional(),
    }),
  },

  updateLanguage: {
    body: z.object({
      language: z.string().min(1),
    }),
  },

  updateContentDefaults: {
    body: z.object({
      defaultVisibility: z.enum(["public", "unlisted", "private"]).optional(),
      defaultCategory: z.string().optional(),
    }).refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
  },

  sendChangePasswordOTP: {
    body: z.object({
      email: z.string().email().optional(),
      mobile: mobileSchema.optional(),
      channel: channelEnum,
    }).refine((data) => data.email || data.mobile, {
      message: "Either email or mobile is required",
    }),
  },

  verifyAndChangePassword: {
    body: z.object({
      oldPassword: z.string().min(1),
      newPassword: passwordSchema,
      otp: z.string().length(6),
      channel: channelEnum,
    }),
  },

  sendDeleteAccountOTP: {
    body: z.object({
      password: z.string().min(1),
      channel: channelEnum,
    }),
  },

  verifyAndDeleteAccount: {
    body: z.object({
      password: z.string().min(1),
      otp: z.string().length(6),
      channel: channelEnum,
    }),
  },

  sendForgotPasswordChangeOTP: {
    body: z.object({
      identifier: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile: mobileSchema.optional(),
      channel: channelEnum,
    }).refine(identifierRefine, { message: identifierMessage }),
  },

  verifyAndResetPasswordViaOTP: {
    body: z.object({
      identifier: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile: mobileSchema.optional(),
      newPassword: passwordSchema,
      otp: z.string().length(6),
      channel: channelEnum,
    }).refine(identifierRefine, { message: identifierMessage }),
  },

  blockUser: {
    params: z.object({
      userId: mongoId,
    }),
  },

  muteUser: {
    params: z.object({
      userId: mongoId,
    }),
  },

  addToWatchLater: {
    params: z.object({
      videoId: mongoId,
    }),
  },

  searchUsers: {
    query: pagination.extend({
      query: z.string().min(1),
    }),
  },

  getUserChannelProfile: {
    params: z.object({
      username: z.string().min(1).max(50),
    }),
  },

  getWatchHistory: {
    query: pagination,
  },

  addSearchHistory: {
    body: z.object({
      query: z.string().min(1).max(100),
    }),
  },

  getUserProfile: {
    params: z.object({
      username: z.string().min(1).max(50),
    }),
  },

  sendForgotPasswordOTP: {
    body: z.object({
      identifier: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile: mobileSchema.optional(),
    }).refine(identifierRefine, { message: identifierMessage }),
  },

  verifyResetOTP: {
    body: z.object({
      identifier: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile: mobileSchema.optional(),
      otp: z.string().length(6),
    }).refine(identifierRefine, { message: identifierMessage }),
  },

  resetPasswordWithOTP: {
    body: z.object({
      resetToken: z.string().min(1),
      newPassword: passwordSchema,
    }),
  },

  sendLoginOTP: {
    body: z.object({
      identifier: z.string().min(1),
    }),
  },

  verifyLoginOTP: {
    body: z.object({
      identifier: z.string().min(1),
      otp: z.string().length(6),
    }),
  },

  sendRegistrationOTP: {
    body: z.object({
      email: z.string().email(),
      mobile: mobileSchema,
    }),
  },

  verifyRegistrationOTP: {
    body: z.object({
      identifier: z.string().min(1),
      otp: z.string().length(6),
    }),
  },

  registerUnified: {
    body: z.object({
      email: z.string().email(),
      mobile: mobileSchema,
      fullName: z.string().min(1).max(50).trim(),
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
      password: passwordSchema,
      emailOtp: z.string().length(6).optional(),
      mobileOtp: z.string().length(6).optional(),
    }),
  },

  mobileRegister: {
    body: z.object({
      mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/),
      otp: z.string().length(6),
      fullName: z.string().min(1).max(50).trim(),
      username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
      password: z.string().min(8).max(16)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/),
    }),
  },

  mobileSendLoginOTP: {
    body: z.object({
      mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/),
    }),
  },

  mobileVerifyLoginOTP: {
    body: z.object({
      mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/),
      otp: z.string().length(6),
    }),
  },

  mobileSendRegistrationOTP: {
    body: z.object({
      mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/),
    }),
  },

  mobileVerifyRegistrationOTP: {
    body: z.object({
      mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/),
      otp: z.string().length(6),
    }),
  },
};

export const videoSchemas = {
  publishVideo: {
    body: z.object({
      title: z.string().min(1).max(100).trim(),
      description: z.string().min(1).max(5000).trim(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      category: z.string().max(50).optional(),
      chapters: z.union([z.string(), z.array(z.object({
        title: z.string().min(1).max(100),
        startTime: z.number().nonnegative(),
      }))]).optional(),
      scheduledAt: z.string().datetime().optional(),
    }),
  },

  updateVideo: {
    params: z.object({
      videoId: mongoId,
    }),
    body: z.object({
      title: z.string().min(1).max(100).trim().optional(),
      description: z.string().max(5000).trim().optional(),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      category: z.string().max(50).optional(),
      visibility: z.enum(["public", "unlisted", "private"]).optional(),
    }).refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
  },

  getVideoById: {
    params: z.object({
      videoId: mongoId,
    }),
  },

  deleteVideo: {
    params: z.object({
      videoId: mongoId,
    }),
  },

  getAllVideos: {
    query: pagination.extend({
      search: z.string().optional(),
      category: z.string().optional(),
      sortBy: z.enum(["views", "createdAt", "likes", "trending"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
  },

  getChannelVideos: {
    params: z.object({
      username: z.string().min(1).max(50),
    }),
    query: pagination.extend({
      sortBy: z.enum(["views", "createdAt", "likes"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
  },

  getTrendingVideos: {
    query: pagination.extend({
      category: z.string().optional(),
    }),
  },

  getVideoCategories: {},

  getShortsFeed: {
    query: pagination.extend({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(30).default(20),
    }),
  },

  searchChannels: {
    query: pagination.extend({
      q: z.string().min(1),
    }),
  },

  getChannelAbout: {
    params: z.object({
      username: z.string().min(1).max(50),
    }),
  },

  bulkDeleteVideos: {
    body: z.object({
      videoIds: z.array(mongoId).min(1).max(50),
    }),
  },

  bulkPublishVideos: {
    body: z.object({
      videoIds: z.array(mongoId).min(1).max(50),
      isPublished: z.boolean().optional(),
    }),
  },

  updateVideoTags: {
    params: z.object({
      videoId: mongoId,
    }),
    body: z.object({
      tags: z.array(z.string().min(1).max(30)).max(20),
    }),
  },

  updateVideoChapters: {
    params: z.object({
      videoId: mongoId,
    }),
    body: z.object({
      chapters: z.array(z.object({
        title: z.string().min(1).max(100),
        startTime: z.number().nonnegative(),
      })).max(50),
    }),
  },

  getRelatedVideos: {
    params: z.object({
      videoId: mongoId,
    }),
    query: z.object({
      limit: z.coerce.number().int().positive().max(30).default(12),
    }),
  },

  getTranscodingStatus: {
    params: z.object({
      videoId: mongoId,
    }),
    query: z.object({
      limit: z.coerce.number().int().positive().max(50).optional(),
    }),
  },

  togglePublishStatus: {
    params: z.object({
      videoId: mongoId,
    }),
  },

  publishScheduledVideos: {},
};

export const commentSchemas = {
  getVideoComments: {
    params: z.object({
      videoId: mongoId,
    }),
    query: pagination.extend({
      sortBy: z.enum(["newest", "oldest", "top"]).default("newest"),
    }),
  },

  addComment: {
    params: z.object({
      videoId: mongoId,
    }),
    body: z.object({
      content: z.string().min(1).max(2000).trim(),
    }),
  },

  updateComment: {
    params: z.object({
      commentId: mongoId,
    }),
    body: z.object({
      content: z.string().min(1).max(2000).trim(),
    }),
  },

  deleteComment: {
    params: z.object({
      commentId: mongoId,
    }),
  },

  addReply: {
    params: z.object({
      commentId: mongoId,
    }),
    body: z.object({
      content: z.string().min(1).max(2000).trim(),
    }),
  },

  getReplies: {
    params: z.object({
      commentId: mongoId,
    }),
    query: pagination,
  },

  pinComment: {
    params: z.object({
      commentId: mongoId,
    }),
  },
};

export const playlistSchemas = {
  createPlaylist: {
    body: z.object({
      name: z.string().min(1).max(100).trim(),
      description: z.string().max(500).trim().optional(),
      visibility: z.enum(["public", "unlisted", "private"]).default("public"),
    }),
  },

  updatePlaylist: {
    params: z.object({
      playlistId: mongoId,
    }),
    body: z.object({
      name: z.string().min(1).max(100).trim().optional(),
      description: z.string().max(500).trim().optional(),
      visibility: z.enum(["public", "unlisted", "private"]).optional(),
    }).refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
  },

  getPlaylistById: {
    params: z.object({
      playlistId: mongoId,
    }),
  },

  deletePlaylist: {
    params: z.object({
      playlistId: mongoId,
    }),
  },

  reorderPlaylist: {
    params: z.object({
      playlistId: mongoId,
    }),
    body: z.object({
      videoIds: z.array(mongoId).min(1),
    }),
  },

  addVideoToPlaylist: {
    params: z.object({
      videoId: mongoId,
      playlistId: mongoId,
    }),
  },

  removeVideoFromPlaylist: {
    params: z.object({
      videoId: mongoId,
      playlistId: mongoId,
    }),
  },

  getChannelPlaylists: {
    params: z.object({
      username: z.string().min(1).max(50),
    }),
    query: pagination,
  },

  getPublicPlaylists: {
    query: pagination,
  },

  getUserPlaylists: {
    params: z.object({
      userId: mongoId,
    }),
    query: pagination,
  },
};

export const subscriptionSchemas = {
  toggleSubscription: {
    params: z.object({
      channelId: mongoId,
    }),
  },

  getUserChannelSubscribers: {
    params: z.object({
      channelId: mongoId,
    }),
    query: pagination,
  },

  getChannelNotificationStatus: {
    params: z.object({
      channelId: mongoId,
    }),
  },

  toggleChannelNotifications: {
    params: z.object({
      channelId: mongoId,
    }),
  },

  getSubscribedChannels: {
    params: z.object({
      subscriberId: mongoId,
    }),
    query: pagination,
  },
};

export const likeSchemas = {
  toggleVideoLike: {
    params: z.object({
      videoId: mongoId,
    }),
  },

  toggleCommentLike: {
    params: z.object({
      commentId: mongoId,
    }),
  },

  getLikedVideos: {
    query: pagination,
  },
};

export const notificationSchemas = {
  getNotifications: {
    query: pagination.extend({
      unreadOnly: z.coerce.boolean().optional(),
    }),
  },

  markAsRead: {
    params: z.object({
      notificationId: mongoId,
    }),
  },

  markAllAsRead: {},

  deleteNotification: {
    params: z.object({
      notificationId: mongoId,
    }),
  },
};

export const communityPostSchemas = {
  getAllCommunityPosts: {
    query: pagination.extend({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(30).default(20),
    }),
  },

  getChannelPosts: {
    params: z.object({
      username: z.string().min(1).max(50),
    }),
    query: pagination,
  },

  createCommunityPost: {
    body: z.object({
      content: z.string().min(1).max(5000).trim(),
      pollQuestion: z.string().max(280).optional(),
      pollOptions: z.array(z.string().min(1).max(140)).min(2).max(6).optional(),
      pollEndsAt: z.string().datetime().optional(),
    }),
  },

  updateCommunityPost: {
    params: z.object({
      postId: mongoId,
    }),
    body: z.object({
      content: z.string().min(1).max(5000).trim(),
    }),
  },

  deleteCommunityPost: {
    params: z.object({
      postId: mongoId,
    }),
  },

  togglePostLike: {
    params: z.object({
      postId: mongoId,
    }),
  },
};

export const dashboardSchemas = {
  getChannelStats: {},
  getChannelVideos: { query: pagination },
  getChannelAnalytics: { query: z.object({ period: z.enum(["7d", "30d", "90d"]).default("7d") }) },
  getSubscriberGrowth: { query: z.object({ days: z.coerce.number().int().positive().max(365).default(30) }) },
  getVideoDetailedStats: { params: z.object({ videoId: mongoId }) },
};

export const adminSchemas = {
  getPlatformStats: {},
  getAllUsers: { query: pagination.extend({ query: z.string().optional(), role: z.enum(["user", "admin"]).optional() }) },
  updateUserRole: {
    params: z.object({ userId: mongoId }),
    body: z.object({ role: z.enum(["user", "admin"]) }),
  },
  banUser: { params: z.object({ userId: mongoId }) },
  adminDeleteVideo: { params: z.object({ videoId: mongoId }) },
  getRecentActivity: { query: pagination },
  getAllReports: { query: pagination },
};

export const reportSchemas = {
  createReport: {
    body: z.object({
      targetType: z.enum(["video", "comment", "user", "playlist", "communityPost"]),
      target: mongoId,
      reason: z.enum(["spam", "inappropriate", "copyright", "harassment", "misinformation", "other"]),
      description: z.string().max(1000).optional(),
    }),
  },

  getMyReports: { query: pagination },
};

export const pollSchemas = {
  voteOnPoll: {
    params: z.object({ pollId: mongoId }),
    body: z.object({ optionIndex: z.number().int().min(0) }),
  },
};

export const sessionSchemas = {
  getActiveSessions: {},
  revokeSession: { params: z.object({ sessionId: mongoId }) },
  revokeAllSessions: {},
};

export const otpSchemas = {
  sendOtp: { body: z.object({ identifier: z.string().min(1) }) },
  verifyOtp: { body: z.object({ identifier: z.string().min(1), otp: z.string().length(6) }) },
  resendOtp: { body: z.object({ identifier: z.string().min(1) }) },
  getOtpUsage: { query: z.object({ identifier: z.string().optional() }) },
};

export const oauthSchemas = {
  googleCallback: { query: z.object({ code: z.string(), state: z.string().optional() }) },
  githubCallback: { query: z.object({ code: z.string(), state: z.string().optional() }) },
  facebookCallback: { query: z.object({ code: z.string(), state: z.string().optional() }) },
  discordCallback: { query: z.object({ code: z.string(), state: z.string().optional() }) },
};

export const sseSchemas = {
  streamNotifications: { query: z.object({ token: z.string().optional() }) },
};

export const searchSchemas = {
  searchUsers: { query: pagination.extend({ query: z.string().min(1) }) },
  searchChannels: { query: pagination.extend({ query: z.string().min(1) }) },
};

export const settingsSchemas = {
  updateNotificationPrefs: {
    body: z.object({
      likes: z.boolean().optional(),
      comments: z.boolean().optional(),
      replies: z.boolean().optional(),
      subscriptions: z.boolean().optional(),
      mentions: z.boolean().optional(),
    }),
  },
};

export const healthSchemas = {
  live: {},
  ready: {},
};

export const metricsSchemas = {
  metrics: {},
};