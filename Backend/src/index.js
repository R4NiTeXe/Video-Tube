import 'dotenv/config'
import http from "http";
import connectDB from "./db/index.js";
import { app } from './app.js';
import { initWebSocket } from './utils/websocket.js';
import logger from './utils/logger.js';

const server = http.createServer(app);

initWebSocket(server);

connectDB()
.then(() => {
    server.listen(process.env.PORT || 8000, () => {
        logger.info(`Server is running at port : ${process.env.PORT || 8000}`);
    })
})
.catch((err) => {
    logger.error("MONGO db connection failed !!!", { error: err.message });
})
