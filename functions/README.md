# Material Xpress Pricing Functions

Firebase Cloud Functions (v2, TypeScript) that own the contractor B2B pricing
engine. The React Native client never decides its own tier -- it asks this
service for a verified `priceQuote` and renders what comes back.

## Architecture

- `src/pricing/resolver.ts` -- pure pricing engine (tiers, overrides,
  coupons, rounding). No I/O. Fully unit tested.
- `src/pricing/repository.ts` -- Firestore lookups for products, coupons and
  user role. Includes a static fallback catalog for local emulator runs.
- `src/pricing/types.ts` -- wire-format shared with the RN client. Keep in
  sync with `constants/pricing/contract.ts`.
- `src/index.ts` -- exposes two v2 callables:
  - `priceQuote({ items, cityId?, couponCode? })` returns a `PriceQuote`.
  - `priceQuoteBatch()` returns `{ role, contractorVerified }` for badge use.

## Deploy

```bash
npm install --prefix functions
npm run --prefix functions build
firebase deploy --only functions
```

## Call from the React Native client

```ts
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/services/firebase/client";

const priceQuote = httpsCallable(getFirebaseFunctions()!, "priceQuote");
const { data } = await priceQuote({
  items: [{ productId: "soft-close-hinge", quantity: 60 }],
  couponCode: "CONTRACTOR10",
});
```

The `data` shape is the `PriceQuote` interface from
`constants/pricing/contract.ts`. Quotes expire after five minutes.

## Tests

```bash
npm run --prefix functions test
```

Vitest covers: all four volume bands, per-SKU contractor override, coupon
eligibility (role restriction, min subtotal, expiry, over-cap), and input
validation.
