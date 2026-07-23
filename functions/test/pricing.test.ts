import { describe, expect, it } from "vitest";

import {
  PRICING_BANDS,
  PricingValidationError,
  resolvePriceQuote,
  resolvePricingBand,
  type PricingCouponInput,
  type PricingProduct,
} from "../src/pricing/resolver";

const catalog: PricingProduct[] = [
  { basePrice: 248, contractorPrice: 220, id: "soft-close-hinge", name: "SS 304 Soft Close Cabinet Hinge", unit: "pair" },
  { basePrice: 680, contractorPrice: null, id: "mortise-lock-body", name: "Mortise Lock Body 60mm", unit: "piece" },
  { basePrice: 90, contractorPrice: 78, id: "wood-screws-box", name: "Wood Screws 1.5 inch", unit: "box" },
];

const fixedNow = new Date("2026-06-25T10:00:00Z");

function quote(overrides: Partial<Parameters<typeof resolvePriceQuote>[0]> = {}) {
  return resolvePriceQuote({
    coupon: overrides.coupon ?? null,
    now: overrides.now ?? fixedNow,
    products: overrides.products ?? catalog,
    request: overrides.request ?? { items: [{ productId: "mortise-lock-body", quantity: 1 }] },
    role: overrides.role ?? "customer",
  });
}

describe("resolvePricingBand", () => {
  it("picks the right band for each volume threshold", () => {
    expect(resolvePricingBand(1)).toBe("retail");
    expect(resolvePricingBand(9)).toBe("retail");
    expect(resolvePricingBand(10)).toBe("tier1");
    expect(resolvePricingBand(49)).toBe("tier1");
    expect(resolvePricingBand(50)).toBe("tier2");
    expect(resolvePricingBand(199)).toBe("tier2");
    expect(resolvePricingBand(200)).toBe("tier3");
  });
});

describe("resolvePriceQuote", () => {
  it("uses retail pricing for guest/customer on small quantities", () => {
    const result = quote();
    expect(result.role).toBe("customer");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].effectiveUnitPrice).toBe(680);
    expect(result.grandTotal).toBe(680);
    expect(result.discountTotal).toBe(0);
  });

  it("applies the per-SKU contractor override for contractor role", () => {
    const result = quote({
      request: { items: [{ productId: "soft-close-hinge", quantity: 5 }] },
      role: "contractor",
    });
    expect(result.lines[0].effectiveUnitPrice).toBe(220);
    expect(result.lines[0].discountReason).toBe("contractor-override");
  });

  it("falls back to volume band when no contractor override is set", () => {
    const result = quote({
      request: { items: [{ productId: "mortise-lock-body", quantity: 50 }] },
      role: "contractor",
    });
    expect(result.lines[0].appliedBand).toBe("tier2");
    // 680 * (1 - 0.12) = 598.4
    expect(result.lines[0].effectiveUnitPrice).toBe(598.4);
    expect(result.lines[0].discountReason).toBe("volume-band");
    // 598.4 * 50 = 29920
    expect(result.grandTotal).toBe(29920);
  });

  it("uses the tier3 band at 200+", () => {
    const result = quote({
      request: { items: [{ productId: "wood-screws-box", quantity: 200 }] },
      role: "customer",
    });
    expect(result.lines[0].appliedBand).toBe("tier3");
    // 90 * (1 - 0.18) = 73.8
    expect(result.lines[0].effectiveUnitPrice).toBe(73.8);
  });

  it("does not apply a contractor override to a guest", () => {
    const result = quote({
      request: { items: [{ productId: "soft-close-hinge", quantity: 1 }] },
      role: "guest",
    });
    expect(result.lines[0].effectiveUnitPrice).toBe(248);
  });

  it("rejects empty item arrays", () => {
    expect(() => quote({ request: { items: [] } })).toThrow(PricingValidationError);
  });

  it("rejects unknown product ids with invalidProductIds payload", () => {
    try {
      quote({ request: { items: [{ productId: "missing", quantity: 1 }] } });
      throw new Error("should not reach");
    } catch (error) {
      expect(error).toBeInstanceOf(PricingValidationError);
      expect((error as PricingValidationError).invalidProductIds).toContain("missing");
    }
  });

  it("rejects non-positive quantities", () => {
    expect(() =>
      quote({ request: { items: [{ productId: "mortise-lock-body", quantity: 0 }] } }),
    ).toThrow(PricingValidationError);
  });

  it("applies a coupon when eligible", () => {
    const coupon: PricingCouponInput = {
      active: true,
      code: "CONTRACTOR10",
      expiresAt: null,
      minSubtotal: 1000,
      percentOff: 10,
      roleRestriction: ["contractor", "dealer"],
    };
    const result = quote({
      coupon,
      request: { items: [{ productId: "mortise-lock-body", quantity: 5 }] },
      role: "contractor",
    });
    expect(result.couponApplied).not.toBeNull();
    // Subtotal is 680 * 5 = 3400, discount 10% = 340, grand total 3060.
    expect(result.subtotal).toBe(3400);
    expect(result.discountTotal).toBe(340);
    expect(result.grandTotal).toBe(3060);
  });

  it("rejects coupons whose role restriction does not match", () => {
    const coupon: PricingCouponInput = {
      active: true,
      code: "CONTRACTOR10",
      expiresAt: null,
      minSubtotal: 100,
      percentOff: 10,
      roleRestriction: ["contractor", "dealer"],
    };
    const result = quote({ coupon, role: "customer" });
    expect(result.couponApplied).toBeNull();
    expect(result.discountTotal).toBe(0);
  });

  it("rejects coupons whose minimum subtotal is not met", () => {
    const coupon: PricingCouponInput = {
      active: true,
      code: "BIGSPENDR",
      expiresAt: null,
      minSubtotal: 10000,
      percentOff: 15,
      roleRestriction: null,
    };
    const result = quote({ coupon, role: "contractor" });
    expect(result.couponApplied).toBeNull();
  });

  it("rejects expired coupons", () => {
    const coupon: PricingCouponInput = {
      active: true,
      code: "OLDFRIEND",
      expiresAt: "2025-01-01T00:00:00Z",
      minSubtotal: 0,
      percentOff: 50,
      roleRestriction: null,
    };
    const result = quote({ coupon });
    expect(result.couponApplied).toBeNull();
  });

  it("caps coupon discount at subtotal", () => {
    const coupon: PricingCouponInput = {
      active: true,
      code: "FIFTYOFF",
      expiresAt: null,
      minSubtotal: 0,
      percentOff: 200,
      roleRestriction: null,
    };
    const result = quote({ coupon });
    expect(result.discountTotal).toBe(result.subtotal);
    expect(result.grandTotal).toBe(0);
  });
});

describe("PRICING_BANDS ordering", () => {
  it("covers retail, tier1, tier2, tier3", () => {
    expect(PRICING_BANDS.map((b) => b.id)).toEqual(["retail", "tier1", "tier2", "tier3"]);
  });
});
