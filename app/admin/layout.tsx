import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isAdminUserId } from "@/lib/admin/requireAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // Private owner-only route. If ADMIN_USER_ID is unset or doesn't match the
  // active Clerk user, send them back to the regular reader area.
  if (!isAdminUserId(userId)) {
    redirect("/reader");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-semibold text-slate-900 hover:text-slate-700">
              Admin
            </Link>
            <p className="text-xs uppercase tracking-wide text-slate-500">Owner only</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
            <Link href="/admin/users" className="hover:text-slate-900">
              Users
            </Link>
            <Link href="/admin/invites" className="hover:text-slate-900">
              Invites
            </Link>
            <Link href="/admin/feedback" className="hover:text-slate-900">
              Feedback
            </Link>
            <Link href="/reader" className="hover:text-slate-900">
              ← Back to app
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
