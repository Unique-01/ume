import { Request, Response } from "express";
import { upload } from "../../middleware/upload.middleware";
import multer from "multer";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import fs from "fs";
import { mediaQueue } from "./media.queue";
// import { MAX_ATTEMPTS } from "./media.worker";

export const processMedia = (req: Request, res: Response) => {
    upload.single("video")(req, res, async (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(422).json({ message: error.message });
        }
        if (error) {
            return res.status(415).json({ message: error.message });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No video file provided" });
        }

        const jobType = req.body.type as JobType;
        if (!jobType) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({
                error: "Missing job type (e.g. { type: 'transcode' })",
            });
        }

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
    });
};
