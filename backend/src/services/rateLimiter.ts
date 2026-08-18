import { redis } from "../redis/client";

const WINDOW_SECONDS = 3600;
const KEY_TTL_SECONDS = 7200;

/**
 * Lua script keeps increment + compare + (on overflow) decrement + overflow-slot
 * assignment atomic across concurrent workers/instances. Without this, two
 * workers could both read count <= limit and both admit, breaching the cap.
 *
 * KEYS[1] = rl:sender:{senderId}:{windowStart}
 * KEYS[2] = rl:overflow:{senderId}:{nextWindowStart}
 * ARGV[1] = limit
 * ARGV[2] = key TTL seconds
 * ARGV[3] = minDelayMs (spacing applied to overflow slots)
 * ARGV[4] = nextWindowStart (ms epoch)
 *
 * Returns { allowed: 1|0, newScheduledAtMs (only when allowed=0) }
 */
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end

if count <= tonumber(ARGV[1]) then
  return {1, 0}
end

redis.call('DECR', KEYS[1])
local overflowIdx = redis.call('INCR', KEYS[2])
if overflowIdx == 1 then
  redis.call('EXPIRE', KEYS[2], ARGV[2])
end

local newTs = tonumber(ARGV[4]) + (overflowIdx * tonumber(ARGV[3]))
return {0, newTs}
`;

export interface RateLimitResult {
  allowed: boolean;
  newScheduledAt?: Date;
}

/**
 * Per-sender hourly cap, enforced in Redis so it's safe across N worker
 * processes. On overflow the email is not dropped: it's assigned a slot in
 * the next hour window, spaced by minDelayMs, preserving arrival order via
 * the overflow counter (first email to overflow gets the first next-window
 * slot).
 */
export async function checkHourlyRateLimit(
  senderId: string,
  limit: number,
  minDelayMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / (WINDOW_SECONDS * 1000)) * (WINDOW_SECONDS * 1000);
  const nextWindowStart = windowStart + WINDOW_SECONDS * 1000;

  const key = `rl:sender:${senderId}:${windowStart}`;
  const overflowKey = `rl:overflow:${senderId}:${nextWindowStart}`;

  const [allowed, newTs] = (await redis.eval(
    RATE_LIMIT_SCRIPT,
    2,
    key,
    overflowKey,
    String(limit),
    String(KEY_TTL_SECONDS),
    String(minDelayMs),
    String(nextWindowStart),
  )) as [number, number];

  if (allowed === 1) {
    return { allowed: true };
  }
  return { allowed: false, newScheduledAt: new Date(newTs) };
}
