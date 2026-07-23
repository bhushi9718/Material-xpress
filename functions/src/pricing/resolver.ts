import type {
  CustomerRole,
  PriceQuote,
  PriceQuoteCoupon,
  PriceQuoteLine,
  PriceQuoteRequest,
  PricingBand,
} from "./types";

// Authoritative pricing engine. This file must not import any UI code or
// React Native helpers. It is pure and unit-tested in test/pricing.test.ts.

export type PricingProduct = {
  contractorPrice: number | null;
  id: string;
  name: string;
  unit: string;
  basePrice: number;
};

export type PricingCouponInput = {
  active: boolean;
  code: string;
  expiresAt: string | null;
  minSubtotal: number;
  percentOff: number;
  roleRestriction: CustomerRole[] | null;
};

export type ResolveOptions = {
  coupon: PricingCouponInput | null;
  now: Date;
  products: PricingProduct[];
  request: PriceQuoteRequest;
  role: CustomerRole;
};

const PRICE_EPSILON = 0.005;
const MAX_ITEMS = 50;
const MAX_QUANTITY = 100_000;

export const PRICING_BANDS: ReadonlyArray<{
  id: PricingBand;
  minQuantity: number;
  discountPercent: number;
}> = [
  { id: "retail", minQuantity: 1, discountPercent: 0 },
  { id: "tier1", minQuantity: 10, discountPercent: 7 },
  { id: "tier2", minQuantity: 50, discountPercent: 12 },
  { id: "tier3", minQuantity: 200, discountPercent: 18 },
];

export class PricingValidationError extends Error {
  constructor(
    public readonly code: "invalid-argument" | "not-found",
    message: string,
    public readonly invalidProductIds: string[] = [],
  ) {
    super(message);
    this.name = "PricingValidationError";
  }
}

function isContractorRole(role: CustomerRole): boolean {
  return role === "contractor" || role === "dealer";
}

function roundCurrency(value: number): number {
  // Banker's rounding would be Math.round at half-up but INR paise precision
  // is 2 decimal places. We use the standard Math.round which rounds half-up
  // -- industry standard for retail invoicing.
  const cents = Math.round(value * 100);
  return cents / 100;
}

export function resolvePricingBand(quantity: number): PricingBand {
  const safe = Math.max(0, Math.floor(quantity));
  const match = [...PRICING_BANDS]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((band) => safe >= band.minQuantity);
  return match?.id ?? "retail";
}

function isCouponEligible(
  coupon: PricingCouponInput | null,
  role: CustomerRole,
  subtotal: number,
  now: Date,
): PriceQuoteCoupon | null {
  if (!coupon || !coupon.active) return null;
  if (coupon.expiresAt) {
    const expiresAt = new Date(coupon.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return null;
    if (now.getTime() > expiresAt.getTime()) return null;
  }
  if (subtotal + PRICE_EPSILON < coupon.minSubtotal) return null;
  if (coupon.roleRestriction && coupon.roleRestriction.length > 0) {
    if (!coupon.roleRestriction.includes(role)) return null;
  }
  return {
    code: coupon.code,
    minSubtotal: coupon.minSubtotal,
    percentOff: coupon.percentOff,
  };
}

export function resolvePriceQuote(options: ResolveOptions): Omit<PriceQuote, "quoteId" | "issuedAt" | "expiresAt" | "contractorVerified"> {
  const { products, request, role, coupon, now } = options;

  if (!Array.isArray(request.items)) {
    throw new PricingValidationError("invalid-argument", "items must be an array.");
  }
  if (request.items.length === 0) {
    throw new PricingValidationError("invalid-argument", "Provide at least one cart line to quote.");
  }
  if (request.items.length > MAX_ITEMS) {
    throw new PricingValidationError(
      "invalid-argument",
      `Cart supports at most ${MAX_ITEMS} lines per quote.`,
    );
  }

  const productIndex = new Map(products.map((p) => [p.id, p]));
  const lines: PriceQuoteLine[] = [];
  const invalid: string[] = [];
  let subtotal = 0;

  for (const raw of request.items) {
    const productId = typeof raw?.productId === "string" ? raw.productId : "";
    const quantity = typeof raw?.quantity === "number" ? Math.floor(raw.quantity) : 0;

    if (!productId || quantity <= 0 || quantity > MAX_QUANTITY) {
      invalid.push(productId || "(missing-id)");
      continue;
    }

    const product = productIndex.get(productId);
    if (!product) {
      invalid.push(productId);
      continue;
    }

    const band = resolvePricingBand(quantity);
    const bandDescriptor = PRICING_BANDS.find((b) => b.id === band);
    const discountPercent = bandDescriptor?.discountPercent ?? 0;

    let effectiveUnitPrice = product.basePrice;
    let reason: PriceQuoteLine["discountReason"] = "retail";

    if (
      isContractorRole(role) &&
      typeof product.contractorPrice === "number" &&
      product.contractorPrice > 0 &&
      product.contractorPrice + PRICE_EPSILON < product.basePrice
    ) {
      effectiveUnitPrice = roundCurrency(product.contractorPrice);
      reason = "contractor-override";
    } else if (discountPercent > 0) {
      effectiveUnitPrice = roundCurrency(product.basePrice * (1 - discountPercent / 100));
      reason = "volume-band";
    } else if (isContractorRole(role)) {
      reason = "retail-tiered";
    }

    const lineTotal = roundCurrency(effectiveUnitPrice * quantity);
    subtotal = roundCurrency(subtotal + lineTotal);

    lines.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      quantity,
      basePrice: product.basePrice,
      effectiveUnitPrice,
      lineTotal,
      appliedBand: band,
      discountReason: reason,
    });
  }

  if (lines.length === 0) {
    throw new PricingValidationError(
      "not-found",
      "None of the requested products are available for pricing.",
      invalid,
    );
  }

  const appliedCoupon = isCouponEligible(coupon, role, subtotal, now);
  let discountTotal = 0;
  if (appliedCoupon) {
    discountTotal = roundCurrency(
      Math.min(subtotal, (subtotal * appliedCoupon.percentOff) / 100),
    );
  }

  return {
    lines,
    subtotal,
    discountTotal,
    grandTotal: roundCurrency(subtotal - discountTotal),
    couponApplied: appliedCoupon,
    role,
    source: "server",
  };
}
