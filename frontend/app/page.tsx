"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMe } from "@/lib/queries";

export default function RootPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isLoading, user, isError, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
    </div>
  );
}
