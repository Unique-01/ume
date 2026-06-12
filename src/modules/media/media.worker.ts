import { Worker, Job } from "bullmq";
import { MediaJobPayload, REDIS_CONFIG, deadLetterQueue } from "./media.queue";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import fs from "fs";
import { uploadToR2 } from "../../storage.service";

export const MAX_ATTEMPTS = 3;

export const workerAbortController = new AbortController();

export const mediaWorker = new Worker<MediaJobPayload>(
    "media-processing",
    async (job: Job<MediaJobPayload>) => {
        const { type, inputPath } = job.data;
        console.log(
            `[job:${job.id}] attempt ${job.attemptsMade + 1}/${MAX_ATTEMPTS}`,
        );

        await job.updateProgress({ percent: 0 });

        const outputPath = await processMediaEngine(
            { type, inputPath },
            workerAbortController.signal,
            async (progress) => {
                try {
                    await job.updateProgress(progress);
                } catch (err) {
                    console.error(
                        `[job:${job.id}] failed to update progress`,
                        err instanceof Error ? err.message : err,
                    );
                }
            },
        );
        console.log(`[job:${job.id}] ffmpeg done, uploading to R2...`);
        const r2Key = await uploadToR2(outputPath);
        console.log(`[job:${job.id}] uploaded to R2 at key ${r2Key}`);

        fs.unlink(outputPath, () => {});

        return r2Key;
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
