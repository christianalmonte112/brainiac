import { clerkClient } from "@clerk/nextjs/server";
import { getAppUrl } from "@/lib/stripe/config";

/** Emails a Clerk sign-up invitation. The allowlist row is what still lets them in. */
export async function deliverInviteEmail(email: string, ignoreExisting = false): Promise<void> {
  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: `${getAppUrl()}/sign-up`,
    notify: true,
    ignoreExisting,
  });
}

/** Revokes any still-pending Clerk invitation so an old email link stops working. */
export async function revokeDeliveredInvite(email: string): Promise<void> {
  const client = await clerkClient();
  const list = await client.invitations.getInvitationList({ status: "pending", query: email });
  await Promise.all(
    list.data
      .filter((invitation) => invitation.emailAddress.toLowerCase() === email)
      .map((invitation) => client.invitations.revokeInvitation(invitation.id)),
  );
}
