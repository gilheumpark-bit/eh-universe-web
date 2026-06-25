import {
  isPaidSubscriptionStatus,
  normalizeStripeSubscriptionStatus,
  resolvePlanIdFromStripeMetadata,
} from "../subscription-entitlement-store";

describe("subscription entitlement store helpers", () => {
  it("normalizes Stripe subscription statuses for entitlement checks", () => {
    expect(normalizeStripeSubscriptionStatus("paid")).toBe("active");
    expect(normalizeStripeSubscriptionStatus("active")).toBe("active");
    expect(normalizeStripeSubscriptionStatus("trialing")).toBe("trialing");
    expect(normalizeStripeSubscriptionStatus("canceled")).toBe("canceled");
    expect(normalizeStripeSubscriptionStatus("something-new")).toBe("unknown");
  });

  it("treats only active and trialing subscriptions as usable", () => {
    expect(isPaidSubscriptionStatus("active")).toBe(true);
    expect(isPaidSubscriptionStatus("trialing")).toBe(true);
    expect(isPaidSubscriptionStatus("past_due")).toBe(false);
    expect(isPaidSubscriptionStatus("canceled")).toBe(false);
  });

  it("resolves current and legacy plan metadata keys", () => {
    expect(resolvePlanIdFromStripeMetadata({ loreguardPlanId: "studio" })).toBe("studio");
    expect(resolvePlanIdFromStripeMetadata({ planId: "indie" })).toBe("starter");
    expect(resolvePlanIdFromStripeMetadata({ loreguardPlanId: "publisher" })).toBe("publisher");
    expect(resolvePlanIdFromStripeMetadata({ loreguardPlanId: "unknown" })).toBeNull();
  });
});
