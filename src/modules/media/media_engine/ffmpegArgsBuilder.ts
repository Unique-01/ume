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
    thumbnail: (input, output) => [
        "-i",
        input,
        "-ss",
        "00:00:02",
        "-frames:v",
        "1",
        "-vf",
        "scale=1280:720",
        "-q:v",
        "2",
        output,
    ],
    compress: (input, output) => [
        "-i",
        input,
        "-c:v",
        "libx264",
        "-crf",
        "28",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        output,
    ],
};

export type JobType = keyof typeof JOB_ARG_BUILDERS;

export const buildFfmpegArgs = (
    jobType: JobType,
    input: string,
    output: string,
): string[] => {
    const builder = JOB_ARG_BUILDERS[jobType];

    if (!builder) {
        throw new Error(`Unsupported media type: ${jobType}`);
    }

    return builder(input, output);
};
