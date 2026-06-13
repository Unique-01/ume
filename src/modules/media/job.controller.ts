import { Request, Response } from "express";
import { mediaQueue } from "./media.queue";
import { getPresignedUrl } from "../../storage.service";

export const getJobStatus = async (req: Request, res: Response) => {
    const jobId = req.params.id as string;

    const job = await mediaQueue.getJob(jobId);

    if (!job) {
        return res.status(404).json({ message: "Job not found" });
    }

    const jobState = await job.getState();
    const rawProgress = (job.progress as any) ?? null;

    const progress = rawProgress
        ? {
              percent: rawProgress.percent,
              time: rawProgress.time,
              duration: rawProgress.duration,
              fps: rawProgress.fps,
              speed: rawProgress.speed,
              bitrate: rawProgress.bitrate,
          }
        : null;

    if (jobState === "completed") {
        const r2Key = job.returnvalue as string;
        const downloadUrl = await getPresignedUrl(r2Key);

        return res.json({
            jobId: job.id,
            status: jobState,
            downloadUrl,
        });
    }

    if (jobState === "failed") {
        const isClientError = job.failedReason.startsWith("CLIENT_ERROR:");

        const errorMessage = isClientError
            ? job.failedReason?.replace(/^CLIENT_ERROR:/, "").trim()
            : "Job failed due to a server error. Please try again later.";

        return res.status(isClientError ? 422 : 500).json({
            jobId: job.id,
            status: "failed",
            error: errorMessage,
            progress,
        });
    }

    res.json({ jobId: job.id, status: jobState, progress });
};
