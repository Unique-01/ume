import { Request, Response } from "express";
import { Job, jobStore } from "./job.store";
import fs from "fs";
import path from "path";

export const getJobStatus = (req: Request, res: Response) => {
    const jobId = req.params.id as string;
    const job = jobStore.get(jobId);
    if (!job) {
        return res.status(400).json({ message: "Job not found" });
    }

    if (job.status !== "completed") {
        return res.json({
            jobId: job.id,
            status: job.status,
            ...(job.error && { error: job.error }),
        });
    }

    const outputPath = job.outputPath as string;
    console.log(outputPath)

    if (!fs.existsSync(outputPath)) {
        return res
            .status(410)
            .json({ message: "Output file is no longer available" });
    }
    res.download(outputPath, path.basename(outputPath), (downloadErr) => {
        if (downloadErr) console.error("Download Error", downloadErr.message);

        fs.unlink(outputPath, () => {});
    });
};
