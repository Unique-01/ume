import { Queue, QueueEvents } from "bullmq";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import { REDIS_CONFIG } from "../../config/redis.config";

export type MediaJobPayload = {
    type: JobType;
    inputPath: string;
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

export const mediaQueueEvents = new QueueEvents("media-processing", {
    connection: REDIS_CONFIG,
});
