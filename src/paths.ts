import path from "path";

// __dirname here is always src/ — regardless of which file imports this
const SRC_ROOT = __dirname;

export const PATHS = {
    uploads: path.join(SRC_ROOT, "tmp", "uploads"),
    processed: path.join(SRC_ROOT, "tmp", "processed"),
} as const;
