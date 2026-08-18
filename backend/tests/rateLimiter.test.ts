import { afterAll, beforeEach, describe, expect, it } from "vitest";
import IORedis from "ioredis";
import { checkHourlyRateLimit } from "../src/services/rateLimiter";

// These tests exercise the real Lua script against a live Redis instance
// (docker compose up -d redis) since the atomicity guarantee it provides
// under concurrent callers can't be faithfully verified against a mock.
const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");

async function clearKeys() {
  const keys = await redis.keys("rl:*");
  if (keys.length > 0) await redis.del(...keys);
}

beforeEach(clearKeys);
afterAll(async () => {
  await clearKeys();
  await redis.quit();
});

describe("checkHourlyRateLimit", () => {
  it("admits up to the configured limit within a window", async () => {
    const senderId = "sender-a";
    for (let i = 0; i < 3; i++) {
      const result = await checkHourlyRateLimit(senderId, 3, 1000);
      expect(result.allowed).toBe(true);
    }
  });

  it("defers the (limit + 1)th send to the next window", async () => {
    const senderId = "sender-b";
    for (let i = 0; i < 3; i++) {
      await checkHourlyRateLimit(senderId, 3, 1000);
    }
    const overflow = await checkHourlyRateLimit(senderId, 3, 1000);
    expect(overflow.allowed).toBe(false);
    expect(overflow.newScheduledAt).toBeInstanceOf(Date);
    expect(overflow.newScheduledAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("never admits more than the limit under concurrent callers", async () => {
    const senderId = "sender-c";
    const limit = 5;
    const results = await Promise.all(
      Array.from({ length: 20 }, () => checkHourlyRateLimit(senderId, limit, 1000)),
    );
    const admitted = results.filter((r) => r.allowed).length;
    expect(admitted).toBe(limit);
  });
});
