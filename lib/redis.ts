import { createClient } from "redis";
import type { RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let useRedis = false;

// Initialize Redis connection
export async function initRedis(): Promise<void> {
  if (!process.env.REDIS_URL) {
    console.log("⚠️  No REDIS_URL configured, Redis caching disabled");
    return;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log("Redis: Too many retries, disabling Redis");
            return new Error("Redis unavailable");
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on("error", (err) => {
      console.log("Redis Client Error:", err.message);
      useRedis = false;
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected successfully");
      useRedis = true;
    });

    await redisClient.connect();
    useRedis = true;
  } catch (error) {
    console.log("⚠️  Redis unavailable, caching disabled:", error instanceof Error ? error.message : "Unknown error");
    useRedis = false;
  }
}

// Get value from Redis cache
export async function getCache(key: string): Promise<string | null> {
  if (!useRedis || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    return value;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

// Set value in Redis cache with expiration (in seconds)
export async function setCache(
  key: string,
  value: string,
  expirationSeconds?: number
): Promise<boolean> {
  if (!useRedis || !redisClient) {
    return false;
  }

  try {
    if (expirationSeconds) {
      await redisClient.setEx(key, expirationSeconds, value);
    } else {
      await redisClient.set(key, value);
    }
    return true;
  } catch (error) {
    console.error("Redis set error:", error);
    return false;
  }
}

// Delete value from Redis cache
export async function deleteCache(key: string): Promise<boolean> {
  if (!useRedis || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("Redis delete error:", error);
    return false;
  }
}

// Check if Redis is available
export function isRedisAvailable(): boolean {
  return useRedis && redisClient !== null;
}

// Close Redis connection (for graceful shutdown)
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log("Redis connection closed");
    } catch (error) {
      console.error("Error closing Redis:", error);
    }
  }
}

// Initialize Redis on module load (for server-side)
if (typeof window === "undefined") {
  initRedis().catch((error) => {
    console.error("Failed to initialize Redis:", error);
  });
}

