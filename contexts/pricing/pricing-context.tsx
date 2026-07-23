import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CUSTOMER_ROLES,
  type CustomerRole,
} from "@/constants/pricing";
import {
  requestPriceQuote,
  subscribeToCurrentRole,
} from "@/services/pricing/price-quote-service";
import type {
  PriceQuote,
  PriceQuoteError,
  PriceQuoteItemInput,
  PriceQuoteRequest,
} from "@/constants/pricing/contract";

type QuoteState = {
  error: PriceQuoteError | null;
  isFetching: boolean;
  quote: PriceQuote | null;
};

type PricingContextValue = {
  clearQuote: () => void;
  error: PriceQuoteError | null;
  isFetching: boolean;
  quote: PriceQuote | null;
  requestQuote: (request: PriceQuoteRequest) => Promise<PriceQuote | null>;
  role: CustomerRole;
};

const initialState: QuoteState = { error: null, isFetching: false, quote: null };

const PricingContext = createContext<PricingContextValue | undefined>(undefined);

export function PricingProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<CustomerRole>("guest");
  const [quoteState, setQuoteState] = useState<QuoteState>(initialState);

  useEffect(() => {
    const unsubscribe = subscribeToCurrentRole((nextRole) => {
      setRole((CUSTOMER_ROLES as readonly string[]).includes(nextRole) ? nextRole : "guest");
    });
    return unsubscribe;
  }, []);

  const value = useMemo<PricingContextValue>(
    () => ({
      clearQuote: () => setQuoteState(initialState),
      error: quoteState.error,
      isFetching: quoteState.isFetching,
      quote: quoteState.quote,
      requestQuote: async (request: PriceQuoteRequest) => {
        if (request.items.length === 0) {
          setQuoteState({ error: null, isFetching: false, quote: null });
          return null;
        }
        setQuoteState((current) => ({ ...current, error: null, isFetching: true }));
        try {
          const quote = await requestPriceQuote(request);
          setQuoteState({ error: null, isFetching: false, quote });
          return quote;
        } catch (error) {
          const pricingError: PriceQuoteError =
            (error as PriceQuoteError) ?? {
              code: "unavailable",
              message: "We could not refresh pricing right now.",
            };
          setQuoteState({
            error: pricingError,
            isFetching: false,
            quote: null,
          });
          return null;
        }
      },
      role,
    }),
    [quoteState, role],
  );

  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): PricingContextValue {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error("usePricing must be used inside <PricingProvider />");
  }
  return context;
}

export function useRoleBadge(): { role: CustomerRole; label: string } {
  const { role } = usePricing();
  const label =
    role === "contractor"
      ? "Contractor"
      : role === "dealer"
        ? "Dealer"
        : role === "customer"
          ? "Member"
          : "Retail";
  return { label, role };
}

export function useLinePriceLookup() {
  const { quote } = usePricing();
  return (productId: string): PriceQuote["lines"][number] | null => {
    if (!quote) return null;
    return quote.lines.find((line) => line.productId === productId) ?? null;
  };
}

export function buildQuoteRequest(items: PriceQuoteItemInput[], extras?: { cityId?: string; couponCode?: string }): PriceQuoteRequest {
  return {
    cityId: extras?.cityId,
    couponCode: extras?.couponCode,
    items: items.filter((item) => item.quantity > 0),
  };
}
