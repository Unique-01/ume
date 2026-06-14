import express from "express";
import mediaRoutes from "./modules/media/media.routes";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { deadLetterQueue, mediaQueue } from "./modules/media/media.queue";
import { adminRateLimiter } from "./middleware/rateLimiter.middleware";

const app = express();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
    queues: [new BullMQAdapter(mediaQueue), new BullMQAdapter(deadLetterQueue)],
    serverAdapter,
});

app.use("/admin/queues", adminRateLimiter, serverAdapter.getRouter());
app.use("/api/v1/media/", mediaRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

export default app;
