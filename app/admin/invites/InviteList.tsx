"use client";

import { useState, useTransition } from "react";
import { resendInvite, revokeInvite } from "@/lib/invites/actions";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    success?: string,
  ) {
    setError(null);
    setNotice(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
      } else if (success) {
        setNotice(success);
      }
      setPendingKey(null);
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
      {notice && <p className="text-xs text-emerald-600">{notice}</p>}
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
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  run(`${invite.id}:resend`, () => resendInvite(invite.id), `Emailed ${invite.email} again.`)
                }
                disabled={isPending && pendingKey?.startsWith(invite.id)}
                className="text-xs font-medium text-slate-700 transition-colors hover:text-slate-900 disabled:opacity-60"
              >
                {isPending && pendingKey === `${invite.id}:resend` ? "Sending…" : "Resend"}
              </button>
              <button
                type="button"
                onClick={() => run(`${invite.id}:revoke`, () => revokeInvite(invite.id))}
                disabled={isPending && pendingKey?.startsWith(invite.id)}
                className="text-xs font-medium text-rose-600 transition-colors hover:text-rose-800 disabled:opacity-60"
              >
                {isPending && pendingKey === `${invite.id}:revoke` ? "Revoking…" : "Revoke"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
