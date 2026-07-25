import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

const getCookieOptions = () => ({
  httpOnly: false, // Must be readable by JavaScript
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

export const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

// Routes that are exempt from CSRF validation.
// These are either public unauthenticated flows (login, register, forgot-password)
// or authenticated routes where the action itself provides side-effect protection
// (e.g. sending an OTP — the OTP verification is the real auth gate).
const CSRF_EXEMPT_ROUTES = [
  "/api/v1/users/login",
  "/api/v1/users/register",
  "/api/v1/users/send-forgot-otp",
  "/api/v1/users/verify-forgot-otp",
  "/api/v1/users/reset-password-token",
  "/api/v1/users/refresh-token",
  "/api/v1/users/send-registration-otp",
  "/api/v1/users/verify-registration-otp",
  "/api/v1/users/skip-and-login",
  "/api/v1/users/send-login-otp",
  "/api/v1/users/login-with-otp",
  // Identifier update OTP flows — already gated by verifyJWT + OTP verification
  "/api/v1/users/update-identifier/send-otp",
];

export const csrfMiddleware = (req, res, next) => {
  // Skip CSRF in test environment
  if (process.env.NODE_ENV === "test") {
    return next();
  }
  // Skip CSRF for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // Ensure CSRF token cookie exists for future requests
    if (!req.cookies[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
    }
    return next();
  }

  // Skip CSRF for public exempt routes
  if (CSRF_EXEMPT_ROUTES.some((route) => req.path === route || req.originalUrl.split("?")[0] === route)) {
    return next();
  }

  // For mutating methods, validate CSRF token
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "CSRF token missing",
      errors: ["CSRF validation failed"],
    });
  }

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Invalid CSRF token",
      errors: ["CSRF validation failed"],
    });
  }

  next();
};

export const csrfTokenHandler = (req, res) => {
  const token = req.cookies[CSRF_COOKIE_NAME] || generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
  res.json({ success: true, csrfToken: token });
};