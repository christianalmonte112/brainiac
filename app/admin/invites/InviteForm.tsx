"use client";

import { useState, useTransition } from "react";
import { createInvite } from "@/lib/invites/actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createInvite(email);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setEmail("");
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          disabled={isPending}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-60"
        />
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {success && <p className="mt-1 text-xs text-emerald-600">Invited — share the sign-up link with them directly.</p>}
      </div>
      <button
        type="submit"
        disabled={isPending || email.trim().length === 0}
        className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Inviting…" : "Add invite"}
      </button>
    </form>
  );
}
