import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../utils/redis.js";
import logger from "../utils/logger.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.accessToken;
    const tokenFromHeader = req
      .header("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      logger.warn("verifyJWT: no token found", {
        path: req.path,
        hasCookie: !!tokenFromCookie,
        hasHeader: !!tokenFromHeader,
      });
      throw new ApiError(401, "Unauthorized request");
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      logger.error("verifyJWT: ACCESS_TOKEN_SECRET not configured");
      throw new ApiError(500, "Internal server error");
    }

    if (await isTokenBlacklisted(token)) {
      logger.warn("verifyJWT: token blacklisted", { path: req.path });
      throw new ApiError(401, "Token expired. Please log in again.");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtError) {
      logger.warn("verifyJWT: token verification failed", {
        path: req.path,
        error: jwtError.message,
      });
      throw new ApiError(401, "Invalid access token");
    }

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      logger.warn("verifyJWT: user not found", { path: req.path });
      throw new ApiError(401, "Invalid access token");
    }

    if (user.banned) {
      logger.warn("verifyJWT: user banned", {
        userId: user._id,
        path: req.path,
      });
      throw new ApiError(403, "Your account has been banned");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error("verifyJWT: unexpected error", { error: error.message });
    throw new ApiError(500, "Internal server error");
  }
});

// Optional JWT verification — sets req.user if valid token is present,
// but does NOT throw on failure. Use for public routes that benefit from
// knowing the current user (e.g., channel pages, video pages).
export const optionalVerifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken ||
      req.header("Authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) return next();

    if (!process.env.ACCESS_TOKEN_SECRET) return next();

    if (await isTokenBlacklisted(token)) return next();

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return next();
    }

    const user = await User.findById(decodedToken?._id)
      .select("-password -refreshToken");

    if (user && !user.banned) {
      req.user = user;
    }
  } catch {
    // Silently continue without user
  }
  next();
});
