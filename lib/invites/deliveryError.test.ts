import { ClerkAPIResponseError } from "@clerk/backend/errors";
import { describe, expect, it } from "vitest";
import { describeInviteDeliveryError } from "./deliveryError";

describe("describeInviteDeliveryError", () => {
  it("explains an email that already belongs to an account", () => {
    const error = new ClerkAPIResponseError("exists", {
      status: 422,
      data: [{ code: "form_identifier_exists", message: "already exists" }],
    });

    expect(describeInviteDeliveryError(error)).toBe(
      "That person already has an account, so there's no invite email to send.",
    );
  });

  it("uses Clerk's longer message for other failures", () => {
    const error = new ClerkAPIResponseError("failed", {
      status: 422,
      data: [{ code: "invite_failed", message: "short", long_message: "Invitations are not enabled." }],
    });

    expect(describeInviteDeliveryError(error)).toBe("Invitations are not enabled.");
  });

  it("falls back when the failure is not from Clerk", () => {
    expect(describeInviteDeliveryError(new Error("network"))).toBe(
      "Couldn't send the invite email. Check the address and try again.",
    );
  });
});
