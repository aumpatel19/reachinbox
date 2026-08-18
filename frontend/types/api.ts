export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdById: string;
  createdAt: string;
}

export type EmailStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

export type Folder = "scheduled" | "sent" | "archived" | "deleted";

export interface EmailRow {
  id: string;
  toAddress: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  previewUrl: string | null;
  campaignId: string;
  starred: boolean;
  archived: boolean;
  updatedAt: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  content: string; // base64-encoded
}

export interface EmailDetail {
  id: string;
  campaignId: string;
  senderId: string;
  toAddress: string;
  subject: string;
  body: string;
  sequenceIndex: number;
  scheduledAt: string;
  status: EmailStatus;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  previewUrl: string | null;
  jobId: string;
  starred: boolean;
  archived: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: { email: string; name: string };
  attachments: Attachment[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateCampaignInput {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayBetweenMs: number;
  hourlyLimit?: number;
  attachments?: Attachment[];
}

export interface CreateCampaignResult {
  campaignId: string;
  scheduled: number;
  skippedInvalid: number;
  firstSendAt: string | null;
  lastSendAt: string | null;
}

export interface HealthResponse {
  ok: boolean;
  db: string;
  redis: string;
  queue: {
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
    paused: number;
  };
}
