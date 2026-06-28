import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const baseline = await prisma.baselineAssessment.findUnique({
      where: { userId },
      select: { id: true },
    });

    redirect(baseline ? "/reader" : "/onboarding/assessment");
  }

  redirect("/sign-in");
}
