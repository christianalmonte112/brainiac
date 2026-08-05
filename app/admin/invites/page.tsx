import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InviteForm } from "./InviteForm";
import { InviteList, type InviteRow } from "./InviteList";

export default async function AdminInvitesPage() {
  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, status: true, createdAt: true, acceptedAt: true },
  });

  const rows: InviteRow[] = invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    status: invite.status,
    createdAt: invite.createdAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
  }));

  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const acceptedCount = rows.filter((r) => r.status === "ACCEPTED").length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Beta invites</h2>
          <p className="mt-1 text-xs text-slate-500">
            {pendingCount} pending · {acceptedCount} accepted
          </p>
        </div>
        <Link href="/admin" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          ← Back to dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <p className="mb-3 text-xs text-slate-500">
          Adding an email here lets that person sign up. Everyone else who tries to sign up is blocked
          automatically. Share the sign-up link with them directly — no email is sent from here.
        </p>
        <InviteForm />
      </div>

      <InviteList invites={rows} />
    </main>
  );
}
