import { prisma } from "../db/prisma";
import { createEtherealAccount } from "./mailer";
import type { Sender } from "@prisma/client";

export type PublicSender = Omit<Sender, "smtpPass">;

function toPublic(sender: Sender): PublicSender {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to exclude it from `rest`
  const { smtpPass: _smtpPass, ...rest } = sender;
  return rest;
}

export async function listSenders(): Promise<PublicSender[]> {
  const senders = await prisma.sender.findMany({ orderBy: { createdAt: "asc" } });
  return senders.map(toPublic);
}

export async function createEtherealSender(
  createdById: string,
  name?: string,
): Promise<PublicSender> {
  const account = await createEtherealAccount();
  const sender = await prisma.sender.create({
    data: {
      name: name ?? account.user.split("@")[0] ?? account.user,
      email: account.user,
      smtpHost: account.smtp.host,
      smtpPort: account.smtp.port,
      smtpUser: account.user,
      smtpPass: account.pass,
      createdById,
    },
  });
  return toPublic(sender);
}
