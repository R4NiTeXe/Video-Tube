const dotenv = require("dotenv");
dotenv.config();
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
cloudinary.api
  .create_streaming_profile("sp_custom", {
    representations: [
      { transformation: { crop: "scale", width: 1920, bit_rate: "5000k" } },
      { transformation: { crop: "scale", width: 1280, bit_rate: "2500k" } },
      { transformation: { crop: "scale", width: 854, bit_rate: "1200k" } },
      { transformation: { crop: "scale", width: 640, bit_rate: "800k" } },
      { transformation: { crop: "scale", width: 426, bit_rate: "400k" } },
    ],
  })
  .then((res) => console.log("Profile created:", res))
  .catch((err) => console.error("Error:", err.message));
