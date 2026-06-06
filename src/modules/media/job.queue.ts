import { jobStore } from "./job.store";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import fs from "fs";

type QueueItem = {
    jobId: string;
    type: JobType;
    inputPath: string;
};

const MAX_CONCURRENT = 2;
let activeJob = 0;
const waiting: QueueItem[] = [];

const runJob = async (item: QueueItem) => {
    activeJob++;
    jobStore.update(item.jobId, { status: "processing" });

    try {
        const outputPath = await processMediaEngine({
            type: item.type,
            inputPath: item.inputPath,
        });

        jobStore.update(item.jobId, {
            status: "completed",
            outputPath: outputPath,
        });

        console.log(`[job:${item.jobId}] completed`);
    } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        jobStore.update(item.jobId, { status: "failed", error: error });
        console.error(`[job:${item.jobId}] failed:`, error);
    } finally {
        fs.unlink(item.inputPath, () => {});
        activeJob--;
        next();
    }
};

const next = () => {
    if (activeJob >= MAX_CONCURRENT) return;
    const item = waiting.shift();
    if (!item) return;
    runJob(item);
};

export const enqueue = (item: QueueItem) => {
    waiting.push(item);
    next();
};
