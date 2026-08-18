"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Star,
  Inbox,
  RefreshCcw,
  Search,
  AlertTriangle,
  Filter,
  Archive,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { SortPopover, type SortOption } from "./SortPopover";
import {
  useEmails,
  useToggleStar,
  useTrashEmail,
  usePermanentlyDeleteEmail,
  type SortBy,
  type SortDir,
} from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import type { EmailRow, Folder } from "@/types/api";

export interface EmailTableProps {
  variant: Folder;
  onCompose: () => void;
  onOpenEmail: (id: string) => void;
}

const EMPTY_STATE_COPY: Record<Folder, { title: string; description: string }> = {
  scheduled: {
    title: "No scheduled emails yet",
    description: "Compose a campaign to see it here, staggered by your delay settings.",
  },
  sent: {
    title: "No sent emails yet",
    description: "Emails will show up here once they've been sent.",
  },
  archived: {
    title: "No archived emails",
    description: "Emails you archive from the detail view will show up here.",
  },
  deleted: {
    title: "Trash is empty",
    description: "Deleted emails stay here until they're permanently removed.",
  },
};

export function EmailTable({ variant, onCompose, onOpenEmail }: EmailTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>(variant === "scheduled" ? "asc" : "desc");
  const [isSpinning, setIsSpinning] = useState(false);

  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useEmails({
    status: variant,
    page,
    search,
    sortBy,
    sortDir,
  });
  const toggleStar = useToggleStar();
  const trashEmail = useTrashEmail();
  const permanentlyDelete = usePermanentlyDeleteEmail();

  function handleRefresh() {
    // Refetch this table plus every other "emails" query (e.g. the sidebar's
    // folder counts), which live under separate cache keys and otherwise
    // wouldn't budge until their own 5s poll came around.
    queryClient.invalidateQueries({ queryKey: ["emails"] });
    // On localhost the round trip is a handful of ms -- too fast for
    // isFetching's spin to actually be perceived. Hold it visible briefly
    // so the click reads as having done something.
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 600);
  }

  function handleSortSelect(option: SortOption) {
    setSortBy(option.sortBy);
    setSortDir(option.sortDir);
    setPage(1);
    setSortOpen(false);
  }

  async function handleRestore(id: string) {
    try {
      await trashEmail.mutateAsync({ id, deleted: false });
      toast.success("Email restored");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not restore this email"));
    }
  }

  async function handlePermanentDelete(id: string) {
    if (!window.confirm("Permanently delete this email? This can't be undone.")) return;
    try {
      await permanentlyDelete.mutateAsync(id);
      toast.success("Email permanently deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete this email"));
    }
  }

  const columns: Column<EmailRow>[] = [
    {
      key: "to",
      header: "To",
      className: "whitespace-nowrap",
      render: (row) => <span className="font-medium text-zinc-900">To: {row.toAddress}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      className: "w-full",
      render: (row) => <span className="truncate text-zinc-600">{row.subject}</span>,
    },
    {
      key: "status",
      header:
        variant === "scheduled"
          ? "Scheduled time"
          : variant === "sent"
            ? "Sent time"
            : variant === "archived"
              ? "Archived"
              : "Deleted",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <span className="text-xs text-zinc-400">
            {formatDateTime(
              variant === "scheduled" ? row.scheduledAt : variant === "sent" ? row.sentAt : row.updatedAt,
            )}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      header: "",
      className: "whitespace-nowrap text-right",
      render: (row) =>
        variant === "deleted" ? (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              aria-label="Restore"
              title="Restore"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(row.id);
              }}
              className="text-zinc-300 hover:text-brand-600"
            >
              <RotateCcw className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              aria-label="Delete forever"
              title="Delete forever"
              onClick={(e) => {
                e.stopPropagation();
                handlePermanentDelete(row.id);
              }}
              className="text-zinc-300 hover:text-red-500"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={row.starred ? "Unstar" : "Star"}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar.mutate({ id: row.id, starred: !row.starred });
            }}
            className={row.starred ? "text-amber-400" : "text-zinc-300 hover:text-zinc-500"}
          >
            <Star className="h-[18px] w-[18px]" fill={row.starred ? "currentColor" : "none"} />
          </button>
        ),
    },
  ];

  return (
    <div className="flex-1">
      <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="w-full rounded-full bg-zinc-100 py-2.5 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              sortOpen || sortBy !== "date" || sortDir !== (variant === "scheduled" ? "asc" : "desc")
                ? "bg-brand-50 text-brand-700"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            }`}
            aria-label="Sort emails"
          >
            <Filter className="h-4 w-4" />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
              <SortPopover value={{ sortBy, sortDir }} onSelect={handleSortSelect} variant={variant} />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Refresh"
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching || isSpinning ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load emails"
          description="Something went wrong talking to the server."
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : data && data.items.length > 0 ? (
        <>
          <Table columns={columns} rows={data.items} rowKey={(row) => row.id} onRowClick={(row) => onOpenEmail(row.id)} />
          <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={variant === "deleted" ? Trash2 : variant === "archived" ? Archive : Inbox}
          title={EMPTY_STATE_COPY[variant].title}
          description={EMPTY_STATE_COPY[variant].description}
          action={
            variant === "scheduled" || variant === "sent" ? (
              <Button variant="secondary" onClick={onCompose}>
                Compose New Email
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
