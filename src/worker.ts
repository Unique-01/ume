import "./instrument";
import "./modules/media/media.worker";
import { checkRedisConnection } from "./config/redis.config";
import {
    workerAbortController,
    mediaWorker,
} from "./modules/media/media.worker";

const start = async () => {
    try {
        await checkRedisConnection();
        console.log("[worker] Redis connected");
        console.log("[worker] Listening for jobs...");
    } catch (err) {
        console.error("[worker] Redis unavailable:", err);
        process.exit(1);
    }
};

start();

const shutdown = async () => {
    console.log("[worker] shutting down");
    workerAbortController.abort();
    await mediaWorker.close();
    process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
