import { redis } from "./redis";

export async function cacheGet(key) {
  if (!redis) return null;
  return redis.get(key);
}

export async function cacheSet(key, value, ttlSeconds) {
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}
