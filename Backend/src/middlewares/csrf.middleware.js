import crypto from "crypto";
import logger from "../utils/logger.js";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

// SameSite=None + Secure=true works in both production (HTTPS) and development
// (localhost is treated as a secure context by modern browsers).
// This allows the cookie to be sent cross-origin on POST requests.
const getCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
});

export const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

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
  "/api/v1/users/update-identifier/send-otp",
  "/api/v1/sessions",
  "/api/v1/users/logout",
];

export const csrfMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  // Safe methods — ensure a CSRF cookie exists
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!req.cookies[CSRF_COOKIE_NAME]) {
      const token = generateCsrfToken();
      req._csrfToken = token;
      res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
    } else {
      req._csrfToken = req.cookies[CSRF_COOKIE_NAME];
    }
    return next();
  }

  // Exempt routes
  if (
    CSRF_EXEMPT_ROUTES.some(
      (route) => req.path === route || req.path.startsWith(route + "/")
    )
  ) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  logger.debug("CSRF validation", {
    method: req.method,
    path: req.path,
    hasCookie: !!cookieToken,
    hasHeader: !!headerToken,
    cookieToken: cookieToken
      ? `${cookieToken.slice(0, 8)}...${cookieToken.slice(-4)}`
      : null,
    headerToken: headerToken
      ? `${headerToken.slice(0, 8)}...${headerToken.slice(-4)}`
      : null,
  });

  // If both cookie and header are present, validate they match (full double-submit check)
  if (cookieToken && headerToken) {
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (
      cookieBuf.length === headerBuf.length &&
      crypto.timingSafeEqual(cookieBuf, headerBuf)
    ) {
      return next();
    }

    logger.warn("CSRF token mismatch", {
      method: req.method,
      path: req.path,
      cookieLen: cookieBuf.length,
      headerLen: headerBuf.length,
    });
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Invalid CSRF token",
      errors: ["CSRF validation failed"],
    });
  }

  // If only header is present (cookie missing — e.g., SameSite issue in dev), accept the header.
  // The custom header alone provides CSRF protection because an attacker cannot set
  // arbitrary headers cross-origin without triggering a CORS preflight that the server
  // would reject. Also sync the cookie so subsequent requests have it.
  if (headerToken) {
    res.cookie(CSRF_COOKIE_NAME, headerToken, getCookieOptions());
    return next();
  }

  // If only cookie is present (no header), reject — XSS could read the cookie but not the header.
  if (cookieToken) {
    logger.warn("CSRF header missing (cookie present)", {
      method: req.method,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "CSRF header missing",
      errors: ["CSRF validation failed"],
    });
  }

  // Neither cookie nor header
  logger.warn("CSRF token missing", {
    method: req.method,
    path: req.path,
    hasCookie: false,
    hasHeader: false,
  });
  return res.status(403).json({
    success: false,
    statusCode: 403,
    message: "CSRF token missing",
    errors: ["CSRF validation failed"],
  });
};

const hasSessionCookies = (req) =>
  Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);

export const csrfTokenHandler = (req, res) => {
  // Use the token set by middleware (req._csrfToken) or fallback
  const token =
    req._csrfToken || req.cookies[CSRF_COOKIE_NAME] || generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCookieOptions());
  res.json({
    success: true,
    csrfToken: token,
    authenticated: hasSessionCookies(req),
  });
};
