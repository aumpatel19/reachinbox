"use client";

import { toast } from "sonner";
import { ArrowLeft, Archive, ExternalLink, Loader2, Star, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { useArchiveEmail, useDeleteEmail, useEmail, useMe, useToggleStar } from "@/lib/queries";

export function EmailDetailView({ emailId, onClose }: { emailId: string; onClose: () => void }) {
  const { data: email, isLoading, isError } = useEmail(emailId);
  const { data: me } = useMe();
  const toggleStar = useToggleStar();
  const archiveEmail = useArchiveEmail();
  const deleteEmail = useDeleteEmail();

  async function handleArchive() {
    try {
      await archiveEmail.mutateAsync(emailId);
      toast.success("Email archived");
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not archive this email"));
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this email? This can't be undone.")) return;
    try {
      await deleteEmail.mutateAsync(emailId);
      toast.success("Email deleted");
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
            aria-label="Archive"
            disabled={!email || archiveEmail.isPending}
            onClick={handleArchive}
            className="text-zinc-300 hover:text-zinc-500 disabled:opacity-50"
          >
            <Archive className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            disabled={!email || deleteEmail.isPending}
            onClick={handleDelete}
            className="text-zinc-300 hover:text-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
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
          </>
        )}
      </div>
    </div>
  );
}
