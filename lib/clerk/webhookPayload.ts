/**
 * Pure parsing of a Clerk webhook event's `data` object into the fields
 * this app's User table actually needs. Deliberately separated from
 * signature verification (in the route handler) and from Prisma — this
 * function is pure JSON-in, plain-object-out, so it's directly
 * unit-testable against real Clerk payload shapes without mocking svix or
 * a database.
 *
 * Field names are snake_case (email_addresses, primary_email_address_id,
 * first_name, last_name) because this is the RAW WEBHOOK payload shape —
 * different from the camelCase shape Clerk's SDK's currentUser() returns
 * (already used elsewhere in this codebase, e.g.
 * onboarding/assessment/actions.ts). Confirmed against Clerk's own
 * documented webhook payload structure, not assumed to match the SDK.
 */

export interface ClerkWebhookUserData {
  id: string;
  email_addresses?: { id: string; email_address: string }[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface ExtractedClerkUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** Extracts {id, email, name} from a Clerk user.created/user.updated webhook's `data` object. */
export function extractUserFromClerkPayload(data: ClerkWebhookUserData): ExtractedClerkUser {
  const email =
    data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ??
    data.email_addresses?.[0]?.email_address ??
    null;

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

  return { id: data.id, email, name };
}
