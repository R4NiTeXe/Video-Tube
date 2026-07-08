import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const router = Router();

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
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`);
    }

    const { accessToken, refreshToken } = generateTokens(req.user._id);

    await User.findByIdAndUpdate(req.user._id, { refreshToken });

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

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/login?error=auth_failed`);
  }
};

// Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=auth_failed", session: false }),
  handleOAuthCallback
);

// GitHub
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login?error=auth_failed", session: false }),
  handleOAuthCallback
);

// Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["public_profile"] }));
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login?error=auth_failed", session: false }),
  handleOAuthCallback
);

// Discord
router.get("/discord", passport.authenticate("discord", { scope: ["identify", "email"] }));
router.get(
  "/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login?error=auth_failed", session: false }),
  handleOAuthCallback
);

export default router;
