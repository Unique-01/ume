import { Request, Response } from "express";
import fs from "fs";
import { mediaQueue } from "./media.queue";
import { UploadBody } from "./media.schema";

export const processMedia = async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
    }

    const { type: jobType } = req.body as UploadBody;

    const jobId = crypto.randomUUID();

    try {
        await mediaQueue.add(
            jobType,
            {
                type: jobType,
                inputPath: req.file.path,
            },
            {
                jobId: jobId,
            },
        );
    } catch (err) {
        fs.unlink(req.file.path, () => {});
        return res.status(503).json({ message: "Service Unavailable" });
    }

    res.status(202).json({
        jobId,
        status: "Accepted",
        pollUrl: `/jobs/${jobId}`,
    });
};
