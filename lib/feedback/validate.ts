export const MAX_FEEDBACK_LENGTH = 2000;
export const MAX_FEEDBACK_PAGE_LENGTH = 200;

export interface FeedbackValidationError {
  ok: false;
  error: string;
}

export interface FeedbackValidationSuccess {
  ok: true;
  message: string;
  page: string | null;
}

/**
 * Validates and normalizes a feedback submission. Trims the message and
 * rejects empty/whitespace-only or oversized input, so the widget can show
 * an inline error instead of silently persisting junk rows.
 */
export function validateFeedback(rawMessage: string, rawPage: string | null | undefined): FeedbackValidationError | FeedbackValidationSuccess {
  const message = rawMessage.trim();

  if (message.length === 0) {
    return { ok: false, error: "Feedback can't be empty." };
  }
  if (message.length > MAX_FEEDBACK_LENGTH) {
    return { ok: false, error: `Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer.` };
  }

  const page = rawPage?.trim().slice(0, MAX_FEEDBACK_PAGE_LENGTH) || null;

  return { ok: true, message, page };
}
