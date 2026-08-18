import { Router } from "express";
import { prisma } from "../db/prisma";
import { redis } from "../redis/client";
import { emailQueue } from "../queue/emailQueue";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  let dbStatus = "down";
  let redisStatus = "down";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  try {
    await redis.ping();
    redisStatus = "up";
  } catch {
    redisStatus = "down";
  }

  const counts = await emailQueue.getJobCounts("waiting", "delayed", "active", "completed", "failed");

  res.json({
    ok: dbStatus === "up" && redisStatus === "up",
    db: dbStatus,
    redis: redisStatus,
    queue: counts,
  });
});
