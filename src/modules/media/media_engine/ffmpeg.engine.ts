import { spawn } from "child_process";
import path from "path";
import { buildFfmpegArgs, JobType } from "./ffmpegArgsBuilder";
import { PATHS } from "../../../paths";
import fs from "fs";

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

export const processMediaEngine = (
    job: MediaJob,
    signal?: AbortSignal,
): Promise<string> => {
    return new Promise((resolve, reject) => {
        let stderrBuffer = "";
        const input = path.resolve(job.inputPath);
        const output = resolveOutputPath(job);

        if (fs.existsSync(output)) {
            fs.unlinkSync(output);
        }

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

        const onAbort = () => {
            console.log(`[ffmpeg] abort signal received --> killing podman`);

            ffmpeg.kill("SIGTERM");
            if (fs.existsSync(output)) {
                fs.unlinkSync(output);
            }
            reject(new Error("Job cancelled — worker shutting down"));
        };

        if (signal) {
            if (signal.aborted) {
                ffmpeg.kill("SIGTERM");
                reject(new Error("Job cancelled before start"));
                return;
            }
            signal.addEventListener("abort", onAbort, { once: true });
        }

        ffmpeg.stderr?.on("data", (data) => {
            console.log("[ffmpeg]", data.toString());
            stderrBuffer += data.toString();
        });

        ffmpeg.on("error", (err) => {
            signal?.removeEventListener("abort", onAbort);
            reject(new Error(`Failed to spawn podman: ${err.message}`));
        });

        ffmpeg.on("close", (code) => {
            signal?.removeEventListener("abort", onAbort);

            if (code === 0) {
                resolve(output);
            } else {
                if (fs.existsSync(output)) {
                    fs.unlinkSync(output);
                }

                const errorDetail =
                    stderrBuffer
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .at(-1) ?? "no error output";

                reject(
                    new Error(
                        `ffmpeg exited with code ${code ?? "null"}: ${errorDetail}`,
                    ),
                );
            }
        });
    });
};
