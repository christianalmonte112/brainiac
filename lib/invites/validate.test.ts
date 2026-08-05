import { describe, expect, it } from "vitest";
import { normalizeInviteEmail } from "./validate";

describe("normalizeInviteEmail", () => {
  it("lowercases and trims a valid email", () => {
    const result = normalizeInviteEmail("  Jane.Doe@Example.COM  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("jane.doe@example.com");
    }
  });

  it("rejects an empty string", () => {
    expect(normalizeInviteEmail("").ok).toBe(false);
    expect(normalizeInviteEmail("   ").ok).toBe(false);
  });

  it("rejects a string with no @", () => {
    expect(normalizeInviteEmail("not-an-email").ok).toBe(false);
  });

  it("rejects a string with no domain suffix", () => {
    expect(normalizeInviteEmail("person@localhost").ok).toBe(false);
  });

  it("rejects a string with spaces", () => {
    expect(normalizeInviteEmail("jane doe@example.com").ok).toBe(false);
  });

  it("rejects an excessively long email", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    expect(normalizeInviteEmail(longEmail).ok).toBe(false);
  });

  it("accepts a plus-addressed email", () => {
    const result = normalizeInviteEmail("chris+beta@example.com");
    expect(result.ok).toBe(true);
  });
});
