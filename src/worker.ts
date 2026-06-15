import "./instrument";
import "./modules/media/media.worker";
import { checkRedisConnection } from "./config/redis.config";
import {
    workerAbortController,
    mediaWorker,
} from "./modules/media/media.worker";
import logger from "./lib/logger";

const workerLogger = logger.child({ module: "worker" });

const start = async () => {
    try {
        await checkRedisConnection();
        workerLogger.info("Redis connected");
        workerLogger.info("Listening for jobs...");
    } catch (err) {
        workerLogger.error({ err }, "Redis unavailable");
        process.exit(1);
    }
};

start();

const shutdown = async () => {
    workerLogger.info("Shutting down");
    workerAbortController.abort();
    await mediaWorker.close();
    process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
