// Customer roles recognised by the Material Xpress pricing engine.
//
// Pricing tier resolution (guest vs customer vs contractor vs dealer) is
// always performed on the server. These types are mirrored on the client so
// the UI can describe what the customer is eligible for and which tier the
// server confirmed in its most recent price quote. The client never decides
// its own tier -- it only renders what the server has stamped on a quote.

export type CustomerRole = "guest" | "customer" | "contractor" | "dealer";

export const CUSTOMER_ROLES: readonly CustomerRole[] = [
  "guest",
  "customer",
  "contractor",
  "dealer",
] as const;

// Volume bands drive wholesale discounts. They are deliberately coarse: a
// small upgrade in cart quantity should not reshuffle the discount a buyer
// sees. The same bands are enforced server-side in functions/src/pricing.
export type PricingBand = "retail" | "tier1" | "tier2" | "tier3";

export type PricingBandDescriptor = {
  id: PricingBand;
  label: string;
  minQuantity: number;
  // Discount is applied on top of the role-aware base price.
  discountPercent: number;
  // Short sales-friendly label rendered under the price.
  blurb: string;
};

export const PRICING_BANDS: readonly PricingBandDescriptor[] = [
  {
    id: "retail",
    label: "Retail",
    minQuantity: 1,
    discountPercent: 0,
    blurb: "Standard retail rate.",
  },
  {
    id: "tier1",
    label: "Bulk 10+",
    minQuantity: 10,
    discountPercent: 7,
    blurb: "Bulk savings kick in at 10 units.",
  },
  {
    id: "tier2",
    label: "Wholesale 50+",
    minQuantity: 50,
    discountPercent: 12,
    blurb: "Wholesale tier at 50+ units.",
  },
  {
    id: "tier3",
    label: "Project 200+",
    minQuantity: 200,
    discountPercent: 18,
    blurb: "Project pricing for 200+ units.",
  },
] as const;

export function resolvePricingBand(quantity: number): PricingBand {
  const safeQuantity = Math.max(0, Math.floor(quantity));
  const match = [...PRICING_BANDS]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((band) => safeQuantity >= band.minQuantity);
  return match?.id ?? "retail";
}

export function getPricingBand(id: PricingBand): PricingBandDescriptor {
  return PRICING_BANDS.find((band) => band.id === id) ?? PRICING_BANDS[0];
}

export function isContractorRole(role: CustomerRole): boolean {
  return role === "contractor" || role === "dealer";
}
