import { randomUUID } from "node:crypto";

import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { PricingValidationError, resolvePriceQuote } from "./pricing/resolver";
import {
  fetchCoupon,
  fetchProducts,
  fetchRoleForUser,
} from "./pricing/repository";
import type {
  PriceQuote,
  PriceQuoteLine,
  PriceQuoteRequest,
} from "./pricing/types";

const QUOTE_TTL_MS = 5 * 60 * 1000;

let cachedFirestore: Firestore | null | undefined;

function getFirestoreOrNull(): Firestore | null {
  if (cachedFirestore !== undefined) return cachedFirestore;
  try {
    cachedFirestore = getFirestore();
    return cachedFirestore;
  } catch {
    cachedFirestore = null;
    return cachedFirestore;
  }
}

function sanitizeItems(input: unknown): PriceQuoteRequest["items"] {
  if (!Array.isArray(input)) {
    throw new HttpsError("invalid-argument", "items must be an array.");
  }
  return input.map((raw) => {
    if (!raw || typeof raw !== "object") {
      throw new HttpsError("invalid-argument", "Each cart line must be an object.");
    }
    const productId = typeof (raw as Record<string, unknown>).productId === "string"
      ? (raw as Record<string, unknown>).productId as string
      : "";
    const quantityRaw = (raw as Record<string, unknown>).quantity;
    const quantity = typeof quantityRaw === "number" && Number.isFinite(quantityRaw)
      ? Math.floor(quantityRaw)
      : 0;
    return { productId, quantity };
  });
}

export const priceQuote = onCall({ region: "asia-south1", cors: false }, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Sign in to fetch verified contractor or wholesale pricing.",
    );
  }

  const uid = request.auth.uid;
  const payload = (request.data ?? {}) as Record<string, unknown>;
  const cityId = typeof payload.cityId === "string" ? payload.cityId : undefined;
  const couponCode = typeof payload.couponCode === "string" ? payload.couponCode : undefined;
  let items: PriceQuoteRequest["items"];

  try {
    items = sanitizeItems(payload.items);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("invalid-argument", "items payload is malformed.");
  }

  if (items.length === 0) {
    throw new HttpsError("invalid-argument", "Cart is empty.");
  }

  const roleProfile = await fetchRoleForUser(uid);
  const productIds = Array.from(new Set(items.map((item) => item.productId).filter(Boolean)));
  const productMap = await fetchProducts(productIds);
  const products = productIds
    .map((id) => productMap.get(id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));
  const coupon = await fetchCoupon(couponCode);

  const now = new Date();

  try {
    const resolution = resolvePriceQuote({
      coupon,
      now,
      products,
      request: { cityId, couponCode, items },
      role: roleProfile.role,
    });

    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS).toISOString();
    const quote: PriceQuote = {
      ...resolution,
      contractorVerified: roleProfile.role === "contractor" || roleProfile.role === "dealer",
      expiresAt,
      issuedAt,
      quoteId: randomUUID(),
      // source: "server" is asserted via the resolver; re-assert here so the
      // wire payload is always labelled.
      source: "server",
    };

    await persistQuoteAudit(uid, quote);
    return quote;
  } catch (error) {
    if (error instanceof PricingValidationError) {
      throw new HttpsError(error.code, error.message, { invalidProductIds: error.invalidProductIds });
    }
    throw new HttpsError("internal", "Unable to resolve price quote.");
  }
});

async function persistQuoteAudit(uid: string, quote: PriceQuote) {
  const firestore = getFirestoreOrNull();
  if (!firestore) return;
  const auditRef = firestore
    .collection(`users/${uid}/priceQuotes`)
    .doc(quote.quoteId);
  await auditRef.set({
    couponApplied: quote.couponApplied,
    discountTotal: quote.discountTotal,
    grandTotal: quote.grandTotal,
    issuedAt: quote.issuedAt,
    lines: quote.lines.map((line: PriceQuoteLine) => ({
      appliedBand: line.appliedBand,
      basePrice: line.basePrice,
      discountReason: line.discountReason,
      effectiveUnitPrice: line.effectiveUnitPrice,
      lineTotal: line.lineTotal,
      productId: line.productId,
      quantity: line.quantity,
    })),
    role: quote.role,
    subtotal: quote.subtotal,
  });
}

export const priceQuoteBatch = onCall({ region: "asia-south1" }, async (request) => {
  // Lightweight metadata endpoint used by the storefront to render "verified
  // contractor pricing" badges. Returns the caller's effective role and the
  // minimum band thresholds so the UI can show appropriate hints.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to view pricing context.");
  }
  const roleProfile = await fetchRoleForUser(request.auth.uid);
  return {
    contractorVerified: roleProfile.role === "contractor" || roleProfile.role === "dealer",
    role: roleProfile.role,
  };
});
