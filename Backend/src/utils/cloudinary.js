import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import logger from "./logger.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath); // Delete the local file after successful upload

    // console.log("File is uploaded on cloudinary", response.url);
    return response;
  } catch (error) {
    logger.error("Error uploading to cloudinary", { error: error.message });
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
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

export { uploadOnCloudinary, deleteFromCloudinary };
