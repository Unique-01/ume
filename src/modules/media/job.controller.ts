import { Request, Response } from "express";
import { mediaQueue, mediaQueueEvents } from "./media.queue";
import { getPresignedUrl } from "../../storage.service";
import logger from "../../lib/logger";
import { JobProgress } from "bullmq";

const jobLogger = logger.child({ module: "job-controller" });

type ShapedProgress = {
    percent: number;
    time?: string;
    duration?: string;
    fps?: string;
    speed?: string;
    bitrate?: string;
} | null;

const shapeProgress = (raw: any): ShapedProgress => {
    if (raw?.percent === undefined) return null;

    return {
        percent: raw.percent,
        time: raw.time,
        duration: raw.duration,
        fps: raw.fps,
        speed: raw.speed,
        bitrate: raw.bitrate,
    };
};

const handleCompletedJob = async (job: any, res: Response) => {
    const r2Key = job.returnvalue as string;
    const downloadUrl = await getPresignedUrl(r2Key);

    return res.json({
        jobId: job.id,
        status: "completed",
        downloadUrl,
    });
};

const handleFailedJob = async (
    job: any,
    res: Response,
    progress: ShapedProgress,
) => {
    const isClientError = job.failedReason?.startsWith("CLIENT_ERROR:");

    const errorMessage = isClientError
        ? job.failedReason?.replace(/^CLIENT_ERROR:/, "").trim()
        : "Job failed due to a server error. Please try again later.";

    return res.status(isClientError ? 422 : 500).json({
        jobId: job.id,
        status: "failed",
        error: errorMessage,
        progress,
    });
};

export const getJobStatus = async (req: Request, res: Response) => {
    const jobId = req.params.id as string;

    const job = await mediaQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ message: "Job not found" });
    }

    const jobState = await job.getState();
    const progress = shapeProgress(job.progress as any);

    if (jobState === "completed") {
        return await handleCompletedJob(job, res);
    }

    if (jobState === "failed") {
        return await handleFailedJob(job, res, progress);
    }

    res.json({ jobId: job.id, status: jobState, progress });
};

export const streamJobProgress = async (req: Request, res: Response) => {
    const jobId = req.params.id as string;

    const job = await mediaQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ message: "Job not found" });
    }

    const jobState = await job.getState();

    if (jobState === "completed") {
        return await handleCompletedJob(job, res);
    }

    if (jobState === "failed") {
        return await handleFailedJob(job, res, null);
    }

    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.flushHeaders();

    jobLogger.info({ jobId }, "SSE stream opened");

    const sendEvent = (event: string, data: Record<string, unknown>) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const initialProgress = shapeProgress(job.progress as any);
    if (initialProgress) {
        sendEvent("progress", { jobId, ...initialProgress });
    }

    const onProgress = ({
        jobId: eventJobId,
        data,
    }: {
        jobId: string;
        data: JobProgress;
    }) => {
        if (eventJobId !== jobId) return;

        const progress = shapeProgress(data as any);
        if (progress) {
            sendEvent("progress", { jobId, ...progress });
        }
    };

    const onCompleted = async ({
        jobId: eventJobId,
        returnvalue,
    }: {
        jobId: string;
        returnvalue: string;
    }) => {
        if (eventJobId !== jobId) return;

        try {
            const downloadUrl = await getPresignedUrl(returnvalue);
            sendEvent("completed", { jobId, status: "completed", downloadUrl });
            jobLogger.info({ jobId }, "SSE stream completed");
        } catch (err) {
            sendEvent("error", {
                jobId,
                message: "Failed to generate download URL",
            });
            jobLogger.error(
                { jobId, err },
                "failed to generate presigned URL on completion",
            );
        } finally {
            cleanup();
        }
    };

    const onFailed = ({
        jobId: eventJobId,
        failedReason,
    }: {
        jobId: string;
        failedReason: string;
    }) => {
        if (eventJobId !== jobId) return;

        const isClientError = failedReason?.startsWith("CLIENT_ERROR:");
        const errorMessage = isClientError
            ? failedReason.replace(/^CLIENT_ERROR:/, "").trim()
            : "Job failed due to a server error. Please try again later.";

        sendEvent("failed", { jobId, status: "failed", error: errorMessage });
        jobLogger.warn(
            { jobId, isClientError },
            "SSE stream ended with failure",
        );
        cleanup();
    };

    let isCleanedUp = false;

    const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;

        mediaQueueEvents.off("progress", onProgress);
        mediaQueueEvents.off("completed", onCompleted);
        mediaQueueEvents.off("failed", onFailed);
        res.end();
        jobLogger.info({ jobId }, "SSE stream closed");
    };

    mediaQueueEvents.on("progress", onProgress);
    mediaQueueEvents.on("completed", onCompleted);
    mediaQueueEvents.on("failed", onFailed);

    req.on("close", () => {
        jobLogger.info({ jobId }, "SSE client disconnected");
        cleanup();
    });
};