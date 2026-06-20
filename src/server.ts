import "./instrument";
import app from "./app";
import fs from "fs";
import { PATHS } from "./paths";
import logger from "./lib/logger";
import { mediaQueueEvents } from "./modules/media/media.queue";

const serverLogger = logger.child({ module: "server" });

fs.mkdirSync(PATHS.uploads, { recursive: true });
fs.mkdirSync(PATHS.processed, { recursive: true });

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
    serverLogger.info({ port: PORT }, "Server started.");
});

const shutdown = async (signal: string) => {
    serverLogger.info({ signal }, "Server shutting down");

    server.close();
    await mediaQueueEvents.close();

    serverLogger.info({ signal }, "Server shutdown complete");
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));