import Redis from "ioredis";

export const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    enableOfflineQueue: false,
};

export const checkRedisConnection = async (): Promise<void> => {
    const client = new Redis({
        host: REDIS_CONFIG.host,
        port: REDIS_CONFIG.port,
    });
    await client.ping();
    await client.quit();
};
