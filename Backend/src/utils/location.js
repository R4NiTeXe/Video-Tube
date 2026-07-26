import { UAParser } from "ua-parser-js";
import logger from "./logger.js";

const parseUserAgent = (userAgent) => {
  if (!userAgent) return "Unknown Device";
  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    let browserName = browser.name || null;
    const browserMajor = (browser.version || "").split(".")[0] || "";
    let osName = os.name || null;
    const osMajor = (os.version || "").split(".")[0] || "";
    const deviceType = device.type || "desktop";
    const deviceModel = device.model || "";

    if (!browserName && !osName) return "Unknown Device";

    if (browserName?.startsWith("Mobile ")) browserName = browserName.slice(7);

    const browserStr = browserMajor ? `${browserName} ${browserMajor}` : browserName || "Browser";

    let osStr = osName || "OS";
    if (osName === "macOS") osStr = "macOS";
    else if (osName === "Windows" && osMajor) osStr = `${osName} ${osMajor}`;
    else if (osMajor) osStr = `${osName} ${osMajor}`;

    if (deviceType === "mobile" || deviceType === "tablet") {
      if (deviceModel) {
        return `${browserStr} • ${deviceModel}`;
      }
      return `${browserStr} • ${osStr}`;
    }

    return `${browserStr} • ${osStr}`;
  } catch {
    return "Unknown Device";
  }
};

/**
 * Fetches approximate location data using IP-API.
 */
export const getLocationInfo = async (req) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(',')[0] || req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"] || "";
    const device = parseUserAgent(userAgent);
    
    // For local dev, IP might be ::1 or 127.0.0.1
    if (ip === "::1" || ip === "127.0.0.1") {
      return {
        ip: "127.0.0.1",
        location: "Local Network",
        device,
        timezone: undefined,
      };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();

    let locationStr = "Unknown Location";
    let timezone = undefined;
    if (data && data.status === "success" && data.city && data.regionName && data.country) {
      locationStr = `${data.city}, ${data.regionName}, ${data.country}`;
      timezone = data.timezone || undefined;
    }

    return {
      ip,
      location: locationStr,
      device,
      timezone,
    };
  } catch (error) {
    logger.error("Failed to fetch location data: " + error.message);
    return {
      ip: req?.ip || "Unknown IP",
      location: "Unknown Location",
      device: parseUserAgent(req?.headers?.["user-agent"]),
      timezone: undefined,
    };
  }
};
