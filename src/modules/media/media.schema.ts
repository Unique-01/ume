import z from "zod";
import { JOB_TYPES } from "./media_engine/ffmpegArgsBuilder";

export const uploadSchema = z.object({
    type: z.enum(JOB_TYPES, {
        error: () => ({
            message: `Job type must be one of: ${JOB_TYPES.join(", ")}`,
        }),
    }),
});

export type UploadBody = z.infer<typeof uploadSchema>;
