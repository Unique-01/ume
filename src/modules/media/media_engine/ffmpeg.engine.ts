import { spawn } from "child_process";
import path from "path";
import { buildFfmpegArgs, JobType } from "./ffmpegArgsBuilder";

type MediaJob = {
    type: JobType;
    inputPath: string;
    outputPath?: string;
};

const OUTPUT_EXT: Record<JobType, string> = {
    transcode: "mp4",
};

const resolveOutputPath = (job: MediaJob): string => {
    if (job.outputPath) return path.resolve(job.outputPath);

    const ext = OUTPUT_EXT[job.type];
    const name = path.basename(job.inputPath, path.extname(job.inputPath));
    return path.resolve(
        path.dirname(job.inputPath),
        `${name}_${job.type}.${ext}`,
    );
};

export const processMedia = (job: MediaJob): Promise<void> => {
    return new Promise((resolve, reject) => {
        const input = path.resolve(job.inputPath);
        const output = resolveOutputPath(job);

        const inputDir = path.dirname(input);
        const outputDir = path.dirname(output);

        const ffmpegArgs = buildFfmpegArgs(job.type, input, output);

        const ffmpeg = spawn("podman", [
            "run",
            "--rm",
            "-v",
            `${inputDir}:/data`,
            "-v",
            `${outputDir}:/data`,
            "jrottenberg/ffmpeg:4.4-alpine",
            ...ffmpegArgs,
        ]);

        ffmpeg.stderr?.on("data", (data) => {
            console.log("[ffmpeg]", data.toString());
        });

        ffmpeg.on("error", (err) => {
            reject(new Error(`Failed to spawn podman: ${err.message}`));
        });

        ffmpeg.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `ffmpeg exited with code ${code ?? "null (killed by signal)"}`,
                    ),
                );
            }
        });
    });
};
