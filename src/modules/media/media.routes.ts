import { Router } from "express";
import { processMedia } from "./media.controller";
import { getJobStatus } from "./job.controller";
import {
    pollRateLimiter,
    uploadRateLimiter,
} from "../../middleware/rateLimiter.middleware";

const router = Router();
router.post("/", uploadRateLimiter, processMedia);
router.get("/jobs/:id", pollRateLimiter, getJobStatus);

export default router;
