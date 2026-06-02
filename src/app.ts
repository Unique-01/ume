import express from "express";
import mediaRoutes from "./modules/media/media.routes";

const app = express();

app.use("api/v1/media/", mediaRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

export default app;
