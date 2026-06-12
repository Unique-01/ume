import "./instrument"
import app from "./app";
import fs from "fs";
import { PATHS } from "./paths"; // ← was: path.join(__dirname, "tmp/...")

// Ensure tmp directories exist before the server accepts any requests
fs.mkdirSync(PATHS.uploads, { recursive: true });
fs.mkdirSync(PATHS.processed, { recursive: true });


const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`[Server] running on port ${PORT}`);
});
