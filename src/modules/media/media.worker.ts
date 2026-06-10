// import Bull, { Job } from "bull";
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import {
    MediaJobPayload,
    REDIS_CONFIG,
    deadLetterQueue,
} from "./media.queue";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import fs from "fs";

export const MAX_ATTEMPTS = 3;

export const workerAbortController = new AbortController();

export const mediaWorker = new Worker<MediaJobPayload>(
    "media-processing",
    async (job: Job<MediaJobPayload>) => {
        const { type, inputPath } = job.data;
        console.log(
            `[job:${job.id}] attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS}`,
        );

        const outputPath = await processMediaEngine(
            { type, inputPath },
            workerAbortController.signal,
        );
        console.log(`[job:${job.id}] completed`);

        return outputPath;
    },
    {
        connection: REDIS_CONFIG,
        concurrency: 2,
    },
);

mediaWorker.on("completed", (job) => {
    fs.unlink(job.data.inputPath, () => {});
});

mediaWorker.on("failed", async (job, err) => {
    if (!job) return;

    console.error(
        `[job:${job.id}] attempt ${job.attemptsMade}/${MAX_ATTEMPTS} failed:`,
        err.message,
    );

    if (job.attemptsMade >= MAX_ATTEMPTS) {
        console.error(`[job:${job.id}] moving to DLQ`);

        await deadLetterQueue.add("failed-job", {
            originalJobId: job.id,
            payload: job.data,
            reason: err.message,
            failedAt: new Date().toISOString(),
        });

        fs.unlink(job.data.inputPath, () => {});
    }
});
