import { Router } from "express";
import { processMedia } from "./media.controller";
import { getJobStatus } from "./job.controller";
import {
    pollRateLimiter,
    uploadRateLimiter,
} from "../../middleware/rateLimiter.middleware";
import { validate } from "../../lib/validate";
import { uploadSchema } from "./media.schema";
import { uploadSingle } from "../../middleware/upload.middleware";

const router = Router();
router.post(
    "/",
    uploadRateLimiter,
    uploadSingle,
    validate(uploadSchema),
    processMedia,
);
router.get("/jobs/:id", pollRateLimiter, getJobStatus);

export default router;
