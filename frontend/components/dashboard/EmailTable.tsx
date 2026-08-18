"use client";

import { useState } from "react";
import { Star, Inbox, RefreshCcw, Search, AlertTriangle } from "lucide-react";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { useEmails } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import type { EmailRow } from "@/types/api";

export interface EmailTableProps {
  variant: "scheduled" | "sent";
  onCompose: () => void;
  onOpenEmail: (id: string) => void;
}

export function EmailTable({ variant, onCompose, onOpenEmail }: EmailTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useEmails({ status: variant, page, search });

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
      header: variant === "scheduled" ? "Scheduled time" : "Sent time",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <span className="text-xs text-zinc-400">
            {formatDateTime(variant === "scheduled" ? row.scheduledAt : row.sentAt)}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      header: "",
      className: "whitespace-nowrap text-right",
      render: (row) => (
        <button
          type="button"
          aria-label="Preview email"
          onClick={(e) => {
            e.stopPropagation();
            onOpenEmail(row.id);
          }}
          className="text-zinc-300 hover:text-zinc-500"
        >
          <Star className="h-[18px] w-[18px]" />
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
        <button
          type="button"
          onClick={() => refetch()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Refresh"
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
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
          icon={Inbox}
          title={variant === "scheduled" ? "No scheduled emails yet" : "No sent emails yet"}
          description={
            variant === "scheduled"
              ? "Compose a campaign to see it here, staggered by your delay settings."
              : "Emails will show up here once they've been sent."
          }
          action={
            <Button variant="secondary" onClick={onCompose}>
              Compose New Email
            </Button>
          }
        />
      )}
    </div>
  );
}
