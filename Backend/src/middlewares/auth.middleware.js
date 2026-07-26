import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { isTokenBlacklisted } from "../utils/redis.js";
import logger from "../utils/logger.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.accessToken;
    const tokenFromHeader = req.header("Authorization")?.replace("Bearer ", "");
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      logger.warn("verifyJWT: no token found", {
        path: req.path,
        hasCookie: !!tokenFromCookie,
        hasHeader: !!tokenFromHeader,
      });
      throw new ApiError(401, "Unauthorized request");
    }

    if (await isTokenBlacklisted(token)) {
      logger.warn("verifyJWT: token blacklisted", { path: req.path });
      throw new ApiError(401, "Token expired. Please log in again.");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      logger.warn("verifyJWT: user not found", { path: req.path });
      throw new ApiError(401, "Invalid access token");
    }

    if (user.banned) {
      logger.warn("verifyJWT: user banned", { userId: user._id, path: req.path });
      throw new ApiError(403, "Your account has been banned");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Invalid access token");
  }
});
