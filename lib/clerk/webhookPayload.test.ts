import { describe, expect, it } from "vitest";
import { extractUserFromClerkPayload } from "./webhookPayload";

describe("extractUserFromClerkPayload", () => {
  it("extracts id, primary email, and full name from a real-shaped payload", () => {
    const result = extractUserFromClerkPayload({
      id: "user_29w83sxmDNGwOuEthce5gg56FcC",
      email_addresses: [{ id: "idn_29w83yL7CwVlJXylYLxcslromF1", email_address: "example@example.org" }],
      primary_email_address_id: "idn_29w83yL7CwVlJXylYLxcslromF1",
      first_name: "Example",
      last_name: "User",
    });

    expect(result).toEqual({
      id: "user_29w83sxmDNGwOuEthce5gg56FcC",
      email: "example@example.org",
      name: "Example User",
    });
  });

  it("picks the email matching primary_email_address_id when a user has multiple addresses", () => {
    const result = extractUserFromClerkPayload({
      id: "user_1",
      email_addresses: [
        { id: "idn_old", email_address: "old@example.com" },
        { id: "idn_new", email_address: "new@example.com" },
      ],
      primary_email_address_id: "idn_new",
    });

    expect(result.email).toBe("new@example.com");
  });

  it("falls back to the first email if primary_email_address_id doesn't match any entry", () => {
    const result = extractUserFromClerkPayload({
      id: "user_1",
      email_addresses: [{ id: "idn_a", email_address: "a@example.com" }],
      primary_email_address_id: "idn_does_not_exist",
    });

    expect(result.email).toBe("a@example.com");
  });

  it("handles a missing/empty email list without throwing", () => {
    expect(extractUserFromClerkPayload({ id: "user_1" }).email).toBeNull();
    expect(extractUserFromClerkPayload({ id: "user_1", email_addresses: [] }).email).toBeNull();
  });

  it("handles a name with only a first name, only a last name, or neither", () => {
    expect(extractUserFromClerkPayload({ id: "user_1", first_name: "Ada" }).name).toBe("Ada");
    expect(extractUserFromClerkPayload({ id: "user_1", last_name: "Lovelace" }).name).toBe("Lovelace");
    expect(extractUserFromClerkPayload({ id: "user_1" }).name).toBeNull();
  });

  it("treats explicit nulls the same as missing fields (Clerk sends null, not omission, for empty optional fields)", () => {
    const result = extractUserFromClerkPayload({
      id: "user_1",
      first_name: null,
      last_name: null,
      primary_email_address_id: null,
      email_addresses: [],
    });

    expect(result).toEqual({ id: "user_1", email: null, name: null });
  });
});
