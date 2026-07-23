import {
  CUSTOMER_ROLES,
  PRICING_BANDS,
  resolvePricingBand,
  type CustomerRole,
  type PricingBand,
  type PricingBandDescriptor,
} from "@/constants/pricing";
import type {
  PriceQuoteCoupon,
  PriceQuoteLine,
} from "@/constants/pricing/contract";

// Pure pricing engine shared between the client (preview/estimate only) and
// the server (authoritative). The Functions code re-implements the same
// rules; this file mirrors that logic so the UI can label lines and show
// "verified by server" badges. Never trust this on the client when accepting
// money -- the server's quote is the only source of truth at checkout.

export type PricingProduct = {
  id: string;
  name: string;
  unit: string;
  basePrice: number;
  contractorPrice?: number | null;
};

export type PricingCoupon = {
  code: string;
  percentOff: number;
  minSubtotal: number;
  active: boolean;
  roleRestriction?: CustomerRole[] | null;
  expiresAt?: string | null;
};

export type PricingResolveParams = {
  role: CustomerRole;
  products: PricingProduct[];
  items: Array<{ productId: string; quantity: number }>;
  coupon?: PricingCoupon | null;
  now?: Date;
};

export type PricingResolveResult = {
  lines: PriceQuoteLine[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  couponApplied: PriceQuoteCoupon | null;
  band: PricingBand;
};

const PRICE_EPSILON = 0.005;

function roundCurrency(value: number): number {
  // Banker's rounding to 2dp keeps long cart totals aligned with how Indian
  // tax rules are computed (Paise precision).
  const cents = Math.round(value * 100);
  return cents / 100;
}

function isContractorRole(role: CustomerRole) {
  return role === "contractor" || role === "dealer";
}

function isCouponValid(coupon: PricingCoupon | null | undefined, now: Date) {
  if (!coupon || !coupon.active) return false;
  if (coupon.expiresAt) {
    const expiresAt = new Date(coupon.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return false;
    if (now.getTime() > expiresAt.getTime()) return false;
  }
  return true;
}

function resolveLinePrice(
  product: PricingProduct,
  quantity: number,
  role: CustomerRole,
): { basePrice: number; effectiveUnitPrice: number; band: PricingBand; reason: string } {
  const band = resolvePricingBand(quantity);
  const basePrice = product.basePrice;

  // Contractor/dealer tier wins when a per-SKU override is published. The
  // override bypasses the volume band on purpose -- large framework deals
  // are negotiated per SKU and shouldn't be undercut by the generic bands.
  if (
    isContractorRole(role) &&
    typeof product.contractorPrice === "number" &&
    product.contractorPrice > 0 &&
    product.contractorPrice < basePrice - PRICE_EPSILON
  ) {
    return {
      basePrice,
      band,
      effectiveUnitPrice: roundCurrency(product.contractorPrice),
      reason: "contractor-override",
    };
  }

  const bandDescriptor: PricingBandDescriptor | undefined = PRICING_BANDS.find(
    (b) => b.id === band,
  );
  const discount = bandDescriptor?.discountPercent ?? 0;

  if (discount > 0) {
    return {
      basePrice,
      band,
      effectiveUnitPrice: roundCurrency(basePrice * (1 - discount / 100)),
      reason: "volume-band",
    };
  }

  return {
    basePrice,
    band,
    effectiveUnitPrice: roundCurrency(basePrice),
    reason: role === "guest" || role === "customer" ? "retail" : "retail-tiered",
  };
}

export function isKnownRole(role: string): role is CustomerRole {
  return (CUSTOMER_ROLES as readonly string[]).includes(role);
}

export function resolvePriceQuote(
  params: PricingResolveParams,
): PricingResolveResult {
  const now = params.now ?? new Date();
  const productIndex = new Map(params.products.map((p) => [p.id, p]));

  const lines: PriceQuoteLine[] = [];
  let subtotal = 0;

  for (const item of params.items) {
    const product = productIndex.get(item.productId);
    if (!product) continue;

    const resolved = resolveLinePrice(product, item.quantity, params.role);
    const lineTotal = roundCurrency(resolved.effectiveUnitPrice * item.quantity);
    subtotal = roundCurrency(subtotal + lineTotal);

    lines.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      quantity: item.quantity,
      basePrice: resolved.basePrice,
      effectiveUnitPrice: resolved.effectiveUnitPrice,
      lineTotal,
      appliedBand: resolved.band,
      discountReason: resolved.reason,
    });
  }

  let couponApplied: PriceQuoteCoupon | null = null;
  let discountTotal = 0;

  if (isCouponValid(params.coupon, now) && params.coupon) {
    const meetsMinimum = subtotal >= params.coupon.minSubtotal;
    const roleAllowed =
      !params.coupon.roleRestriction ||
      params.coupon.roleRestriction.length === 0 ||
      params.coupon.roleRestriction.includes(params.role);

    if (meetsMinimum && roleAllowed) {
      couponApplied = {
        code: params.coupon.code,
        minSubtotal: params.coupon.minSubtotal,
        percentOff: params.coupon.percentOff,
      };
      discountTotal = roundCurrency(
        Math.min(subtotal, (subtotal * params.coupon.percentOff) / 100),
      );
    }
  }

  const grandTotal = roundCurrency(subtotal - discountTotal);

  return {
    band: lines.length > 0 ? resolvePricingBand(maxQuantity(lines)) : "retail",
    couponApplied,
    discountTotal,
    grandTotal,
    lines,
    subtotal,
  };
}

function maxQuantity(lines: PriceQuoteLine[]): number {
  return lines.reduce((max, line) => Math.max(max, line.quantity), 0);
}

export function summariseRole(role: CustomerRole) {
  if (role === "contractor") return "Contractor pricing";
  if (role === "dealer") return "Dealer pricing";
  if (role === "customer") return "Signed-in retail";
  return "Guest retail";
}
