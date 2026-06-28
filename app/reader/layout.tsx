import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NavHeader } from "./NavHeader";
import { Sidebar } from "./Sidebar";

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

  const sessions = await prisma.readingSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-screen flex-col">
      <NavHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sessions={sessions} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
