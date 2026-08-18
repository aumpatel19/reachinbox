import { prisma } from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";
import type { Prisma } from "@prisma/client";

export type Folder = "scheduled" | "sent" | "archived" | "deleted";

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
  archived: boolean;
  updatedAt: string;
}

export interface ListEmailsParams {
  status: Folder;
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

function buildFolderWhere(folder: Folder): Prisma.EmailWhereInput {
  switch (folder) {
    case "scheduled":
      return { status: { in: ["SCHEDULED", "PROCESSING"] }, archived: false, deletedAt: null };
    case "sent":
      return { status: { in: ["SENT", "FAILED"] }, archived: false, deletedAt: null };
    case "archived":
      return { archived: true, deletedAt: null };
    case "deleted":
      return { deletedAt: { not: null } };
  }
}

export async function listEmails(params: ListEmailsParams): Promise<ListEmailsResult> {
  const { status: folder, page, limit, search } = params;

  const where: Prisma.EmailWhereInput = {
    ...buildFolderWhere(folder),
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
    folder === "scheduled"
      ? { scheduledAt: "asc" }
      : folder === "sent"
        ? { sentAt: "desc" }
        : { updatedAt: "desc" };

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
      archived: e.archived,
      updatedAt: e.updatedAt.toISOString(),
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

async function cancelPendingJob(jobId: string): Promise<void> {
  const job = await emailQueue.getJob(jobId);
  if (!job) return;
  try {
    await job.remove();
  } catch {
    // job is active/locked; let it finish, the DB write still proceeds
  }
}

export async function setDeleted(id: string, deleted: boolean) {
  if (deleted) {
    const email = await prisma.email.findUnique({ where: { id }, select: { jobId: true } });
    if (email) await cancelPendingJob(email.jobId);
  }
  return prisma.email.update({ where: { id }, data: { deletedAt: deleted ? new Date() : null } });
}

export async function permanentlyDeleteEmail(id: string): Promise<void> {
  const email = await prisma.email.findUnique({ where: { id }, select: { jobId: true } });
  if (!email) return;

  // Cancel any pending send before removing the row. Normally already
  // cancelled by setDeleted on the way into trash -- this is a safety net
  // for rows that somehow never went through that step.
  await cancelPendingJob(email.jobId);

  await prisma.email.delete({ where: { id } });
}
