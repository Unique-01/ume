import multer from "multer";
import path from "path";
import * as crypto from "node:crypto";
import { PATHS } from "../paths";

const storage = multer.diskStorage({
    destination(_req, _file, callback) {
        callback(null, PATHS.uploads);
    },
    filename(_req, file, callback) {
        const id = crypto.randomBytes(16).toString("hex");
        const ext = path.extname(file.originalname).toLowerCase();
        callback(null, `${id}${ext}`);
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
    fileFilter(_req, file, callback) {
        const allowed = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            return callback(new Error(`Unsupported format: ${ext}`));
        }
        callback(null, true);
    },
});