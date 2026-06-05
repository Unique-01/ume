import { Request, Response } from "express";
import { upload } from "../../middleware/upload.middleware";
import multer from "multer";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import fs from "fs";
import { jobStore } from "./job.store";

export const processMedia = (req: Request, res: Response) => {
    upload.single("video")(req, res, async (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ message: error.message });
        }
        if (error) {
            return res.status(400).json({ message: error.message });
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

        const inputPath = req.file.path;

        jobStore.create(jobId);

        res.status(202).json({
            jobId,
            status: "Accepted",
            pollUrl: `/jobs/${jobId}`,
        });

        jobStore.update(jobId, { status: "processing" });

        processMediaEngine({ type: jobType, inputPath: inputPath })
            .then((outputPath) => {
                jobStore.update(jobId, {
                    status: "completed",
                    outputPath: outputPath,
                });

                console.log(`[job:${jobId}] done → ${outputPath}`);

                fs.unlink(inputPath, () => {});
            })
            .catch((err) => {
                const error =
                    err instanceof Error ? err.message : "Unknown Error";

                jobStore.update(jobId, { status: "failed", error: error });

                console.error(`[job:${jobId}] failed:`, error);
                fs.unlink(inputPath, () => {});
            });
    });
};
