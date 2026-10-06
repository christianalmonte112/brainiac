import { isClerkAPIResponseError } from "@clerk/backend/errors";

/** Turns a Clerk invitation failure into a sentence for the admin invites page. */
export function describeInviteDeliveryError(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const code = error.errors[0]?.code ?? "";
    if (code === "form_identifier_exists") {
      return "That person already has an account, so there's no invite email to send.";
    }
    const detail = error.errors[0]?.longMessage || error.errors[0]?.message;
    if (detail) return detail;
  }
  return "Couldn't send the invite email. Check the address and try again.";
}
