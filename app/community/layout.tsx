import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NavHeader } from "@/app/reader/NavHeader";

/**
 * Community shell (F-016): signed-in users only, sharing the reader's top
 * nav. Deliberately does NOT require a completed baseline assessment —
 * unlike the reader shell — so new users can browse the community before
 * (or instead of) onboarding.
 */
export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
