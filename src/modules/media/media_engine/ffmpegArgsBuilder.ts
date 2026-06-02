import path from "path";

type ArgBuilder = (baseInput: string, baseOutput: string) => string[];

const JOB_ARG_BUILDERS: Record<string, ArgBuilder> = {
    transcode: (input, output) => [
        "-i",
        input,
        "-vf",
        "scale=1280:720",
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-preset",
        "medium",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        output,
    ],
};

export type JobType = keyof typeof JOB_ARG_BUILDERS;

export const buildFfmpegArgs = (
    jobType: JobType,
    input: string,
    output: string,
): string[] => {
    const baseInput = `/data/${path.basename(input)}`;
    const baseOutput = `/data/${path.basename(output)}`;

    const builder = JOB_ARG_BUILDERS[jobType];

    if (!builder) {
        throw new Error(`Unsupported media type: ${jobType}`);
    }

    return builder(baseInput, baseOutput);
};
