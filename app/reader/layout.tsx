import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
    select: { id: true, readingSpeedWPM: true },
  });

  if (!baseline) {
    redirect("/onboarding/assessment");
  }

  const [sessions, user] = await Promise.all([
    prisma.readingSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  return (
    <div className="flex h-screen bg-white font-sans text-black antialiased">
      <TimezoneSync currentTimezone={user?.timezone ?? null} />
      <Sidebar sessions={sessions} baselineWPM={baseline.readingSpeedWPM} />
      <div className="flex min-w-0 flex-1 flex-col">
        <NavHeader sessions={sessions} baselineWPM={baseline.readingSpeedWPM} />
        <main className="relative flex-1 overflow-y-auto bg-white">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
