import Redis from "ioredis";
import { ENV } from "./env.js";

export const redisClient = new Redis({
  host: ENV.REDIS_HOST,
  port: ENV.REDIS_PORT,
  password: ENV.REDIS_PASSWORD,
  db: ENV.REDIS_DB,
  tls: ENV.REDIS_TLS === "true" ? {} : undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("ready", () => {
  console.log("Redis client ready");
});

redisClient.on("end", () => {
  console.log("Redis client disconnected");
});

export async function getCache(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting cache:", error);
    return null;
  }
}

export async function setCache(key, value, ttl = 300) {
  try {
    if (ttl) {
      await redisClient.setex(key, ttl, JSON.stringify(value));
      console.log(`[setCache] Set key: ${key} with TTL: ${ttl}s`);
    } else {
      await redisClient.set(key, JSON.stringify(value));
      console.log(`[setCache] Set key: ${key} with no expiration`);
    }
    return true;
  } catch (error) {
    console.error("Error setting cache:", error);
    return false;
  }
}

export async function deleteCache(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("Error deleting cache:", error);
    return false;
  }
}

export async function invalidatePattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`Invalidated ${keys.length} cache keys matching ${pattern}`);
    }
    return keys.length;
  } catch (error) {
    console.error("Error invalidating cache pattern:", error);
    return 0;
  }
}

export async function getOrSet(key, fn, ttl = 300) {
  try {
    const cached = await getCache(key);
    if (cached) {
      console.log(`Cache hit: ${key}`);
      return cached;
    }

    console.log(`Cache miss: ${key}`);
    const result = await fn();
    await setCache(key, result, ttl);
    return result;
  } catch (error) {
    console.error("Error in getOrSet:", error);
    return await fn();
  }
}

export async function flushAll() {
  try {
    await redisClient.flushall();
    console.log("Flushed all cache");
    return true;
  } catch (error) {
    console.error("Error flushing all cache:", error);
    return false;
  }
}
