"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleIcon } from "./GoogleIcon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function LoginCard() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-10 shadow-sm">
      <h1 className="text-center text-3xl font-bold text-zinc-900">Login</h1>

      <a
        href={`${API_URL}/auth/google`}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-brand-50 py-3.5 text-sm font-medium text-zinc-800 transition hover:bg-brand-100"
      >
        <GoogleIcon />
        Login with Google
      </a>

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
        <div className="h-px flex-1 bg-zinc-200" />
        or sign up through email
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          toast.info("Email login isn't enabled for this demo — use Login with Google.");
        }}
      >
        <Input type="email" placeholder="Email ID" autoComplete="email" />
        <Input type="password" placeholder="Password" autoComplete="current-password" />
        <Button type="submit" className="w-full !rounded-xl py-3.5">
          Login
        </Button>
      </form>
    </div>
  );
}
