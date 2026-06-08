import Bull, { Job } from "bull";
import Redis from "ioredis";
import { MediaJobPayload, mediaQueue } from "./media.queue";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import fs from "fs";

export const MAX_ATTEMPTS = 3;

export const deadLetterQueue = new Bull("media-dlq", {
    createClient(type) {
        const config = {
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: Number(process.env.REDIS_PORT) || 6379,
            ...(type === "client"
                ? { maxRetriesPerRequest: 1, enableOfflineQueue: false }
                : { maxRetriesPerRequest: null, enableReadyCheck: false }),
        };

        return new Redis(config);
    },
});

mediaQueue.process(2, async (job: Job<MediaJobPayload>) => {
    const { type, inputPath } = job.data;
    console.log(
        `[job:${job.id}] attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS}`,
    );

    const outputPath = await processMediaEngine({ type, inputPath });
    console.log(`[job:${job.id}] completed`);

    return outputPath;
});

mediaQueue.on("completed", (job) => {
    fs.unlink(job.data.inputPath, () => {});
});

mediaQueue.on("failed", async (job, err) => {
    console.error(
        `[job:${job.id}] attempt ${job.attemptsMade}/${MAX_ATTEMPTS} failed:`,
        err.message,
    );

    if (job.attemptsMade >= MAX_ATTEMPTS) {
        console.error(`[job:${job.id}] moving to DLQ`);
        await deadLetterQueue.add({
            originalJobId: job.id,
            payload: job.data,
            reason: err.message,
            failedAt: new Date().toISOString(),
        });
    }

    fs.unlink(job.data.inputPath, () => {});
});
