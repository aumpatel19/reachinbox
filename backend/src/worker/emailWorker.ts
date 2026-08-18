import { DelayedError, Worker, type Job } from "bullmq";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { createRedisConnection } from "../redis/client";
import { prisma } from "../db/prisma";
import { sendEmail } from "../services/mailer";
import { checkHourlyRateLimit } from "../services/rateLimiter";
import { acquireSendLock } from "../services/sendLock";
import type { EmailJobData } from "../types";

async function deferJob(job: Job<EmailJobData>, emailId: string, newScheduledAt: Date, token?: string) {
  await prisma.email.updateMany({
    where: { id: emailId },
    data: { status: "SCHEDULED", scheduledAt: newScheduledAt },
  });
  const delay = Math.max(0, newScheduledAt.getTime() - Date.now());
  await job.moveToDelayed(Date.now() + delay, token);
  throw new DelayedError();
}

async function processEmailJob(job: Job<EmailJobData>, token?: string): Promise<void> {
  const { emailId } = job.data;

  // Atomic claim: only one worker can move an email from SCHEDULED to
  // PROCESSING. If this affects 0 rows, another worker (or a retry after a
  // completed send) already handled it -- return quietly, don't resend.
  const claimed = await prisma.email.updateMany({
    where: { id: emailId, status: "SCHEDULED" },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  if (claimed.count === 0) {
    logger.info({ emailId }, "email already handled, skipping");
    return;
  }

  const email = await prisma.email.findUniqueOrThrow({
    where: { id: emailId },
    include: { sender: true, campaign: true },
  });

  const limit = Math.min(
    email.campaign.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    env.MAX_EMAILS_PER_HOUR_PER_SENDER,
  );
  const rateLimit = await checkHourlyRateLimit(email.senderId, limit, env.MIN_DELAY_BETWEEN_EMAILS_MS);
  if (!rateLimit.allowed && rateLimit.newScheduledAt) {
    await deferJob(job, emailId, rateLimit.newScheduledAt, token);
    return;
  }

  const lock = await acquireSendLock(email.senderId, env.MIN_DELAY_BETWEEN_EMAILS_MS);
  if (!lock.acquired && lock.retryAfterMs !== undefined) {
    await deferJob(job, emailId, new Date(Date.now() + lock.retryAfterMs), token);
    return;
  }

  try {
    const result = await sendEmail(email.sender, email.toAddress, email.subject, email.body);
    // updateMany (not update): the row may have been deleted while the send
    // was in flight -- that's a no-op here, not an error to surface.
    await prisma.email.updateMany({
      where: { id: emailId },
      data: { status: "SENT", sentAt: new Date(), previewUrl: result.previewUrl },
    });
    logger.info({ emailId, to: email.toAddress, previewUrl: result.previewUrl }, "email sent");
  } catch (err) {
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    const message = err instanceof Error ? err.message : String(err);
    await prisma.email.updateMany({
      where: { id: emailId },
      data: {
        status: isFinalAttempt ? "FAILED" : "SCHEDULED",
        lastError: message,
      },
    });
    logger.error({ emailId, err: message, isFinalAttempt }, "email send failed");
    throw err;
  }
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(env.QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  });

  worker.on("failed", (job, err) => {
    if (err instanceof DelayedError) return;
    logger.error({ jobId: job?.id, err: err.message }, "job failed");
  });

  return worker;
}
