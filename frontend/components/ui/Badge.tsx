import { Clock, CircleCheck, CircleX, Loader2 } from "lucide-react";
import type { EmailStatus } from "@/types/api";

const statusConfig: Record<EmailStatus, { label: string; classes: string; icon: typeof Clock }> = {
  SCHEDULED: { label: "Scheduled", classes: "bg-amber-50 text-amber-700", icon: Clock },
  PROCESSING: { label: "Processing", classes: "bg-blue-50 text-blue-700", icon: Loader2 },
  SENT: { label: "Sent", classes: "bg-brand-50 text-brand-700", icon: CircleCheck },
  FAILED: { label: "Failed", classes: "bg-red-50 text-red-700", icon: CircleX },
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${config.classes}`}
    >
      <Icon className={`h-3 w-3 ${status === "PROCESSING" ? "animate-spin" : ""}`} />
      {config.label}
    </span>
  );
}
