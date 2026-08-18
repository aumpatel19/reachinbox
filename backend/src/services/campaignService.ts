import { z } from "zod";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { addEmailJobs } from "../queue/emailQueue";
import { dedupeRecipients } from "./recipients";

export const createCampaignSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(50_000),
  recipients: z.array(z.string().email()).min(1).max(10_000),
  startAt: z.string().datetime(),
  delayBetweenMs: z.number().int().min(0),
  hourlyLimit: z.number().int().min(1).max(10_000).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export interface CreateCampaignResult {
  campaignId: string;
  scheduled: number;
  skippedInvalid: number;
  firstSendAt: string | null;
  lastSendAt: string | null;
}

export async function createCampaign(
  userId: string,
  input: CreateCampaignInput,
): Promise<CreateCampaignResult> {
  const startAt = new Date(input.startAt);
  if (startAt.getTime() < Date.now() - 60_000) {
    throw new Error("startAt must not be more than 60s in the past");
  }

  const { deduped, skippedInvalid } = dedupeRecipients(input.recipients);
  const effectiveDelayMs = Math.max(input.delayBetweenMs, env.MIN_DELAY_BETWEEN_EMAILS_MS);
  const hourlyLimit = Math.min(
    input.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    env.MAX_EMAILS_PER_HOUR_PER_SENDER,
  );

  const { campaignId, rows } = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId,
        senderId: input.senderId,
        subject: input.subject,
        body: input.body,
        startAt,
        delayBetweenMs: effectiveDelayMs,
        hourlyLimit,
        totalRecipients: deduped.length,
      },
    });

    const emailRows = deduped.map((toAddress, i) => ({
      campaignId: campaign.id,
      senderId: input.senderId,
      toAddress,
      subject: input.subject,
      body: input.body,
      sequenceIndex: i,
      scheduledAt: new Date(startAt.getTime() + i * effectiveDelayMs),
      jobId: "",
    }));

    await tx.email.createMany({ data: emailRows, skipDuplicates: true });

    const created = await tx.email.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, scheduledAt: true },
      orderBy: { sequenceIndex: "asc" },
    });

    // jobId depends on the generated id, so it's set in a follow-up update.
    // BullMQ rejects custom job ids containing ":", so use "-" as the separator.
    await Promise.all(
      created.map((e) => tx.email.update({ where: { id: e.id }, data: { jobId: `email-${e.id}` } })),
    );

    return { campaignId: campaign.id, rows: created };
  });

  await addEmailJobs(
    rows.map((r) => ({ emailId: r.id, jobId: `email-${r.id}`, scheduledAt: r.scheduledAt })),
  );

  const sorted = [...rows].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return {
    campaignId,
    scheduled: rows.length,
    skippedInvalid,
    firstSendAt: sorted[0]?.scheduledAt.toISOString() ?? null,
    lastSendAt: sorted[sorted.length - 1]?.scheduledAt.toISOString() ?? null,
  };
}
