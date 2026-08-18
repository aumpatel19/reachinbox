import { Queue } from "bullmq";
import { env } from "../config/env";
import { createRedisConnection } from "../redis/client";
import type { EmailJobData } from "../types";

export const emailQueue = new Queue<EmailJobData>(env.QUEUE_NAME, {
  connection: createRedisConnection(),
});

export interface AddEmailJobInput {
  emailId: string;
  jobId: string;
  scheduledAt: Date;
}

export async function addEmailJobs(inputs: AddEmailJobInput[]): Promise<void> {
  if (inputs.length === 0) return;

  await emailQueue.addBulk(
    inputs.map((input) => ({
      name: "send",
      data: { emailId: input.emailId },
      opts: {
        jobId: input.jobId,
        delay: Math.max(0, input.scheduledAt.getTime() - Date.now()),
        attempts: env.JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: false,
      },
    })),
  );
}
