import IORedis from "ioredis";
import { env } from "../config/env";

// BullMQ requires maxRetriesPerRequest: null on connections it owns.
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export function createRedisConnection(): IORedis {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
