import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Session } from "../models/session.model.js";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

function parseUserAgent(ua) {
  if (!ua) return { deviceName: "Unknown Device", browser: "", os: "" };
  let device;
  let browser = "";
  let os = "";

  if (/windows/i.test(ua)) { os = "Windows"; }
  else if (/mac os/i.test(ua)) { os = "macOS"; }
  else if (/linux/i.test(ua)) { os = "Linux"; }
  else if (/android/i.test(ua)) { os = "Android"; }
  else if (/iphone|ipad/i.test(ua)) { os = "iOS"; }

  if (/chrome/i.test(ua) && !/edge|opr|edg/i.test(ua)) { browser = "Chrome"; }
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) { browser = "Safari"; }
  else if (/firefox/i.test(ua)) { browser = "Firefox"; }
  else if (/edge|edg/i.test(ua)) { browser = "Edge"; }
  else if (/opr|opera/i.test(ua)) { browser = "Opera"; }

  if (/mobile|android/i.test(ua) && /phone/i.test(ua)) {
    device = `${browser || "Mobile"} on ${os || "Phone"}`;
  } else if (/iphone/i.test(ua)) {
    device = `Safari on iPhone`;
  } else if (/ipad/i.test(ua)) {
    device = `Safari on iPad`;
  } else if (/android/i.test(ua)) {
    device = `${browser || "Browser"} on Android`;
  } else {
    device = `${browser || "Browser"} on ${os || "Desktop"}`;
  }

  return { deviceName: device, browser, os };
}

export const createSession = async (userId, refreshToken, req) => {
  try {
    const ua = req?.headers?.["user-agent"] || "";
    const ip = req?.ip || req?.socket?.remoteAddress || "Unknown";
    const { deviceName } = parseUserAgent(ua);

    let location = "Unknown Location";
    if (ip && ip !== "::1" && ip !== "127.0.0.1" && ip !== "Unknown") {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const resp = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`, { signal: controller.signal });
        clearTimeout(timeout);
        if (resp.ok) {
          const geo = await resp.json();
          if (geo.city) location = [geo.city, geo.regionName, geo.country].filter(Boolean).join(", ");
        }
      } catch {
        // GeoIP lookup failed, keep "Unknown Location"
      }
    }

    await Session.create({
      user: userId,
      refreshToken,
      userAgent: ua,
      ipAddress: ip,
      deviceName,
      location,
      lastActiveAt: new Date(),
      isActive: true,
    });
  } catch (error) {
    logger.error("Failed to create session:", { error: error.message });
  }
};

export const updateSessionActivity = async (refreshToken) => {
  try {
    await Session.findOneAndUpdate(
      { refreshToken, isActive: true },
      { lastActiveAt: new Date() }
    );
  } catch (error) {
    logger.error("Failed to update session activity:", { error: error.message });
  }
};

export const deactivateSession = async (refreshToken) => {
  try {
    await Session.findOneAndUpdate(
      { refreshToken },
      { isActive: false }
    );
  } catch (error) {
    logger.error("Failed to deactivate session:", { error: error.message });
  }
};

export const getActiveSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let decodedToken;
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (incomingRefreshToken) {
      decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    }
  } catch (err) {
    logger.warn("Failed to decode refresh token", { error: err.message });
  }

  const sessions = await Session.find({
    user: userId,
    isActive: true,
  })
    .sort({ lastActiveAt: -1 })
    .select("-userAgent -__v")
    .lean();

  const enriched = sessions.map(({ refreshToken, ...rest }) => ({
    ...rest,
    isCurrent: decodedToken ? refreshToken === req.cookies?.refreshToken : false,
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Active sessions fetched successfully"));
});

export const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  const session = await Session.findOne({
    _id: sessionId,
    user: userId,
  });

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  const incomingRefreshToken = req.cookies?.refreshToken;
  if (session.refreshToken === incomingRefreshToken) {
    throw new ApiError(400, "Cannot revoke your current session. Use logout instead.");
  }

  session.isActive = false;
  await session.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Session revoked successfully"));
});

export const revokeAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const incomingRefreshToken = req.cookies?.refreshToken;

  const result = await Session.updateMany(
    {
      user: userId,
      isActive: true,
      ...(incomingRefreshToken ? { refreshToken: { $ne: incomingRefreshToken } } : {}),
    },
    { isActive: false }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { revokedCount: result.modifiedCount }, "All other sessions revoked successfully"));
});
