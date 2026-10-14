"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { revokeDeliveredInvite } from "./deliver";
import { normalizeInviteEmail } from "./validate";

export interface InviteActionResult {
  ok: boolean;
  error?: string;
}

/** Adds an email to the beta allowlist. Sign-up is the public link; no mail is sent. */
export async function createInvite(rawEmail: string): Promise<InviteActionResult> {
  const adminUserId = await requireAdmin();
  if (!adminUserId) {
    return { ok: false, error: "Not authorized." };
  }

  const normalized = normalizeInviteEmail(rawEmail);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  try {
    await prisma.invite.create({ data: { email: normalized.email } });
  } catch {
    // Most likely the unique constraint on email — already invited.
    return { ok: false, error: "That email has already been invited." };
  }

  revalidatePath("/admin/invites");
  return { ok: true };
}

/**
 * Revokes a still-pending invite (removes it, so the email is no longer
 * allowed to sign up). Deliberately only allowed for PENDING invites —
 * once someone has already accepted and has an account, revoking here
 * wouldn't do anything to their access anyway, so surfacing it as an
 * option would be misleading. Banning an existing user is a separate,
 * bigger decision left for a deliberate follow-up if it's ever needed.
 */
export async function revokeInvite(inviteId: string): Promise<InviteActionResult> {
  const adminUserId = await requireAdmin();
  if (!adminUserId) {
    return { ok: false, error: "Not authorized." };
  }

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.status !== "PENDING") {
    return { ok: false, error: "Invite not found or already accepted." };
  }

  await prisma.invite.delete({ where: { id: inviteId } });
  try {
    await revokeDeliveredInvite(invite.email);
  } catch {
    // The allowlist row is already gone, so a later signup is still blocked.
  }

  revalidatePath("/admin/invites");
  return { ok: true };
}
