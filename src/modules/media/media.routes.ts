import { Router } from "express";
import { processMedia } from "./media.controller";
import { getJobStatus } from "./job.controller";

const router = Router();
router.post("/", processMedia);
router.get("/jobs/:id", getJobStatus);

export default router;
