"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { useMe } from "@/lib/queries";

export default function LoginPage() {
  const router = useRouter();
  const { data: user } = useMe();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <LoginCard />
    </main>
  );
}
