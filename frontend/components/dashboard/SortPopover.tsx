"use client";

import { Check } from "lucide-react";
import type { SortBy, SortDir } from "@/lib/queries";
import type { Folder } from "@/types/api";

export interface SortOption {
  label: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

export interface SortPopoverProps {
  value: { sortBy: SortBy; sortDir: SortDir };
  onSelect: (option: SortOption) => void;
  variant: Folder;
}

export function SortPopover({ value, onSelect, variant }: SortPopoverProps) {
  const isScheduled = variant === "scheduled";
  const options: SortOption[] = [
    {
      label: isScheduled ? "Soonest first" : "Newest first",
      sortBy: "date",
      sortDir: isScheduled ? "asc" : "desc",
    },
    {
      label: isScheduled ? "Latest first" : "Oldest first",
      sortBy: "date",
      sortDir: isScheduled ? "desc" : "asc",
    },
    { label: "Subject (A–Z)", sortBy: "subject", sortDir: "asc" },
    { label: "Subject (Z–A)", sortBy: "subject", sortDir: "desc" },
    { label: "Recipient (A–Z)", sortBy: "recipient", sortDir: "asc" },
    { label: "Recipient (Z–A)", sortBy: "recipient", sortDir: "desc" },
  ];

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-xl">
      <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium tracking-wide text-zinc-400">SORT BY</p>
      {options.map((opt) => {
        const active = opt.sortBy === value.sortBy && opt.sortDir === value.sortDir;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onSelect(opt)}
            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm ${
              active ? "font-medium text-brand-700" : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {opt.label}
            {active && <Check className="h-4 w-4 text-brand-600" />}
          </button>
        );
      })}
    </div>
  );
}
