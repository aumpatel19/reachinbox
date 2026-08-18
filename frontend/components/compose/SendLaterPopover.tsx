"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export interface SendLaterPopoverProps {
  onSelect: (date: Date) => void;
  onClose: () => void;
}

function startOfTomorrow(hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const quickOptions: { label: string; get: () => Date }[] = [
  { label: "Tomorrow", get: () => startOfTomorrow(9) },
  { label: "Tomorrow, 10:00 AM", get: () => startOfTomorrow(10) },
  { label: "Tomorrow, 11:00 AM", get: () => startOfTomorrow(11) },
  { label: "Tomorrow, 3:00 PM", get: () => startOfTomorrow(15) },
];

export function SendLaterPopover({ onSelect, onClose }: SendLaterPopoverProps) {
  const [custom, setCustom] = useState("");

  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl">
      <p className="mb-3 text-sm font-semibold text-zinc-900">Send Later</p>

      <input
        type="datetime-local"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        className="mb-3 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-sm text-zinc-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
      />

      <div className="mb-4 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
        {quickOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onSelect(opt.get())}
            className="block w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 first:rounded-t-xl last:rounded-b-xl"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          disabled={!custom}
          onClick={() => custom && onSelect(new Date(custom))}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
