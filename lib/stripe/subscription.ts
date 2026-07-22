import type Stripe from "stripe";

/** Stripe moved period end onto subscription items in newer API versions. */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000) : null;
}
