import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Session } from "../models/session.model.js";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import { UAParser } from "ua-parser-js";

// Simple in-memory GeoIP cache: ip -> { location, expiresAt }
const geoIpCache = new Map();
const GEOIP_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function parseUserAgent(ua) {
  if (!ua) return { deviceName: "Unknown Device", browser: "", os: "", browserVersion: "", deviceType: "desktop", deviceModel: "" };
  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  const browserName = browser.name || "Browser";
  const browserVersion = browser.version || "";
  const osName = os.name || "OS";
  const deviceType = device.type || "desktop";
  const deviceModel = device.model || "";
  const deviceVendor = device.vendor || "";

  let deviceName;
  if (deviceType === "mobile" || deviceType === "tablet") {
    deviceName = `${browserName} on ${deviceModel ? `${deviceVendor ? `${deviceVendor} ` : ""}${deviceModel}` : osName}`;
  } else {
    deviceName = `${browserName} on ${osName}`;
  }

  return { deviceName, browser: browserName, browserVersion, os: osName, deviceType, deviceModel };
}

const getLocationFromIp = async (ip) => {
  const cached = geoIpCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.location;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const geo = await resp.json();
      const location = geo.city ? [geo.city, geo.regionName, geo.country].filter(Boolean).join(", ") : "Unknown Location";
      geoIpCache.set(ip, { location, expiresAt: Date.now() + GEOIP_CACHE_TTL });
      return location;
    }
  } catch {
    // GeoIP lookup failed
  }
  return "Unknown Location";
};

export const createSession = async (userId, refreshToken, req) => {
  try {
    const ua = req?.headers?.["user-agent"] || "";
    const ip = req?.ip || req?.socket?.remoteAddress || "Unknown";
    const { deviceName } = parseUserAgent(ua);

    let location = "Unknown Location";
    if (ip && ip !== "::1" && ip !== "127.0.0.1" && ip !== "Unknown") {
      location = await getLocationFromIp(ip);
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
  logger.info("getActiveSessions called", { userId: userId.toString(), path: req.path });

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

  logger.info("getActiveSessions result", { count: sessions.length });

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
