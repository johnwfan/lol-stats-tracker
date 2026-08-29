import { redis } from "./redis";

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (!redis) return null;
  return redis.get<T>(key);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}
