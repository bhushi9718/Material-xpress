import { getFirestore, type Firestore } from "firebase-admin/firestore";

import type { CustomerRole } from "./types";

export type CatalogProduct = {
  basePrice: number;
  contractorPrice: number | null;
  id: string;
  name: string;
  unit: string;
};

export type CouponRecord = {
  active: boolean;
  code: string;
  expiresAt: string | null;
  minSubtotal: number;
  percentOff: number;
  roleRestriction: CustomerRole[] | null;
};

export type RoleProfile = {
  role: CustomerRole;
};

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

export async function fetchProducts(productIds: string[]): Promise<Map<string, CatalogProduct>> {
  const firestore = getFirestoreOrNull();
  const map = new Map<string, CatalogProduct>();

  if (firestore) {
    // Chunk reads to stay under Firestore's 30 items per `getAll` call.
    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += 30) {
      chunks.push(productIds.slice(i, i + 30));
    }
    for (const chunk of chunks) {
      const refs = chunk.map((id) => firestore.doc(`products/${id}`));
      const snapshots = await firestore.getAll(...refs);
      snapshots.forEach((snap) => {
        if (!snap.exists) return;
        const data = snap.data();
        map.set(snap.id, {
          basePrice: numberOrZero(data.basePrice),
          contractorPrice: numberOrNull(data.contractorPrice),
          id: snap.id,
          name: typeof data.name === "string" ? data.name : snap.id,
          unit: typeof data.unit === "string" ? data.unit : "piece",
        });
      });
    }
    return map;
  }

  // Emulator/local mode: fall back to a static catalog the developer keeps in
  // firestore.rules fixtures. This keeps pricing logic exercised even before
  // the real catalog is migrated.
  for (const id of productIds) {
    const fallback = STATIC_FALLBACK_CATALOG.get(id);
    if (fallback) map.set(id, fallback);
  }
  return map;
}

export async function fetchCoupon(code: string | undefined): Promise<CouponRecord | null> {
  if (!code) return null;
  const firestore = getFirestoreOrNull();
  if (firestore) {
    const snap = await firestore.doc(`coupons/${code.toUpperCase()}`).get();
    if (!snap.exists) return null;
    const data = snap.data();
    return {
      active: data.active === true,
      code,
      expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : null,
      minSubtotal: numberOrZero(data.minSubtotal),
      percentOff: numberOrZero(data.percentOff),
      roleRestriction: Array.isArray(data.roleRestriction)
        ? (data.roleRestriction.filter((r: unknown) =>
            ["guest", "customer", "contractor", "dealer"].includes(r as string),
          ) as CustomerRole[])
        : null,
    };
  }
  return STATIC_FALLBACK_COUPONS.get(code.toUpperCase()) ?? null;
}

export async function fetchRoleForUser(uid: string): Promise<RoleProfile> {
  const firestore = getFirestoreOrNull();
  if (firestore) {
    const snap = await firestore.doc(`users/${uid}`).get();
    if (!snap.exists) return { role: "customer" };
    const data = snap.data();
    const role = data?.role;
    if (role === "guest" || role === "customer" || role === "contractor" || role === "dealer") {
      return { role };
    }
    return { role: "customer" };
  }
  return { role: "customer" };
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const STATIC_FALLBACK_CATALOG: Map<string, CatalogProduct> = new Map([
  ["soft-close-hinge", { basePrice: 248, contractorPrice: 220, id: "soft-close-hinge", name: "SS 304 Soft Close Cabinet Hinge", unit: "pair" }],
  ["mortise-lock-body", { basePrice: 680, contractorPrice: null, id: "mortise-lock-body", name: "Mortise Lock Body 60mm", unit: "piece" }],
  ["aluminium-d-handle", { basePrice: 210, contractorPrice: null, id: "aluminium-d-handle", name: "Aluminium D Handle 300mm", unit: "piece" }],
  ["drawer-slide-450", { basePrice: 432, contractorPrice: 395, id: "drawer-slide-450", name: "Telescopic Drawer Slide 450mm", unit: "pair" }],
  ["drawer-slide-350", { basePrice: 385, contractorPrice: null, id: "drawer-slide-350", name: "Undermount Soft Close Slide 350mm", unit: "pair" }],
  ["cabinet-knob-set", { basePrice: 280, contractorPrice: null, id: "cabinet-knob-set", name: "Brass Cabinet Knob Set", unit: "pack" }],
  ["wood-screws-box", { basePrice: 90, contractorPrice: 78, id: "wood-screws-box", name: "Wood Screws 1.5 inch", unit: "box" }],
  ["fevicol-pro", { basePrice: 210, contractorPrice: null, id: "fevicol-pro", name: "Fevicol Pro 1kg", unit: "tin" }],
]);

const STATIC_FALLBACK_COUPONS: Map<string, CouponRecord> = new Map([
  ["CONTRACTOR10", { active: true, code: "CONTRACTOR10", expiresAt: null, minSubtotal: 1000, percentOff: 10, roleRestriction: ["contractor", "dealer"] }],
  ["WELCOME5", { active: true, code: "WELCOME5", expiresAt: null, minSubtotal: 500, percentOff: 5, roleRestriction: null }],
]);
