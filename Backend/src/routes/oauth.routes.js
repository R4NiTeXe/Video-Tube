import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { createSession } from "../controllers/session.controller.js";
import logger from "../utils/logger.js";

const router = Router();
const FE = () => process.env.FRONTEND_URL || "http://localhost:3000";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ _id: userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d",
  });
  const refreshToken = jwt.sign({ _id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d",
  });
  return { accessToken, refreshToken };
};

const handleOAuthCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${FE()}/login?error=auth_failed`);
    }

    const { accessToken, refreshToken } = generateTokens(req.user._id);
    await createSession(req.user._id, refreshToken, req);

    const isProduction = process.env.NODE_ENV === "production";
    const accessExpiry = 24 * 60 * 60 * 1000;
    const refreshExpiry = 10 * 24 * 60 * 60 * 1000;

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: accessExpiry,
      path: "/",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: refreshExpiry,
      path: "/",
    });

    const isNew = req.user._isNew ? "true" : "false";
    res.redirect(`${FE().replace(/\/+$/, '')}/auth/callback?isNew=${isNew}`);
  } catch (error) {
    logger.error("OAuth callback error:", { error: error.message });
    res.redirect(`${FE()}/login?error=auth_failed`);
  }
};

const oauthCallback = (provider) => (req, res, next) => {
  passport.authenticate(provider, { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(`${FE()}/login?error=auth_failed`);
    }

    const stateToken = req.query?.state;
    const savedState = req.cookies?.oauth_state;
    if (!stateToken || !savedState || stateToken !== savedState) {
      return res.redirect(`${FE()}/login?error=csrf_failed`);
    }
    res.clearCookie("oauth_state");

    req.user = user;
    handleOAuthCallback(req, res);
  })(req, res, next);
};

const oauthRedirect = (provider, scope) => (req, res, next) => {
  const state = crypto.randomBytes(32).toString("hex");
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  passport.authenticate(provider, { scope, session: false, state })(req, res, next);
};

// Google
router.get("/google", oauthRedirect("google", ["profile", "email"]));
router.get("/google/callback", oauthCallback("google"));

// GitHub
router.get("/github", oauthRedirect("github", ["user:email"]));
router.get("/github/callback", oauthCallback("github"));

// Facebook
router.get("/facebook", oauthRedirect("facebook", ["public_profile"]));
router.get("/facebook/callback", oauthCallback("facebook"));

// Discord
router.get("/discord", oauthRedirect("discord", ["identify", "email"]));
router.get("/discord/callback", oauthCallback("discord"));

export default router;
