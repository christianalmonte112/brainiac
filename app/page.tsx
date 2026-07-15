import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Home route — route users straight to the app; no splash gate. */
export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const baseline = await prisma.baselineAssessment.findUnique({
    where: { userId },
    select: { id: true },
  });

  redirect(baseline ? "/reader" : "/onboarding/assessment");
}
