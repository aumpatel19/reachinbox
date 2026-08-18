"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { EmailTable } from "@/components/dashboard/EmailTable";
import { EmailDetailView } from "@/components/dashboard/EmailDetailView";
import { ComposeOverlay } from "@/components/compose/ComposeOverlay";
import type { Folder } from "@/types/api";

const FOLDERS: Folder[] = ["scheduled", "sent", "archived", "deleted"];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [composeOpen, setComposeOpen] = useState(false);
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: Folder = FOLDERS.includes(tabParam as Folder) ? (tabParam as Folder) : "scheduled";

  function setActiveTab(tab: Folder) {
    router.push(`/dashboard?tab=${tab}`);
  }

  return (
    <AuthGuard>
      {(user) => (
        <div className="flex h-screen bg-white">
          <Sidebar
            user={user}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onCompose={() => setComposeOpen(true)}
          />
          <EmailTable
            variant={activeTab}
            onCompose={() => setComposeOpen(true)}
            onOpenEmail={setOpenEmailId}
          />
          {composeOpen && <ComposeOverlay onClose={() => setComposeOpen(false)} />}
          {openEmailId && (
            <EmailDetailView emailId={openEmailId} onClose={() => setOpenEmailId(null)} />
          )}
        </div>
      )}
    </AuthGuard>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
