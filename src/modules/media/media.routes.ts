import { Router } from "express";
import { processMedia } from "./media.controller";

const router = Router();
router.post("/process", processMedia);

export default router;
