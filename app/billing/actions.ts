"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";
import { getAppUrl, getPremiumPriceId } from "@/lib/stripe/config";
import { getSubscriptionForUser } from "@/lib/subscription/getSubscription";
import { isPremiumStatus } from "@/lib/subscription/status";

export interface BillingActionResult {
  error?: string;
  url?: string;
}

async function getOrCreateStripeCustomerId(userId: string): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await getStripe().customers.create({
    metadata: { userId },
  });

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customer.id,
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

/** Starts a Stripe Checkout session for Brainiac Premium. */
export async function createCheckoutSession(): Promise<BillingActionResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const subscription = await getSubscriptionForUser(userId);
  if (subscription && isPremiumStatus(subscription.status)) {
    return { error: "You already have an active Premium subscription." };
  }

  try {
    const customerId = await getOrCreateStripeCustomerId(userId);
    const appUrl = getAppUrl();

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: getPremiumPriceId(), quantity: 1 }],
      success_url: `${appUrl}/reader/progress?billing=success`,
      cancel_url: `${appUrl}/reader/progress?billing=canceled`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    if (!session.url) {
      return { error: "Stripe did not return a checkout URL." };
    }

    return { url: session.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return { error: message };
  }
}

/** Opens the Stripe Customer Portal so subscribers can manage billing. */
export async function createBillingPortalSession(): Promise<BillingActionResult> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    return { error: "No billing account found yet." };
  }

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${getAppUrl()}/reader/progress`,
    });

    return { url: portal.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open billing portal.";
    return { error: message };
  }
}
