import app from "./app";
import dotenv from "dotenv";
import fs from "fs";
import { PATHS } from "./paths"; // ← was: path.join(__dirname, "tmp/...")
import { checkRedisConnection } from "./modules/media/media.queue";

// Ensure tmp directories exist before the server accepts any requests
fs.mkdirSync(PATHS.uploads, { recursive: true });
fs.mkdirSync(PATHS.processed, { recursive: true });

dotenv.config();

const PORT = process.env.PORT || 8000;

const start = async () => {
    try {
        await checkRedisConnection();
        console.log("[Redis] connected");

        app.listen(PORT, () => {
            console.log(`[Server] running on port ${PORT}`);
        });
    } catch (err) {
        console.error("[redis] unavailable — server will not start:", err);
        process.exit(1);
    }
};

start();
