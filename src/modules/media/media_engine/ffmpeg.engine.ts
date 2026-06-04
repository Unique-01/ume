import { spawn } from "child_process";
import path from "path";
import { buildFfmpegArgs, JobType } from "./ffmpegArgsBuilder";
import { PATHS } from "../../../paths";

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

    return path.join(PATHS.processed, `${name}_${job.type}.${ext}`);
};

export const processMediaEngine = (job: MediaJob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const input = path.resolve(job.inputPath);
        const output = resolveOutputPath(job);

        const inputDir = path.dirname(input);
        const outputDir = path.dirname(output);

        const containerInput = `/input/${path.basename(input)}`;
        const containerOutput = `/output/${path.basename(output)}`;

        const ffmpegArgs = buildFfmpegArgs(
            job.type,
            containerInput,
            containerOutput,
        );

        const ffmpeg = spawn("podman", [
            "run",
            "--rm",
            "-v",
            `${inputDir}:/input:ro,z`,
            "-v",
            `${outputDir}:/output:z`,
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
                resolve(output);
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
