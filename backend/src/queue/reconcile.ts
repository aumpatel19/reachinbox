import { prisma } from "../db/prisma";
import { logger } from "../config/logger";
import { env } from "../config/env";
import { emailQueue, addEmailJobs } from "./emailQueue";

/**
 * Runs once at process boot (API and worker both call this).
 * Not a timer/cron: it's a one-shot pass that heals state after a
 * restart, a Redis flush, or a crash mid-send.
 */
export async function reconcile(): Promise<void> {
  let reEnqueued = 0;
  let staleReset = 0;

  const scheduled = await prisma.email.findMany({
    where: { status: "SCHEDULED" },
    select: { id: true, jobId: true, scheduledAt: true },
  });

  const missing: { emailId: string; jobId: string; scheduledAt: Date }[] = [];
  for (const email of scheduled) {
    const job = await emailQueue.getJob(email.jobId);
    if (!job) {
      missing.push({ emailId: email.id, jobId: email.jobId, scheduledAt: email.scheduledAt });
    }
  }
  if (missing.length > 0) {
    await addEmailJobs(missing);
    reEnqueued = missing.length;
  }

  const staleThreshold = new Date(Date.now() - env.STALE_PROCESSING_MS);
  const stale = await prisma.email.findMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleThreshold } },
    select: { id: true, jobId: true, scheduledAt: true },
  });

  if (stale.length > 0) {
    await prisma.email.updateMany({
      where: { id: { in: stale.map((e) => e.id) } },
      data: { status: "SCHEDULED" },
    });
    await addEmailJobs(
      stale.map((e) => ({ emailId: e.id, jobId: e.jobId, scheduledAt: new Date() })),
    );
    staleReset = stale.length;
  }

  logger.info({ reEnqueued, staleReset }, "boot reconciliation complete");
}
