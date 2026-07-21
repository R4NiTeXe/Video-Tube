import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import logger from "./logger.js";

const isTest = process.env.NODE_ENV === "test";

const CLOUDINARY_TIMEOUT = 30000;

if (!isTest) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    timeout: CLOUDINARY_TIMEOUT,
  });
}

const uploadOnCloudinary = async (localFilePath) => {
  if (isTest) {
    return { 
      secure_url: "http://test.cloudinary.com/test.jpg", 
      public_id: "test_public_id",
      url: "http://test.cloudinary.com/test.jpg",
      duration: 300
    };
  }
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    await fs.promises.unlink(localFilePath);

    return response;
  } catch (error) {
    logger.error("Error uploading to cloudinary", { error: error.message });
    if (fs.existsSync(localFilePath)) {
      await fs.promises.unlink(localFilePath);
    }
    return null;
  }
};

const generateHlsManifest = async (publicId) => {
  if (isTest) return "http://test.cloudinary.com/test.m3u8";
  try {
    if (!publicId) return null;

    const result = await cloudinary.api.update(publicId, {
      resource_type: "video",
      type: "upload",
      raw_transformation: "sp_auto",
    });

    const hlsUrl = cloudinary.url(publicId, {
      resource_type: "video",
      format: "m3u8",
      streaming_profile: "auto",
      transformation: [{ flags: "streaming_attachment" }],
    });

    return hlsUrl;
  } catch (error) {
    logger.error("Error generating HLS manifest", { error: error.message });
    return null;
  }
};

const resolutions = [
  { resolution: "144p", width: 256, bitrate: 200 },
  { resolution: "240p", width: 426, bitrate: 400 },
  { resolution: "360p", width: 640, bitrate: 800 },
  { resolution: "480p", width: 854, bitrate: 1200 },
  { resolution: "720p", width: 1280, bitrate: 2500 },
  { resolution: "1080p", width: 1920, bitrate: 5000 },
];

const generateVideoQualities = async (publicId) => {
  if (isTest) return [{ resolution: "720p", url: "http://test.cloudinary.com/test.mp4", bitrate: 2500 }];

  const qualities = [];

  for (const res of resolutions) {
    try {
      const url = cloudinary.url(publicId, {
        resource_type: "video",
        transformation: [
          { width: res.width, crop: "scale", quality: "auto" },
        ],
      });
      qualities.push({
        resolution: res.resolution,
        url,
        bitrate: res.bitrate,
      });
    } catch (error) {
      logger.error(`Error generating quality ${res.resolution}`, { error: error.message });
    }
  }

  return qualities;
};

const getPublicIdFromCloudinaryUrl = (cloudinaryUrl) => {
  try {
    const url = new URL(cloudinaryUrl);
    const uploadIndex = url.pathname
      .split("/")
      .findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      return null;
    }

    const publicIdParts = url.pathname
      .split("/")
      .slice(uploadIndex + 1)
      .filter((part) => !/^v\d+$/.test(part));
    const publicIdWithExtension = publicIdParts.join("/");

    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

const deleteFromCloudinary = async (publicIdOrUrl, resourceType = "image") => {
  try {
    if (!publicIdOrUrl || typeof publicIdOrUrl !== "string") return null;

    const publicId = publicIdOrUrl.startsWith("http")
      ? getPublicIdFromCloudinaryUrl(publicIdOrUrl)
      : publicIdOrUrl;

    if (!publicId) return null;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    logger.error("Error deleting from cloudinary", { error: error.message });
    return null;
  }
};

const checkCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    return { connected: result.status === "ok", status: result.status };
  } catch (error) {
    logger.error("Cloudinary connection check failed", { error: error.message });
    return { connected: false, status: error.message };
  }
};

export {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateHlsManifest,
  generateVideoQualities,
  getPublicIdFromCloudinaryUrl,
  checkCloudinaryConnection,
};
