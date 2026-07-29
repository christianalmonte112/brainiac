import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { extractUserFromClerkPayload, type ClerkWebhookUserData } from "@/lib/clerk/webhookPayload";

/**
 * Syncs Clerk signups into this app's own User table in real time.
 *
 * Why this matters (Phase 5, P0): before this existed, the ONLY place a
 * User row was ever created was inside submitBaselineAssessment — at the
 * very END of onboarding. That meant Postgres had no idea a person existed
 * until they finished onboarding, which is exactly why the admin
 * dashboard's "Total signups" metric had to be patched to pull live counts
 * from Clerk's own API instead of counting Postgres rows (see
 * app/admin/page.tsx). This webhook is the real, direct fix underneath
 * that workaround: now a User row exists from the moment someone actually
 * signs up, whether or not they ever finish onboarding.
 *
 * Deliberately only handles user.created and user.updated — NOT
 * user.deleted. Hard-deleting a Brainiac user's data (reading sessions,
 * vocabulary, badges, everything) just because they deleted their Clerk
 * account is a real data-retention/business decision this webhook
 * shouldn't make unilaterally; that's left for a deliberate follow-up if
 * and when it's actually wanted.
 *
 * Requires CLERK_WEBHOOK_SECRET, from a webhook endpoint you configure in
 * the Clerk Dashboard pointing at this route, subscribed to at least
 * user.created and user.updated — see README for exact setup steps. Same
 * "one-time manual step in your own dashboard" pattern as the Stripe
 * webhook; can't be done from inside this repo.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "CLERK_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const body = await request.text();
  const headerStore = await headers();
  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing svix signature headers." }, { status: 400 });
  }

  let event: { type: string; data: unknown };
  try {
    event = new Webhook(webhookSecret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: unknown };
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const { id, email, name } = extractUserFromClerkPayload(event.data as ClerkWebhookUserData);

    // Upsert, not create: user.updated can arrive for a user who already
    // has a row (e.g. they finished onboarding, then later changed their
    // email in Clerk) — this keeps email/name fresh without touching any
    // of the app-specific fields (preferredLanguage, timezone, etc.) that
    // submitBaselineAssessment or TimezoneSync may have already set.
    await prisma.user.upsert({
      where: { id },
      create: { id, email, name },
      update: { email, name },
    });
  }

  return Response.json({ received: true });
}
