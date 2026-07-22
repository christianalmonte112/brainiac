/** Public app origin for Stripe redirect URLs. */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function getPremiumPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID_PREMIUM;
  if (!priceId) {
    throw new Error("STRIPE_PRICE_ID_PREMIUM is not set. Add it to .env.local.");
  }
  return priceId;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local.");
  }
  return secret;
}
