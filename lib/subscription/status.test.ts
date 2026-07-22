import { describe, expect, it } from "vitest";
import { isPremiumStatus, mapStripeSubscriptionStatus } from "./status";
import { canCreateSession, FREE_SESSION_LIMIT } from "./limits";

describe("isPremiumStatus", () => {
  it("returns true only for active and trialing", () => {
    expect(isPremiumStatus("ACTIVE")).toBe(true);
    expect(isPremiumStatus("TRIALING")).toBe(true);
    expect(isPremiumStatus("CANCELED")).toBe(false);
    expect(isPremiumStatus("NONE")).toBe(false);
    expect(isPremiumStatus("PAST_DUE")).toBe(false);
  });
});

describe("mapStripeSubscriptionStatus", () => {
  it("maps Stripe strings to our enum and falls back to NONE", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("ACTIVE");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("CANCELED");
    expect(mapStripeSubscriptionStatus("weird")).toBe("NONE");
  });
});

describe("canCreateSession", () => {
  it("allows premium users regardless of count", () => {
    expect(canCreateSession(true, FREE_SESSION_LIMIT)).toBe(true);
  });

  it("blocks free users at the session limit", () => {
    expect(canCreateSession(false, FREE_SESSION_LIMIT - 1)).toBe(true);
    expect(canCreateSession(false, FREE_SESSION_LIMIT)).toBe(false);
  });
});
