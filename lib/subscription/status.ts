import type { SubscriptionStatus } from "@prisma/client";

/** Statuses that grant Premium access. */
export const PREMIUM_STATUSES = new Set<SubscriptionStatus>(["ACTIVE", "TRIALING"]);

export function isPremiumStatus(status: SubscriptionStatus): boolean {
  return PREMIUM_STATUSES.has(status);
}

/** Maps Stripe subscription.status strings to our enum. */
export function mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    default:
      return "NONE";
  }
}
