import 'dotenv/config'
import connectDB from "./db/index.js";
import { app } from './app.js';
import logger from './utils/logger.js';

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        logger.info(`Server is running at port : ${process.env.PORT || 8000}`);
    })
})
.catch((err) => {
    logger.error("MONGO db connection failed !!!", { error: err.message });
})
