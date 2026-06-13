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

        const existingProgress = job.progress as any;
        let outputPath: string;

        if (existingProgress?.ffmpegDone && existingProgress?.outputPath) {
            console.log(
                `[job:${job.id}] ffmpeg already done, skipping to upload`,
            );
            outputPath = existingProgress.outputPath;
        } else {
            await job.updateProgress({ percent: 0 });

            outputPath = await processMediaEngine(
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
            await job.updateProgress({
                percent: 100,
                ffmpegDone: true,
                outputPath,
            });
            console.log(`[job:${job.id}] ffmpeg done, uploading to R2...`);
        }
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

    const isUnrecoverable = err.name === "UnrecoverableError";

    console.error(
        `[job:${job.id}] attempt ${job.attemptsMade}/${MAX_ATTEMPTS} failed:`,
        err.message,
    );

    if (isUnrecoverable) {
        console.error(
            `[job:${job.id}] unrecoverable client error, skipping DLQ`,
        );
        fs.unlink(job.data.inputPath, () => {});
        return;
    }

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
