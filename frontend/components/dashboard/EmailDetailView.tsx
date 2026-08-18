"use client";

import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Loader2,
  Paperclip,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { useArchiveEmail, useEmail, useMe, usePermanentlyDeleteEmail, useToggleStar, useTrashEmail } from "@/lib/queries";

export function EmailDetailView({ emailId, onClose }: { emailId: string; onClose: () => void }) {
  const { data: email, isLoading, isError } = useEmail(emailId);
  const { data: me } = useMe();
  const toggleStar = useToggleStar();
  const archiveEmail = useArchiveEmail();
  const trashEmail = useTrashEmail();
  const permanentlyDelete = usePermanentlyDeleteEmail();

  const isTrashed = Boolean(email?.deletedAt);
  const isArchived = Boolean(email?.archived);

  async function handleArchiveToggle() {
    if (!email) return;
    try {
      await archiveEmail.mutateAsync({ id: emailId, archived: !isArchived });
      toast.success(isArchived ? "Email restored to inbox" : "Email archived");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update this email"));
    }
  }

  async function handleTrash() {
    try {
      await trashEmail.mutateAsync({ id: emailId, deleted: true });
      toast.success("Moved to Trash");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete this email"));
    }
  }

  async function handleRestoreFromTrash() {
    try {
      await trashEmail.mutateAsync({ id: emailId, deleted: false });
      toast.success("Email restored");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not restore this email"));
    }
  }

  async function handlePermanentDelete() {
    if (!window.confirm("Permanently delete this email? This can't be undone.")) return;
    try {
      await permanentlyDelete.mutateAsync(emailId);
      toast.success("Email permanently deleted");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete this email"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
        <button
          type="button"
          onClick={onClose}
          className="flex min-w-0 items-center gap-3 text-xl font-semibold text-zinc-900"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          <span className="truncate">{email?.subject ?? "Email"}</span>
        </button>
        <div className="flex shrink-0 items-center gap-4">
          {isTrashed ? (
            <>
              <button
                type="button"
                aria-label="Restore"
                disabled={!email || trashEmail.isPending}
                onClick={handleRestoreFromTrash}
                className="text-zinc-300 hover:text-zinc-500 disabled:opacity-50"
                title="Restore"
              >
                <RotateCcw className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                aria-label="Delete forever"
                disabled={!email || permanentlyDelete.isPending}
                onClick={handlePermanentDelete}
                className="text-zinc-300 hover:text-red-500 disabled:opacity-50"
                title="Delete forever"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                aria-label={email?.starred ? "Unstar" : "Star"}
                disabled={!email}
                onClick={() => email && toggleStar.mutate({ id: emailId, starred: !email.starred })}
                className={email?.starred ? "text-amber-400" : "text-zinc-300 hover:text-zinc-500"}
              >
                <Star className="h-[18px] w-[18px]" fill={email?.starred ? "currentColor" : "none"} />
              </button>
              <button
                type="button"
                aria-label={isArchived ? "Unarchive" : "Archive"}
                disabled={!email || archiveEmail.isPending}
                onClick={handleArchiveToggle}
                className={isArchived ? "text-brand-600" : "text-zinc-300 hover:text-zinc-500"}
                title={isArchived ? "Unarchive" : "Archive"}
              >
                {isArchived ? (
                  <ArchiveRestore className="h-[18px] w-[18px]" />
                ) : (
                  <Archive className="h-[18px] w-[18px]" />
                )}
              </button>
              <button
                type="button"
                aria-label="Delete"
                disabled={!email || trashEmail.isPending}
                onClick={handleTrash}
                className="text-zinc-300 hover:text-red-500 disabled:opacity-50"
                title="Move to Trash"
              >
                <Trash2 className="h-[18px] w-[18px]" />
              </button>
            </>
          )}
          <div className="h-6 w-px bg-zinc-200" />
          {me && <Avatar src={me.avatarUrl} name={me.name} size={36} />}
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : isError || !email ? (
          <p className="py-20 text-center text-sm text-zinc-500">Couldn&apos;t load this email.</p>
        ) : (
          <>
            <div className="flex items-start justify-between border-b border-zinc-100 pb-5">
              <div className="flex items-start gap-3">
                <Avatar name={email.sender.name} size={40} />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {email.sender.name}{" "}
                    <span className="font-normal text-zinc-400">&lt;{email.sender.email}&gt;</span>
                  </p>
                  <p className="text-xs text-zinc-500">to {email.toAddress}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={email.status} />
                <span className="text-xs text-zinc-400">
                  {email.sentAt ? formatDateTime(email.sentAt) : formatDateTime(email.scheduledAt)}
                </span>
                {email.previewUrl && (
                  <a
                    href={email.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Ethereal
                  </a>
                )}
              </div>
            </div>

            {email.status === "FAILED" && email.lastError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {email.lastError}
              </div>
            )}

            <div
              className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-200 [&_blockquote]:pl-4 [&_blockquote]:text-zinc-500 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />

            {email.attachments.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {email.attachments.map((att) => (
                  <a
                    key={att.filename}
                    href={`data:${att.contentType};base64,${att.content}`}
                    download={att.filename}
                    className="flex w-44 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 hover:bg-zinc-100"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-800">{att.filename}</p>
                      <p className="text-xs text-zinc-400">
                        {formatFileSize(Math.round((att.content.length * 3) / 4))}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
