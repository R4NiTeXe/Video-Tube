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
    const uri = `${process.env.MONGODB_URI}/${DB_NAME}`;
    const maxAttempts = parseInt(process.env.MONGODB_CONNECT_ATTEMPTS || "5", 10);
    const baseDelayMs = parseInt(process.env.MONGODB_RETRY_BASE_MS || "1000", 10);

    const options = {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || "100", 10),
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || "5", 10),
        socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || "45000", 10),
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || "10000", 10),
        autoIndex: process.env.NODE_ENV === "production" ? false : true,
    };

    let attempt = 0;
    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            logger.info(`Attempting MongoDB connection (attempt ${attempt}/${maxAttempts})`);
            const connectionInstance = await mongoose.connect(uri, options);
            logger.info("MongoDB connection successful", { host: connectionInstance.connection.host });

            mongoose.connection.on("disconnected", () => {
              logger.warn("MongoDB disconnected");
            });
            mongoose.connection.on("reconnected", () => {
              logger.info("MongoDB reconnected");
            });
            mongoose.connection.on("error", (err) => {
              logger.error("MongoDB connection error", { error: err.message });
            });

            return connectionInstance;
        } catch (error) {
            logger.warn(`MongoDB connection attempt ${attempt} failed`, { error: error.message });
            if (attempt >= maxAttempts) {
                logger.error("MONGODB connection FAILED after retries", { error: error.message });
                throw error;
            }
            const wait = baseDelayMs * Math.pow(2, attempt - 1);
            logger.info(`Retrying MongoDB connection in ${wait}ms`);
            await new Promise((r) => setTimeout(r, wait));
        }
    }
}

export default connectDB;
