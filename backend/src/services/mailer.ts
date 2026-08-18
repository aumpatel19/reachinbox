import nodemailer, { type Transporter } from "nodemailer";
import type { Sender } from "@prisma/client";
import { logger } from "../config/logger";

const transporterCache = new Map<string, Transporter>();

function getTransporter(sender: Sender): Transporter {
  const cached = transporterCache.get(sender.id);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false,
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });
  transporterCache.set(sender.id, transporter);
  return transporter;
}

export interface SendResult {
  previewUrl: string | null;
}

export interface MailAttachment {
  filename: string;
  contentType: string;
  content: string; // base64-encoded
}

export async function sendEmail(
  sender: Sender,
  to: string,
  subject: string,
  body: string,
  attachments?: MailAttachment[],
): Promise<SendResult> {
  const transporter = getTransporter(sender);
  const info = await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    html: body,
    text: body.replace(/<[^>]+>/g, ""),
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.from(a.content, "base64"),
    })),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  return { previewUrl };
}

export async function createEtherealAccount(): Promise<{
  user: string;
  pass: string;
  smtp: { host: string; port: number };
}> {
  const account = await nodemailer.createTestAccount();
  logger.info({ user: account.user }, "created ethereal test account");
  return {
    user: account.user,
    pass: account.pass,
    smtp: { host: account.smtp.host, port: account.smtp.port },
  };
}
