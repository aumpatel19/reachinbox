"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import axios from "axios";
import { useMe } from "@/lib/queries";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types/api";

export function AuthGuard({ children }: { children: (user: User) => React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError, error, refetch, isFetching } = useMe();

  const isUnauthenticated = axios.isAxiosError(error) && error.response?.status === 401;

  useEffect(() => {
    if (isUnauthenticated) router.replace("/login");
  }, [isUnauthenticated, router]);

  if (isError && !isUnauthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-white text-center">
        <AlertTriangle className="h-8 w-8 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">Couldn&apos;t reach the server</p>
        <p className="max-w-sm text-sm text-zinc-500">
          The API might be down or unreachable. This isn&apos;t a login problem — try again.
        </p>
        <Button variant="secondary" loading={isFetching} onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return <>{children(user)}</>;
}
