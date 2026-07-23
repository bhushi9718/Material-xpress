import type { CustomerRole, PricingBand } from "./roles";

// Wire-format contract between Material Xpress Functions and the React Native
// client. Keep this in sync with functions/src/pricing/types.ts.

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
  // "contractor-override" / "volume-band" / "retail" -- tells the UI why a
  // price moved. Useful for explaining the quote in cart and order screens.
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
  // Lets the UI display a verified contractor badge without trusting the
  // local role claim.
  contractorVerified: boolean;
};

export type PriceQuoteRequest = {
  items: PriceQuoteItemInput[];
  cityId?: string;
  couponCode?: string;
};

export type PriceQuoteError = {
  code:
    | "invalid-argument"
    | "unauthenticated"
    | "permission-denied"
    | "not-found"
    | "failed-precondition"
    | "unavailable";
  message: string;
  invalidProductIds?: string[];
};
