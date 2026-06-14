import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { REDIS_CONFIG } from "../config/redis.config";

const redisClient = new Redis({
    host: REDIS_CONFIG.host,
    port: REDIS_CONFIG.port,
});

const makeStore = (prefix: string) =>
    new RedisStore({
        sendCommand: (command: string, ...args: string[]) =>
            redisClient.call(command, ...args) as any,
        prefix,
    });

export const uploadRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: makeStore("rl:upload:"),
    message: {
        status: "error",
        message: "Too many upload requests, please try again in a minute",
    },
});

export const pollRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: makeStore("rl:poll:"),
    message: {
        status: "error",
        message: "Too many requests, please slow down.",
    },
});

export const adminRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: makeStore("rl:admin:"),
    message: {
        status: "error",
        message: "Too many requests.",
    },
});
