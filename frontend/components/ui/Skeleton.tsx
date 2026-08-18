export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200 ${className}`} />;
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
