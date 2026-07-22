import type { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSubscriptionPeriodEnd } from "@/lib/stripe/subscription";
import { mapStripeSubscriptionStatus } from "./status";

interface UpsertSubscriptionArgs {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}

export async function upsertSubscriptionRecord(args: UpsertSubscriptionArgs) {
  return prisma.subscription.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
    },
    update: {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
    },
  });
}

export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription,
  userId: string,
) {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id;

  return upsertSubscriptionRecord({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: stripeSubscription.id,
    status: mapStripeSubscriptionStatus(stripeSubscription.status),
    currentPeriodEnd: getSubscriptionPeriodEnd(stripeSubscription),
  });
}

export async function findUserIdByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  const record = await prisma.subscription.findUnique({
    where: { stripeCustomerId },
    select: { userId: true },
  });
  return record?.userId ?? null;
}
