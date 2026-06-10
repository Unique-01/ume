import { Queue } from "bullmq";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import Redis from "ioredis";

export type MediaJobPayload = {
    type: JobType;
    inputPath: string;
};

export const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    enableOfflineQueue: false,
};

export const checkRedisConnection = async (): Promise<void> => {
    const client = new Redis({
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
    });
    await client.ping();
    await client.quit();
};

export const mediaQueue = new Queue<MediaJobPayload>("media-processing", {
    connection: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
    },
});

export const deadLetterQueue = new Queue("media-dlq", {
    connection: REDIS_CONFIG,
});
