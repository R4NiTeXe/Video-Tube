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