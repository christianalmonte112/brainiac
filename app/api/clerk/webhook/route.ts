import { headers } from "next/headers";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { extractUserFromClerkPayload, type ClerkWebhookUserData } from "@/lib/clerk/webhookPayload";

/**
 * Syncs Clerk signups into this app's own User table in real time, and
 * enforces the Phase 5 beta invite gate.
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
 * Beta invite gate (Phase 5): we're deliberately NOT paying for Clerk's
 * Restricted sign-up mode, so this is our own allowlist check, done here
 * on user.created — see prisma schema `Invite` and app/admin/invites for
 * the admin side. If the signup's email isn't a PENDING invite, we ban the
 * Clerk account (clerkClient.users.banUser) instead of creating a Postgres
 * row. banUser() revokes all of that user's sessions immediately, so the
 * existing auth.protect() check in proxy.ts is enough to keep them out on
 * their very next request — no separate metadata/session-claim plumbing
 * needed. There's a small window between account creation and this
 * webhook firing where an uninvited signup could load one protected page
 * before their session is revoked; that's an accepted tradeoff for
 * avoiding a paid Clerk plan, not a full guarantee.
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

  if (event.type === "user.created") {
    const { id, email, name } = extractUserFromClerkPayload(event.data as ClerkWebhookUserData);

    const invite = email
      ? await prisma.invite.findUnique({ where: { email: email.toLowerCase() } })
      : null;

    if (invite && invite.status === "PENDING") {
      await prisma.$transaction([
        prisma.user.upsert({ where: { id }, create: { id, email, name }, update: { email, name } }),
        prisma.invite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } }),
      ]);
    } else {
      // Not an invited email (or the invite was already used/revoked) —
      // deny access. Best-effort: if the ban call itself fails, we still
      // return 200 so Clerk doesn't endlessly retry this event, but we
      // deliberately do NOT create a Postgres User row for them either way.
      try {
        const client = await clerkClient();
        await client.users.banUser(id);
      } catch {
        // Nothing more useful to do here — see comment above.
      }
    }
  } else if (event.type === "user.updated") {
    const { id, email, name } = extractUserFromClerkPayload(event.data as ClerkWebhookUserData);

    // updateMany (not upsert): only touch a User row that already exists.
    // A banned/unapproved account has no row, and a user.updated event for
    // one shouldn't create one — same reasoning as setUserTimezone's use of
    // updateMany for "may not exist yet" (see lib/user/timezoneActions.ts).
    await prisma.user.updateMany({ where: { id }, data: { email, name } });
  }

  return Response.json({ received: true });
}
