"use client";

import { useState, useTransition } from "react";
import { createBillingPortalSession, createCheckoutSession } from "@/app/billing/actions";

interface BillingPanelProps {
  isPremium: boolean;
  statusLabel: string;
  renewsAt: string | null;
}

export function BillingPanel({ isPremium, statusLabel, renewsAt }: BillingPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(action: () => Promise<{ error?: string; url?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isPremium ? "Brainiac Premium" : "Free plan"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {isPremium
              ? renewsAt
                ? `Active · renews ${renewsAt}`
                : `Status: ${statusLabel}`
              : "Upgrade for unlimited reading sessions and full access."}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            handleAction(isPremium ? createBillingPortalSession : createCheckoutSession)
          }
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? "Opening…" : isPremium ? "Manage billing" : "Upgrade to Premium"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
