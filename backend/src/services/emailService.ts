import { prisma } from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";
import type { Prisma } from "@prisma/client";

export interface EmailRow {
  id: string;
  toAddress: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  previewUrl: string | null;
  campaignId: string;
  starred: boolean;
}

export interface ListEmailsParams {
  status: "scheduled" | "sent";
  page: number;
  limit: number;
  search?: string;
}

export interface ListEmailsResult {
  items: EmailRow[];
  total: number;
  page: number;
  limit: number;
}

export async function listEmails(params: ListEmailsParams): Promise<ListEmailsResult> {
  const { status, page, limit, search } = params;

  const where: Prisma.EmailWhereInput = {
    status: status === "scheduled" ? { in: ["SCHEDULED", "PROCESSING"] } : { in: ["SENT", "FAILED"] },
    ...(search
      ? {
          OR: [
            { toAddress: { contains: search, mode: "insensitive" } },
            { subject: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.EmailOrderByWithRelationInput =
    status === "scheduled" ? { scheduledAt: "asc" } : { sentAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.email.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.email.count({ where }),
  ]);

  return {
    items: items.map((e) => ({
      id: e.id,
      toAddress: e.toAddress,
      subject: e.subject,
      scheduledAt: e.scheduledAt.toISOString(),
      sentAt: e.sentAt?.toISOString() ?? null,
      status: e.status,
      previewUrl: e.previewUrl,
      campaignId: e.campaignId,
      starred: e.starred,
    })),
    total,
    page,
    limit,
  };
}

export async function getEmailById(id: string) {
  return prisma.email.findUnique({
    where: { id },
    include: { sender: { select: { email: true, name: true } } },
  });
}

export async function setStarred(id: string, starred: boolean) {
  return prisma.email.update({ where: { id }, data: { starred } });
}

export async function setArchived(id: string, archived: boolean) {
  return prisma.email.update({ where: { id }, data: { archived } });
}

export async function deleteEmail(id: string): Promise<void> {
  const email = await prisma.email.findUnique({ where: { id }, select: { jobId: true } });
  if (!email) return;

  // Cancel any pending send before removing the row, so the worker never
  // claims a job whose email no longer exists.
  const job = await emailQueue.getJob(email.jobId);
  if (job) await job.remove();

  await prisma.email.delete({ where: { id } });
}
