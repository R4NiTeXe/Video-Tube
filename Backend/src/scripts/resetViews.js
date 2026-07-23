import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const resetViews = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log("Connecting to DB:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;

    // Reset views in videos collection
    const videoResult = await db.collection("videos").updateMany({}, { $set: { views: 0 } });
    console.log(`Reset views for ${videoResult.modifiedCount} videos.`);

    // Reset watchHistory in users collection
    const userResult = await db.collection("users").updateMany({}, { $set: { watchHistory: [] } });
    console.log(`Cleared watch history for ${userResult.modifiedCount} users.`);

    console.log("Successfully removed fake views!");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting views:", error);
    process.exit(1);
  }
};

resetViews();
