export interface InviteEmailError {
  ok: false;
  error: string;
}

export interface InviteEmailSuccess {
  ok: true;
  email: string;
}

// Deliberately simple — this only needs to catch obvious typos before we
// write to the DB and match a Clerk signup later; Clerk itself is the real
// validator of whether an email address actually works.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes an invite email to lowercase/trimmed form, matching how we'll
 * compare it against the Clerk webhook payload's email later. Rejects
 * obviously malformed input.
 */
export function normalizeInviteEmail(rawEmail: string): InviteEmailError | InviteEmailSuccess {
  const email = rawEmail.trim().toLowerCase();

  if (email.length === 0) {
    return { ok: false, error: "Email is required." };
  }
  if (email.length > 254) {
    return { ok: false, error: "Email is too long." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "That doesn't look like a valid email address." };
  }

  return { ok: true, email };
}
