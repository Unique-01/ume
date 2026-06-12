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
    const progress = job.progress ?? null;

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
        return res.status(500).json({
            jobId: job.id,
            status: "failed",
            error: job.failedReason,
            progress,
        });
    }

    res.json({ jobId: job.id, status: jobState, progress });
};
