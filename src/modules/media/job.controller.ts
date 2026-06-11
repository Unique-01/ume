import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { mediaQueue } from "./media.queue";

export const getJobStatus = async (req: Request, res: Response) => {
    const jobId = req.params.id as string;

    const job = await mediaQueue.getJob(jobId);

    if (!job) {
        return res.status(400).json({ message: "Job not found" });
    }

    const jobState = await job.getState();
    const progress = job.progress ?? null;

    if (jobState === "completed") {
        const outputPath = job.returnvalue as string;

        if (!fs.existsSync(outputPath)) {
            return res
                .status(410)
                .json({ message: "Output file is no longer available" });
        }
        return res.download(outputPath, path.basename(outputPath), (downloadErr) => {
            if (downloadErr)
                console.error("Download Error", downloadErr.message);

            fs.unlink(outputPath, () => {});
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
