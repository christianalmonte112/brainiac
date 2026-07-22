import type { Subscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import { isPremiumStatus } from "./status";
import { syncSubscriptionFromStripe } from "./sync";

type SubscriptionRow = Pick<
  Subscription,
  "status" | "currentPeriodEnd" | "stripeCustomerId" | "stripeSubscriptionId"
>;

/** Loads subscription from DB, syncing from Stripe when checkout succeeded but webhook lagged. */
export async function getSubscriptionForUser(userId: string): Promise<SubscriptionRow | null> {
  const record = await prisma.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!record?.stripeCustomerId || isPremiumStatus(record.status)) {
    return record;
  }

  const stripeSubscriptions = await getStripe().subscriptions.list({
    customer: record.stripeCustomerId,
    status: "all",
    limit: 5,
  });

  const activeSubscription = stripeSubscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due"].includes(subscription.status),
  );

  if (!activeSubscription) {
    return record;
  }

  return syncSubscriptionFromStripe(activeSubscription, userId);
}
