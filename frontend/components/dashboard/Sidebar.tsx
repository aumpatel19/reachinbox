"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clock, LogOut, Send, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useEmails, useLogout } from "@/lib/queries";
import type { User } from "@/types/api";

export interface SidebarProps {
  user: User;
  activeTab: "scheduled" | "sent";
  onTabChange: (tab: "scheduled" | "sent") => void;
  onCompose: () => void;
}

export function Sidebar({ user, activeTab, onTabChange, onCompose }: SidebarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = useLogout();

  const scheduledCount = useEmails({ status: "scheduled", page: 1 }).data?.total ?? 0;
  const sentCount = useEmails({ status: "sent", page: 1 }).data?.total ?? 0;

  async function handleLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-100 bg-white px-4 py-6">
      <div className="mb-6 px-2 font-mono text-xl font-black tracking-tight text-zinc-900">
        ReachInbox
      </div>

      <div className="relative mb-4">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-left hover:bg-zinc-100"
        >
          <Avatar src={user.avatarUrl} name={user.name} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        </button>
        {menuOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-zinc-100 bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>

      <Button variant="secondary" onClick={onCompose} className="w-full">
        Compose
      </Button>

      <p className="mb-2 mt-8 px-2 text-xs font-medium tracking-wide text-zinc-400">CORE</p>
      <nav className="space-y-1">
        <button
          type="button"
          onClick={() => onTabChange("scheduled")}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            activeTab === "scheduled"
              ? "bg-brand-50 font-semibold text-brand-700"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span className="flex-1 text-left">Scheduled</span>
          <span className="text-xs text-zinc-400">{scheduledCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("sent")}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            activeTab === "sent"
              ? "bg-brand-50 font-semibold text-brand-700"
              : "text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          <Send className="h-4 w-4" />
          <span className="flex-1 text-left">Sent</span>
          <span className="text-xs text-zinc-400">{sentCount}</span>
        </button>
      </nav>
    </aside>
  );
}
