"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { normalizeInviteEmail } from "./validate";

export interface InviteActionResult {
  ok: boolean;
  error?: string;
}

/** Adds an email to the beta invite allowlist. See prisma schema `Invite` for how this is enforced. */
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

  const result = await prisma.invite.deleteMany({ where: { id: inviteId, status: "PENDING" } });
  if (result.count === 0) {
    return { ok: false, error: "Invite not found or already accepted." };
  }

  revalidatePath("/admin/invites");
  return { ok: true };
}
