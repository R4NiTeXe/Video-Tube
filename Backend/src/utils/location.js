import logger from "./logger.js";

/**
 * Extracts basic device information from the User-Agent string.
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) return "Unknown Device";
  
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "Mac OS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS") || userAgent.includes("iPhone")) os = "iOS";

  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";
  else if (userAgent.includes("Postman")) browser = "Postman";

  return `${os} - ${browser}`;
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
      };
    }

    // Call IP-API for physical location
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    let locationStr = "Unknown Location";
    if (data && data.status === "success") {
      locationStr = `${data.city}, ${data.regionName}, ${data.country}`;
    }

    return {
      ip,
      location: locationStr,
      device,
    };
  } catch (error) {
    logger.error("Failed to fetch location data: " + error.message);
    return {
      ip: req?.ip || "Unknown IP",
      location: "Unknown Location",
      device: parseUserAgent(req?.headers?.["user-agent"]),
    };
  }
};
