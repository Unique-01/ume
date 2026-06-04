import { Request, Response } from "express";
import { upload } from "../../middleware/upload.middleware";
import multer from "multer";
import { processMediaEngine } from "./media_engine/ffmpeg.engine";
import { JobType } from "./media_engine/ffmpegArgsBuilder";
import fs from "fs";

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

        const inputPath = req.file.path;

        try {
            const outputPath = await processMediaEngine({
                type: jobType,
                inputPath: inputPath,
            });

            res.download(
                outputPath,
                `processed_${req.file.originalname}`,
                (downloadErr) => {
                    if (downloadErr) {
                        console.error("Download error", downloadErr.message);
                    }

                    fs.unlink(inputPath, () => {});
                    fs.unlink(outputPath, () => {});
                },
            );
        } catch (processingErr) {
            fs.unlink(inputPath, () => {});

            const message =
                processingErr instanceof Error
                    ? processingErr.message
                    : "Unknown processing error";

            console.error("Processing failed:", message);
            return res.status(500).json({ error: message });
        }
    });
};
