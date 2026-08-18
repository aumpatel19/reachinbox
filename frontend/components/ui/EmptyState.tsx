import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
        <Icon className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-zinc-500">{description}</p>}
      {action}
    </div>
  );
}
