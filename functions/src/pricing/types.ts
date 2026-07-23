// Wire-format types shared with the React Native client. Keep this file
// manually in sync with constants/pricing/contract.ts; a CI guard can be
// added later to enforce equivalence via JSON schema snapshots.

export type CustomerRole = "guest" | "customer" | "contractor" | "dealer";

export type PricingBand = "retail" | "tier1" | "tier2" | "tier3";

export type PriceQuoteItemInput = {
  productId: string;
  quantity: number;
};

export type PriceQuoteLine = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  basePrice: number;
  effectiveUnitPrice: number;
  lineTotal: number;
  appliedBand: PricingBand;
  discountReason: string;
};

export type PriceQuoteCoupon = {
  code: string;
  percentOff: number;
  minSubtotal: number;
};

export type PriceQuote = {
  quoteId: string;
  role: CustomerRole;
  source: "server";
  issuedAt: string;
  expiresAt: string;
  lines: PriceQuoteLine[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  couponApplied: PriceQuoteCoupon | null;
  contractorVerified: boolean;
};

export type PriceQuoteRequest = {
  items: PriceQuoteItemInput[];
  cityId?: string;
  couponCode?: string;
};
