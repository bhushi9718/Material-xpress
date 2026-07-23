import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
// React Native persistence is imported lazily to keep web builds tree-shakable.
type ReactNativeAuthModule = {
  getReactNativePersistence: (storage: unknown) => unknown;
};
let reactNativeAuthModule: ReactNativeAuthModule | null = null;
function loadReactNativeAuthModule(): ReactNativeAuthModule {
  if (reactNativeAuthModule) return reactNativeAuthModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@firebase/auth") as { getReactNativePersistence?: ReactNativeAuthModule["getReactNativePersistence"] };
  reactNativeAuthModule = {
    getReactNativePersistence: (storage) => {
      if (!mod.getReactNativePersistence) {
        throw new Error("React Native persistence is unavailable in this Firebase build.");
      }
      return mod.getReactNativePersistence(storage);
    },
  };
  return reactNativeAuthModule;
}
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { isContractorRole, type CustomerRole } from "@/constants/pricing";
import type {
  PriceQuote,
  PriceQuoteError,
  PriceQuoteItemInput,
  PriceQuoteRequest,
} from "@/constants/pricing/contract";
import {
  getFirebaseApp,
  getFirebaseFirestore,
  getFirebaseFunctions,
  hasFirebaseConfig,
} from "@/services/firebase/client";

const QUOTE_CACHE_PREFIX = "@material_xpress_price_quote";
const QUOTE_CACHE_TTL_MS = 60_000;

let cachedFirebaseAuth: Auth | null | undefined;

function getQuoteCacheKey(uid: string | null, items: PriceQuoteItemInput[], couponCode?: string) {
  const signature = items
    .slice()
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((item) => `${item.productId}:${item.quantity}`)
    .join("|");
  const safeUid = uid ?? "guest";
  const couponKey = couponCode ? `:${couponCode.toUpperCase()}` : "";
  return `${QUOTE_CACHE_PREFIX}:${safeUid}:${signature}${couponKey}`;
}

export async function getCachedPriceQuote(uid: string | null, items: PriceQuoteItemInput[], couponCode?: string): Promise<PriceQuote | null> {
  // Memoizing the last server-verified quote lets the UI show band and
  // totals without re-calling Functions on every render. We never reuse a
  // cached quote to bypass server validation -- checkout still re-quotes.
  // Always check the persistent cache; the client never trusts it for checkout.
  return readAsyncStorageQuote(getQuoteCacheKey(uid, items, couponCode));
}

async function readAsyncStorageQuote(key: string): Promise<PriceQuote | null> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { expiresAt: string; quote: PriceQuote };
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed.quote;
  } catch {
    return null;
  }
}

function persistQuote(key: string, quote: PriceQuote) {
  void AsyncStorage.setItem(
    key,
    JSON.stringify({ expiresAt: quote.expiresAt, quote }),
  ).catch(() => {
    // Cache failures are non-fatal; the next quote request will simply
    // re-call Functions and overwrite the entry.
  });
}

export function subscribeToCurrentRole(
  onChange: (role: CustomerRole) => void,
): () => void {
  if (!hasFirebaseConfig()) {
    onChange("guest");
    return () => {};
  }

  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    onChange("guest");
    return () => {};
  }

  return onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      onChange("guest");
      return;
    }
    void resolveRoleForUser(user).then(onChange);
  });
}

export async function resolveCurrentRole(): Promise<CustomerRole> {
  if (!hasFirebaseConfig()) return "guest";
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth?.currentUser) return "guest";
  return resolveRoleForUser(firebaseAuth.currentUser);
}

export async function requestPriceQuote(
  request: PriceQuoteRequest,
  options: { useCache?: boolean } = {},
): Promise<PriceQuote> {
  const useCache = options.useCache ?? true;
  const role = await resolveCurrentRole();
  const uid = role === "guest" ? null : getFirebaseAuth()?.currentUser?.uid ?? null;

  if (useCache) {
    const cached = await readAsyncStorageQuote(
      getQuoteCacheKey(uid, request.items, request.couponCode),
    );
    if (cached) return cached;
  }

  if (!hasFirebaseConfig() || !getFirebaseFunctions()) {
    throw createPricingError(
      "unavailable",
      "Pricing is currently unavailable. Please try again shortly.",
    );
  }

  const callable = httpsCallable<PriceQuoteRequest, PriceQuote>(
    getFirebaseFunctions()!,
    "priceQuote",
  );

  try {
    const result = await callable(request);
    const quote = result.data;
    persistQuote(getQuoteCacheKey(uid, request.items, request.couponCode), quote);
    return quote;
  } catch (error) {
    throw normalizeCallableError(error);
  }
}

export function summariseQuote(quote: PriceQuote): string {
  const savings = Math.max(0, quote.subtotal - quote.grandTotal);
  if (savings <= 0) return quote.role === "guest" ? "Retail pricing" : "Verified pricing";
  return `${isContractorRole(quote.role) ? "Contractor" : "Member"} price: ${formatSavings(savings)} saved`;
}

function formatSavings(value: number): string {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

function normalizeCallableError(error: unknown): PriceQuoteError {
  const candidate = error as { code?: string; message?: string; details?: unknown };
  const code = (candidate.code ?? "unavailable") as PriceQuoteError["code"];
  return {
    code,
    message:
      candidate.message ??
      "We could not fetch the latest price. Please refresh and try again.",
  };
}

function createPricingError(
  code: PriceQuoteError["code"],
  message: string,
): PriceQuoteError {
  return { code, message };
}

async function resolveRoleForUser(user: User | null): Promise<CustomerRole> {
  if (!user) return "guest";
  const firestore = getFirebaseFirestore();
  if (!firestore) return "customer";
  try {
    const snapshot = await getDoc(doc(firestore, "users", user.uid));
    if (!snapshot.exists()) return "customer";
    const raw = snapshot.data()?.role;
    return typeof raw === "string" && (["guest", "customer", "contractor", "dealer"] as const).includes(raw as CustomerRole)
      ? (raw as CustomerRole)
      : "customer";
  } catch {
    return "customer";
  }
}

function getFirebaseAuth(): Auth | null {
  if (cachedFirebaseAuth !== undefined) return cachedFirebaseAuth;
  const app = getFirebaseApp();
  if (!app) {
    cachedFirebaseAuth = null;
    return cachedFirebaseAuth;
  }
  try {
    if (Platform.OS === "web") {
      cachedFirebaseAuth = getAuth(app);
      return cachedFirebaseAuth;
    }
    const { getReactNativePersistence } = loadReactNativeAuthModule();
    cachedFirebaseAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as never,
    });
    return cachedFirebaseAuth;
  } catch {
    cachedFirebaseAuth = getAuth(app);
    return cachedFirebaseAuth;
  }
}

// Exposed for unit tests; not part of the public client contract.
export const __testing = {
  QUOTE_CACHE_TTL_MS,
  getQuoteCacheKey,
};
