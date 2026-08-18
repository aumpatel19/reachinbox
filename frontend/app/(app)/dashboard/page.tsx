"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { EmailTable } from "@/components/dashboard/EmailTable";
import { ComposeOverlay } from "@/components/compose/ComposeOverlay";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [composeOpen, setComposeOpen] = useState(false);

  const activeTab = searchParams.get("tab") === "sent" ? "sent" : "scheduled";

  function setActiveTab(tab: "scheduled" | "sent") {
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
          <EmailTable variant={activeTab} onCompose={() => setComposeOpen(true)} />
          {composeOpen && <ComposeOverlay onClose={() => setComposeOpen(false)} />}
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
