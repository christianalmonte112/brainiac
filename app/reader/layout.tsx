import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminUserId } from "@/lib/admin/requireAdmin";
import { NavHeader } from "./NavHeader";
import { Sidebar } from "./Sidebar";
import { TimezoneSync } from "./TimezoneSync";
import { FeedbackWidget } from "./FeedbackWidget";

export default async function ReaderLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const baseline = await prisma.baselineAssessment.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!baseline) {
    redirect("/onboarding/assessment");
  }

  const [sessions, user] = await Promise.all([
    prisma.readingSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  return (
    <div className="flex h-screen flex-col bg-[#F9F9FB] text-slate-900 antialiased">
      <TimezoneSync currentTimezone={user?.timezone ?? null} />
      <NavHeader sessions={sessions} isAdmin={isAdminUserId(userId)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sessions={sessions} />
        <main className="flex-1 overflow-y-auto bg-[#F8F8FA]">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
