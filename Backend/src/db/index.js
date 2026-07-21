import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dns from "dns";
import logger from "../utils/logger.js";

dns.setDefaultResultOrder('ipv4first');

const DNS_SERVERS = process.env.DNS_SERVERS;
if (DNS_SERVERS) {
  try {
    dns.setServers(DNS_SERVERS.split(",").map((s) => s.trim()));
  } catch (err) {
    logger.warn("Failed to set custom DNS servers", { error: err.message });
  }
}

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`, {
            maxPoolSize: 100,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
        });
        logger.info("Connection Successful!", { host: connectionInstance.connection.host });

        mongoose.connection.on("disconnected", () => {
          logger.warn("MongoDB disconnected");
        });
        mongoose.connection.on("reconnected", () => {
          logger.info("MongoDB reconnected");
        });
        mongoose.connection.on("error", (err) => {
          logger.error("MongoDB connection error", { error: err.message });
        });
    } catch (error) {
        logger.error("MONGODB connection FAILED", { error: error.message });
        throw error;
    }
}

export default connectDB;
