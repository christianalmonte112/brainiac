import Stripe from "stripe";

declare global {
  var stripeGlobal: Stripe | undefined;
}

function createClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env.local.");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (globalThis.stripeGlobal) return globalThis.stripeGlobal;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalThis.stripeGlobal = client;
  }
  return client;
}
