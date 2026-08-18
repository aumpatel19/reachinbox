import { redis } from "../redis/client";

export interface SendLockResult {
  acquired: boolean;
  retryAfterMs?: number;
}

/**
 * Per-sender minimum spacing between sends, enforced via a Redis lock so it
 * holds across worker processes/instances, not just within one. Because
 * enqueue-time scheduling already staggers emails by this same interval,
 * this lock rarely fires in the normal path -- it exists as a backstop
 * under concurrency and after rate-limit deferrals reshuffle timing.
 */
export async function acquireSendLock(
  senderId: string,
  minDelayMs: number,
): Promise<SendLockResult> {
  const key = `rl:lock:${senderId}`;
  const result = await redis.set(key, "1", "PX", minDelayMs, "NX");

  if (result === "OK") {
    return { acquired: true };
  }

  const ttl = await redis.pttl(key);
  const jitter = 50 + Math.floor(Math.random() * 150);
  return { acquired: false, retryAfterMs: Math.max(0, ttl) + jitter };
}
