"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { RichTextEditor } from "./RichTextEditor";
import { SendLaterPopover } from "./SendLaterPopover";
import { useCreateCampaign, useCreateEtherealSender, useSenders } from "@/lib/queries";
import { parseRecipientsFromFile, parseRecipientsFromText } from "@/lib/parseRecipients";
import { formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";

const DEFAULT_DELAY_SECONDS = 2;
const DEFAULT_HOURLY_LIMIT = 200;
const VISIBLE_CHIPS = 3;

export function ComposeOverlay({ onClose }: { onClose: () => void }) {
  const { data: senders } = useSenders();
  const createEtherealSender = useCreateEtherealSender();
  const createCampaign = useCreateCampaign();

  const [senderId, setSenderId] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [skippedCount, setSkippedCount] = useState(0);
  const [showAllChips, setShowAllChips] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(DEFAULT_DELAY_SECONDS);
  const [hourlyLimit, setHourlyLimit] = useState(DEFAULT_HOURLY_LIMIT);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const effectiveSenderId = senderId || senders?.[0]?.id || "";
  const bodyText = bodyHtml.replace(/<[^>]*>/g, "").trim();
  const isValid = Boolean(effectiveSenderId) && subject.trim().length > 0 && recipients.length > 0 && bodyText.length > 0;

  const visibleChips = showAllChips ? recipients : recipients.slice(0, VISIBLE_CHIPS);
  const hiddenCount = recipients.length - visibleChips.length;

  function mergeRecipients(newOnes: string[], invalidInBatch: number) {
    const combined = parseRecipientsFromText([...recipients, ...newOnes].join("\n"));
    const crossDupes = recipients.length + newOnes.length - combined.emails.length;
    setRecipients(combined.emails);
    setSkippedCount((prevSkipped) => prevSkipped + invalidInBatch + crossDupes);
  }

  function handleAddManualInput() {
    if (!recipientInput.trim()) return;
    const { emails, invalidCount } = parseRecipientsFromText(recipientInput);
    mergeRecipients(emails, invalidCount);
    setRecipientInput("");
  }

  async function handleFile(file: File) {
    const { emails, invalidCount } = await parseRecipientsFromFile(file);
    setFileName(file.name);
    mergeRecipients(emails, invalidCount);
  }

  async function handleCreateSender() {
    try {
      const sender = await createEtherealSender.mutateAsync(undefined);
      setSenderId(sender.id);
      toast.success(`Created sender ${sender.email}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not create a sender"));
    }
  }

  async function handleSubmit() {
    if (!isValid) return;
    const effectiveStartAt = startAt ?? new Date(Date.now() + 5000);
    try {
      const result = await createCampaign.mutateAsync({
        senderId: effectiveSenderId,
        subject: subject.trim(),
        body: bodyHtml,
        recipients,
        startAt: effectiveStartAt.toISOString(),
        delayBetweenMs: Math.max(0, Math.round(delaySeconds * 1000)),
        hourlyLimit: hourlyLimit > 0 ? hourlyLimit : undefined,
      });
      toast.success(`Scheduled ${result.scheduled} email${result.scheduled === 1 ? "" : "s"}`);
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not schedule the campaign"));
    }
  }

  const sendLabel = useMemo(() => (startAt ? "Send Later" : "Send"), [startAt]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-5">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-3 text-xl font-semibold text-zinc-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Compose New Email
        </button>
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSendLaterOpen((v) => !v)}
            aria-label="Send later"
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              startAt ? "bg-brand-50 text-brand-700" : "text-zinc-400 hover:bg-zinc-100"
            }`}
          >
            <Clock className="h-4 w-4" />
          </button>
          {sendLaterOpen && (
            <SendLaterPopover
              onSelect={(date) => {
                setStartAt(date);
                setSendLaterOpen(false);
              }}
              onClose={() => setSendLaterOpen(false)}
            />
          )}
          <Button
            variant={startAt ? "secondary" : "primary"}
            disabled={!isValid}
            loading={createCampaign.isPending}
            onClick={handleSubmit}
          >
            {sendLabel}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-8 py-6">
        {startAt && (
          <p className="mb-4 text-xs text-zinc-500">
            Scheduled to start {formatDateTime(startAt.toISOString())}
          </p>
        )}

        <div className="flex items-center gap-4 border-b border-zinc-100 py-3">
          <label className="w-16 text-sm text-zinc-500">From</label>
          {senders && senders.length > 0 ? (
            <Select value={effectiveSenderId} onChange={(e) => setSenderId(e.target.value)}>
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
            </Select>
          ) : (
            <button
              type="button"
              onClick={handleCreateSender}
              disabled={createEtherealSender.isPending}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-60"
            >
              {createEtherealSender.isPending ? "Creating sender…" : "Create Ethereal sender"}
            </button>
          )}
        </div>

        <div className="flex items-start gap-4 border-b border-zinc-100 py-3">
          <label className="w-16 pt-2 text-sm text-zinc-500">To</label>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {visibleChips.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => setRecipients((prev) => prev.filter((e) => e !== email))}
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllChips(true)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  +{hiddenCount}
                </button>
              )}
              <input
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddManualInput();
                  }
                }}
                onBlur={handleAddManualInput}
                placeholder={recipients.length === 0 ? "recipient@example.com" : "Add another…"}
                className="min-w-[180px] flex-1 bg-transparent py-1 text-sm text-zinc-800 placeholder-zinc-400 outline-none"
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                {recipients.length > 0 &&
                  `${recipients.length} email address${recipients.length === 1 ? "" : "es"} detected`}
                {skippedCount > 0 && ` · ${skippedCount} invalid/duplicate skipped`}
                {fileName && ` · ${fileName}`}
              </p>
              <FileDropzone onFile={handleFile} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-zinc-100 py-3">
          <label className="w-16 text-sm text-zinc-500">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={200}
            className="flex-1 bg-transparent py-1 text-sm text-zinc-800 placeholder-zinc-400 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-8 py-4">
          <label className="flex items-center gap-3 text-sm text-zinc-700">
            Delay between 2 emails
            <input
              type="number"
              min={0}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-16 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm outline-none focus:border-brand-500"
            />
            <span className="text-xs text-zinc-400">sec</span>
          </label>
          <label className="flex items-center gap-3 text-sm text-zinc-700">
            Hourly Limit
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-16 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-sm outline-none focus:border-brand-500"
            />
          </label>
        </div>

        <div className="flex min-h-[260px] flex-col pb-8">
          <RichTextEditor onChange={setBodyHtml} />
        </div>
      </div>
    </div>
  );
}
