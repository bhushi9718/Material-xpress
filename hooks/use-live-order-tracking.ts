import { startTransition, useEffect, useState } from 'react';

import {
  DEFAULT_TRACKING_CITY_ID,
  getTrackingCityMeta,
  isOrderActive,
  subscribeToTrackedOrders,
  type OrderTrackingSnapshot,
} from '@/services/orders/order-tracking-service';

const INITIAL_SNAPSHOT: OrderTrackingSnapshot = {
  cityId: DEFAULT_TRACKING_CITY_ID,
  cityLabel: getTrackingCityMeta(DEFAULT_TRACKING_CITY_ID).label,
  orders: [],
  source: 'mock',
};

export function useLiveOrderTracking(cityId = DEFAULT_TRACKING_CITY_ID) {
  const [snapshot, setSnapshot] = useState<OrderTrackingSnapshot>(INITIAL_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    const unsubscribe = subscribeToTrackedOrders({
      cityId,
      onError: (error) => {
        setErrorMessage(error.message);
      },
      onUpdate: (nextSnapshot) => {
        startTransition(() => {
          setSnapshot(nextSnapshot);
          setIsLoading(false);
        });
      },
    });

    return unsubscribe;
  }, [cityId]);

  const activeOrder = snapshot.orders.find((order) => isOrderActive(order.statusKey)) ?? null;
  const historicalOrders = snapshot.orders.filter((order) => order.id !== activeOrder?.id);

  return {
    activeOrder,
    cityId: snapshot.cityId,
    cityLabel: snapshot.cityLabel,
    errorMessage,
    historicalOrders,
    isLoading,
    orders: snapshot.orders,
    source: snapshot.source,
  };
}
