import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { getWebhookSecret } from "@/lib/stripe/config";
import {
  findUserIdByStripeCustomerId,
  syncSubscriptionFromStripe,
  upsertSubscriptionRecord,
} from "@/lib/subscription/sync";
import { getSubscriptionPeriodEnd } from "@/lib/stripe/subscription";

export async function POST(request: Request) {
  const body = await request.text();
  const headerStore = await headers();
  const signature = headerStore.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        if (!userId || !customerId) break;

        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncSubscriptionFromStripe(subscription, userId);
        } else {
          await upsertSubscriptionRecord({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            status: "NONE",
            currentPeriodEnd: null,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const userId =
          subscription.metadata?.userId ?? (await findUserIdByStripeCustomerId(customerId));

        if (!userId) break;

        if (event.type === "customer.subscription.deleted") {
          await upsertSubscriptionRecord({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            status: "CANCELED",
            currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
          });
        } else {
          await syncSubscriptionFromStripe(subscription, userId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe/webhook]", error);
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
