import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const adminUserId = process.env.ADMIN_USER_ID;

  // Private owner-only route. If ADMIN_USER_ID is unset or doesn't match the
  // active Clerk user, send them back to the regular reader area.
  if (!userId || !adminUserId || userId !== adminUserId) {
    redirect("/reader");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          <p className="text-xs uppercase tracking-wide text-slate-500">Owner only</p>
        </div>
      </header>
      {children}
    </div>
  );
}
