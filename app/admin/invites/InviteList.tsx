"use client";

import { useState, useTransition } from "react";
import { revokeInvite } from "@/lib/invites/actions";

export interface InviteRow {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  createdAt: string;
  acceptedAt: string | null;
}

function StatusBadge({ status }: { status: InviteRow["status"] }) {
  const styles: Record<InviteRow["status"], string> = {
    PENDING: "bg-amber-50 text-amber-700",
    ACCEPTED: "bg-emerald-50 text-emerald-700",
    REVOKED: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function InviteList({ invites }: { invites: InviteRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await revokeInvite(id);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
      }
      setPendingId(null);
    });
  }

  if (invites.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No invites yet — add one above.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-900">{invite.email}</p>
            <StatusBadge status={invite.status} />
          </div>
          {invite.status === "PENDING" && (
            <button
              type="button"
              onClick={() => handleRevoke(invite.id)}
              disabled={isPending && pendingId === invite.id}
              className="shrink-0 text-xs font-medium text-rose-600 transition-colors hover:text-rose-800 disabled:opacity-60"
            >
              {isPending && pendingId === invite.id ? "Revoking…" : "Revoke"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
