import { describe, expect, it } from "vitest";
import { MAX_FEEDBACK_LENGTH, validateFeedback } from "./validate";

describe("validateFeedback", () => {
  it("accepts a normal message and trims it", () => {
    const result = validateFeedback("  This is great feedback!  ", "/reader");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe("This is great feedback!");
      expect(result.page).toBe("/reader");
    }
  });

  it("rejects an empty message", () => {
    const result = validateFeedback("", "/reader");
    expect(result.ok).toBe(false);
  });

  it("rejects a whitespace-only message", () => {
    const result = validateFeedback("   \n\t  ", "/reader");
    expect(result.ok).toBe(false);
  });

  it("rejects a message over the max length", () => {
    const tooLong = "a".repeat(MAX_FEEDBACK_LENGTH + 1);
    const result = validateFeedback(tooLong, null);
    expect(result.ok).toBe(false);
  });

  it("accepts a message exactly at the max length", () => {
    const exact = "a".repeat(MAX_FEEDBACK_LENGTH);
    const result = validateFeedback(exact, null);
    expect(result.ok).toBe(true);
  });

  it("normalizes a missing or empty page to null", () => {
    expect(validateFeedback("hi", null)).toMatchObject({ page: null });
    expect(validateFeedback("hi", undefined)).toMatchObject({ page: null });
    expect(validateFeedback("hi", "")).toMatchObject({ page: null });
    expect(validateFeedback("hi", "   ")).toMatchObject({ page: null });
  });

  it("truncates an overly long page value instead of rejecting", () => {
    const longPage = "/" + "a".repeat(300);
    const result = validateFeedback("hi", longPage);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page?.length).toBeLessThanOrEqual(200);
    }
  });
});
