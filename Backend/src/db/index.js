import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dns from "dns";
import logger from "../utils/logger.js";

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        logger.info("Connection Successful!", { host: connectionInstance.connection.host });
    } catch (error) {
        logger.error("MONGODB connection FAILED", { error: error.message });
        process.exit(1);
    }
}

export default connectDB;
