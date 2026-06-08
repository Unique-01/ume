import Bull, { Job } from "bull";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import fs from "fs";
import Redis from "ioredis";

export type MediaJobPayload = {
    type: JobType;
    inputPath: string;
};

const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
};

const CLIENT_REDIS_CONFIG = {
    ...REDIS_CONFIG,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
};

export const checkRedisConnection = async (): Promise<void> => {
    const client = new Redis(REDIS_CONFIG);

    await client.ping();
    await client.quit();
};

export const mediaQueue = new Bull<MediaJobPayload>("media-processing", {
    createClient(type) {
        switch (type) {
            case "client":
                return new Redis(CLIENT_REDIS_CONFIG);
            case "subscriber":
            case "bclient":
                return new Redis({
                    ...REDIS_CONFIG,
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false,
                });
        }
    },
});

mediaQueue.process(2, async (job: Job<MediaJobPayload>) => {
    const { type, inputPath } = job.data;

    console.log(`[job:${job.id}] processing`);

    try {
        const outputPath = await processMediaEngine({
            type: type,
            inputPath: inputPath,
        });
        console.log(`[job:${job.id}] completed`);
        return outputPath;
    } catch (error) {
        fs.unlink(inputPath, () => {});
        throw error;
    }
});

mediaQueue.on("completed", (job) => {
    fs.unlink(job.data.inputPath, () => {});
});

mediaQueue.on("failed", (job, err) => {
    console.error(`[job:${job.id}] failed:`, err.message);
});
