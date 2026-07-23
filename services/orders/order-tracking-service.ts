import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type QuerySnapshot,
} from 'firebase/firestore';

import {
  orderHistory,
  type OrderHistoryItem,
} from '@/constants/material-data';
import { getFirebaseFirestore } from '@/services/firebase/client';

const TRACKING_STEPS = [
  {
    detail: 'Payment confirmed and your materials are queued for picking.',
    id: 'confirmed',
    title: 'Order confirmed',
  },
  {
    detail: 'Your order has been packed at the city fulfillment hub.',
    id: 'packed',
    title: 'Packed at city hub',
  },
  {
    detail: 'A rider has been reserved for your delivery cluster.',
    id: 'rider_assigned',
    title: 'Rider assigned',
  },
  {
    detail: 'Your hardware is on the way to the delivery address.',
    id: 'out_for_delivery',
    title: 'Out for delivery',
  },
  {
    detail: 'The order has been handed over at your drop location.',
    id: 'delivered',
    title: 'Delivered',
  },
] as const;

const STATUS_META = {
  cancelled: {
    accent: '#F17C74',
    defaultProgress: 0.14,
    label: 'Cancelled',
  },
  confirmed: {
    accent: '#7CB8FF',
    defaultProgress: 0.18,
    label: 'Confirmed',
  },
  delivered: {
    accent: '#70D999',
    defaultProgress: 1,
    label: 'Delivered',
  },
  out_for_delivery: {
    accent: '#4EE29B',
    defaultProgress: 0.82,
    label: 'Out for delivery',
  },
  packed: {
    accent: '#DAB35D',
    defaultProgress: 0.42,
    label: 'Packed',
  },
  rider_assigned: {
    accent: '#91D4FF',
    defaultProgress: 0.62,
    label: 'Rider assigned',
  },
} as const;

const CITY_META = {
  agra: {
    hubName: 'Agra Central Hub',
    label: 'Agra',
    zone: 'Sanjay Place Cluster',
  },
} as const;

const LIVE_ORDER_SEQUENCE = [
  'Rider cleared MG Road and is heading to your workshop lane.',
  'Delivery kit scanned at the last-mile stop near Civil Lines.',
  'Route optimized for a faster drop window on the current cluster.',
  'Rider is two stops away from your delivery point.',
];

export const DEFAULT_TRACKING_CITY_ID =
  process.env.EXPO_PUBLIC_MATERIAL_XPRESS_DEFAULT_CITY_ID ?? 'agra';

export type TrackingSource = 'firebase' | 'mock';

export type TrackingStatusKey =
  | 'cancelled'
  | 'confirmed'
  | 'delivered'
  | 'out_for_delivery'
  | 'packed'
  | 'rider_assigned';

export type TrackingStepState = 'cancelled' | 'complete' | 'current' | 'upcoming';

export type TrackingTimelineStep = {
  detail: string;
  id: string;
  state: TrackingStepState;
  timeLabel: string;
  title: string;
};

export type RiderAssignment = {
  cityId: string;
  name: string;
  phone: string;
  vehicleLabel: string;
  zone: string;
};

export type TrackedOrder = Omit<OrderHistoryItem, 'status' | 'statusAccent'> & {
  cityId: string;
  deliveryZone: string;
  etaLabel: string | null;
  etaMinutes: number | null;
  hubName: string;
  isRealtime: boolean;
  liveUpdate: string;
  progress: number;
  rider: RiderAssignment | null;
  source: TrackingSource;
  statusAccent: string;
  statusKey: TrackingStatusKey;
  statusLabel: string;
  timeline: TrackingTimelineStep[];
  updatedAtLabel: string;
};

export type OrderTrackingSnapshot = {
  cityId: string;
  cityLabel: string;
  orders: TrackedOrder[];
  source: TrackingSource;
};

type FirebaseOrderShape = {
  cityId?: unknown;
  date?: unknown;
  deliveryZone?: unknown;
  etaLabel?: unknown;
  etaMinutes?: unknown;
  hubName?: unknown;
  itemSummary?: unknown;
  liveUpdate?: unknown;
  orderId?: unknown;
  productIds?: unknown;
  progress?: unknown;
  reorderItems?: unknown;
  rider?: unknown;
  status?: unknown;
  statusAccent?: unknown;
  timeline?: unknown;
  total?: unknown;
  updatedAt?: unknown;
};

type SubscribeToTrackedOrdersParams = {
  cityId?: string;
  onError?: (error: Error) => void;
  onUpdate: (snapshot: OrderTrackingSnapshot) => void;
};

type TrackingCityMeta = {
  hubName: string;
  label: string;
  zone: string;
};

type TrackingTimelineTemplate = (typeof TRACKING_STEPS)[number];

export function subscribeToTrackedOrders({
  cityId = DEFAULT_TRACKING_CITY_ID,
  onError,
  onUpdate,
}: SubscribeToTrackedOrdersParams) {
  const firestore = getFirebaseFirestore();

  if (!firestore) {
    return subscribeToMockTracking({ cityId, onUpdate });
  }

  const cityMeta = getTrackingCityMeta(cityId);
  const ordersQuery = query(
    collection(firestore, 'cities', cityId, 'orders'),
    orderBy('updatedAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      const mergedOrders = mergeTrackedOrders(
        buildSeedTrackedOrders(cityId, 'firebase'),
        normalizeFirebaseOrders(snapshot, cityId)
      );

      onUpdate({
        cityId,
        cityLabel: cityMeta.label,
        orders: mergedOrders as TrackedOrder[],
        source: 'firebase',
      });
    },
    (error) => {
      const normalizedError =
        error instanceof Error ? error : new Error('Realtime tracking unavailable');

      console.warn('Firebase order tracking unavailable, falling back to local stream.', normalizedError);
      onError?.(normalizedError);

      const fallbackOrders = buildSeedTrackedOrders(cityId, 'mock');

      onUpdate({
        cityId,
        cityLabel: cityMeta.label,
        orders: fallbackOrders as TrackedOrder[],
        source: 'mock',
      });
    }
  );
}

export function isOrderActive(statusKey: TrackingStatusKey) {
  return (
    statusKey === 'confirmed' ||
    statusKey === 'packed' ||
    statusKey === 'rider_assigned' ||
    statusKey === 'out_for_delivery'
  );
}

export function getTrackingCityMeta(cityId: string): TrackingCityMeta {
  return CITY_META[cityId as keyof typeof CITY_META] ?? {
    hubName: 'Primary Fulfillment Hub',
    label: formatCityLabel(cityId),
    zone: 'Central Delivery Cluster',
  };
}

function subscribeToMockTracking({
  cityId,
  onUpdate,
}: Pick<SubscribeToTrackedOrdersParams, 'cityId' | 'onUpdate'>) {
  const cityMeta = getTrackingCityMeta(cityId);
  let currentOrders: TrackedOrder[] = buildSeedTrackedOrders(cityId, 'mock') as TrackedOrder[];
  let liveUpdateIndex = 0;

  onUpdate({
    cityId,
    cityLabel: cityMeta.label,
    orders: currentOrders,
    source: 'mock',
  });

  const intervalId = setInterval(() => {
    currentOrders = currentOrders.map((order) => {
      if (order.id !== 'ORD-8731' || !isOrderActive(order.statusKey)) {
        return order;
      }

      const nextEtaMinutes = Math.max(12, (order.etaMinutes ?? 46) - 3);
      const nextProgress = Math.min(0.96, order.progress + 0.035);
      const updatedAt = new Date();

      liveUpdateIndex = (liveUpdateIndex + 1) % LIVE_ORDER_SEQUENCE.length;

      return {
        ...order,
        etaLabel: formatEtaLabel(nextEtaMinutes),
        etaMinutes: nextEtaMinutes,
        liveUpdate: LIVE_ORDER_SEQUENCE[liveUpdateIndex],
        progress: nextProgress,
        source: 'mock',
        timeline: buildTimeline({
          statusKey: order.statusKey,
          updatedAt,
          riderName: order.rider?.name,
        }),
        updatedAtLabel: formatUpdatedAtLabel(updatedAt),
      };
    });

    onUpdate({
      cityId,
      cityLabel: cityMeta.label,
      orders: currentOrders as TrackedOrder[],
      source: 'mock',
    });
  }, 9000);

  return () => {
    clearInterval(intervalId);
  };
}

function normalizeFirebaseOrders(
  snapshot: QuerySnapshot,
  cityId: string
) {
  return snapshot.docs
    .map((docSnapshot) => {
      const payload = docSnapshot.data() as FirebaseOrderShape;
      const orderId = readString(payload.orderId) ?? docSnapshot.id;

      return normalizeFirebaseOrder(orderId, payload, cityId);
    })
    .filter((order): order is TrackedOrder => order !== null);
}

function normalizeFirebaseOrder(
  docId: string,
  payload: FirebaseOrderShape,
  cityId: string
): TrackedOrder | null {
  const baseOrder = orderHistory.find((order) => order.id === docId);
  const fallbackStatus = baseOrder ? normalizeTrackingStatus(baseOrder.status) : 'confirmed';
  const statusKey = normalizeTrackingStatus(readString(payload.status) ?? fallbackStatus);
  const cityMeta = getTrackingCityMeta(cityId);
  const updatedAt = toDate(payload.updatedAt) ?? new Date();
  const rider = normalizeRider(payload.rider, cityMeta, cityId);
  const progress =
    clampProgress(readNumber(payload.progress)) ??
    STATUS_META[statusKey].defaultProgress;
  const etaMinutes = readNumber(payload.etaMinutes);
  const total = readNumber(payload.total) ?? baseOrder?.total ?? 0;
  const productIds = readStringArray(payload.productIds) ?? baseOrder?.productIds ?? [];
  const reorderItems = readReorderItems(payload.reorderItems) ?? baseOrder?.reorderItems;
  const statusAccent = readString(payload.statusAccent) ?? STATUS_META[statusKey].accent;
  const statusLabel = STATUS_META[statusKey].label;

    return {
    cityId,
    date: readString(payload.date) ?? baseOrder?.date ?? formatDateLabel(updatedAt),
    deliveryZone: readString(payload.deliveryZone) ?? cityMeta.zone,
    etaLabel:
      readString(payload.etaLabel) ??
      (typeof etaMinutes === 'number' ? formatEtaLabel(etaMinutes) : null),
    etaMinutes: typeof etaMinutes === 'number' ? etaMinutes : null,
    hubName: readString(payload.hubName) ?? cityMeta.hubName,
    id: docId,
    isRealtime: isOrderActive(statusKey),
    itemSummary:
      readString(payload.itemSummary) ?? baseOrder?.itemSummary ?? 'Live order',
    liveUpdate:
      readString(payload.liveUpdate) ??
      defaultLiveUpdateForStatus(statusKey, cityMeta.label),
    productIds,
    progress,
    reorderItems,
    rider,
    source: 'firebase',
    statusAccent,
    statusKey,
    statusLabel,
    timeline:
      normalizeTimeline(payload.timeline) ??
      buildTimeline({ riderName: rider?.name, statusKey, updatedAt }),
    total,
    updatedAtLabel: formatUpdatedAtLabel(updatedAt),
  };
}

function mergeTrackedOrders(
  seedOrders: TrackedOrder[],
  remoteOrders: TrackedOrder[]
) {
  const mergedOrders = new Map(seedOrders.map((order) => [order.id, order]));

  for (const remoteOrder of remoteOrders) {
    mergedOrders.set(remoteOrder.id, remoteOrder);
  }

  return [...mergedOrders.values()].sort((left, right) => {
    if (isOrderActive(left.statusKey) !== isOrderActive(right.statusKey)) {
      return isOrderActive(left.statusKey) ? -1 : 1;
    }

    return right.id.localeCompare(left.id);
  });
}

function buildSeedTrackedOrders(
  cityId: string,
  source: TrackingSource
): TrackedOrder[] {
  const cityMeta = getTrackingCityMeta(cityId);
  const now = new Date();

  const orders: TrackedOrder[] = [];
  orderHistory.forEach((order, index) => {
    const statusKey = normalizeTrackingStatus(order.status);
    const updatedAt = addMinutes(now, -(index * 130 + 14));
    const etaMinutes = statusKey === 'out_for_delivery' ? 46 : null;
    const rider =
      statusKey === 'out_for_delivery' || statusKey === 'rider_assigned'
        ? {
            cityId,
            name: 'Aman Verma',
            phone: '+91 98765 41230',
            vehicleLabel: 'Bike / UP80 AB 4123',
            zone: cityMeta.zone,
          }
        : null;

    orders.push({
      ...order,
      cityId,
      date: order.id === 'ORD-8731' ? formatDateLabel(now) : order.date,
      deliveryZone: cityMeta.zone,
      etaLabel: etaMinutes === null ? null : formatEtaLabel(etaMinutes),
      etaMinutes,
      hubName: cityMeta.hubName,
      isRealtime: isOrderActive(statusKey),
      itemSummary: order.itemSummary,
      liveUpdate: defaultLiveUpdateForStatus(statusKey, cityMeta.label),
      productIds: order.productIds,
      progress: STATUS_META[statusKey].defaultProgress,
      reorderItems: order.reorderItems,
      rider,
      source,
      statusAccent: order.statusAccent,
      statusKey,
      statusLabel: STATUS_META[statusKey].label,
      timeline: buildTimeline({ statusKey, updatedAt, riderName: rider?.name }),
      total: order.total,
      updatedAtLabel: formatUpdatedAtLabel(updatedAt),
    });
  });
  return orders;
}

function buildTimeline(params: {
  riderName?: string;
  statusKey: TrackingStatusKey;
  updatedAt: Date;
}) {
  const { riderName, statusKey, updatedAt } = params;
  const activeIndex = TRACKING_STEPS.findIndex((step) => step.id === statusKey);

  return TRACKING_STEPS.map((step, index) => {
    const stepState = resolveStepState(step, index, activeIndex, statusKey);
    const detail =
      step.id === 'rider_assigned' && riderName
        ? `${riderName} has been assigned to this route.`
        : step.detail;
    const timeLabel =
      stepState === 'upcoming' || stepState === 'cancelled'
        ? 'Pending'
        : formatTimeLabel(addMinutes(updatedAt, getTimelineMinuteOffset(step.id)));

    return {
      detail,
      id: step.id,
      state: stepState,
      timeLabel,
      title: step.title,
    };
  });
}

function resolveStepState(
  step: TrackingTimelineTemplate,
  index: number,
  activeIndex: number,
  statusKey: TrackingStatusKey
): TrackingStepState {
  if (statusKey === 'cancelled') {
    return step.id === 'confirmed' ? 'complete' : 'cancelled';
  }

  if (index < activeIndex) {
    return 'complete';
  }

  if (index === activeIndex) {
    return statusKey === 'delivered' ? 'complete' : 'current';
  }

  return 'upcoming';
}

function normalizeTimeline(input: unknown) {
  if (!Array.isArray(input)) {
    return null;
  }

  const parsedSteps = input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const candidate = entry as Record<string, unknown>;
      const id = readString(candidate.id);
      const title = readString(candidate.title);
      const detail = readString(candidate.detail);
      const timeLabel = readString(candidate.timeLabel);
      const state = readString(candidate.state);

      if (!id || !title || !detail || !timeLabel) {
        return null;
      }

      if (
        state !== 'complete' &&
        state !== 'current' &&
        state !== 'upcoming' &&
        state !== 'cancelled'
      ) {
        return null;
      }

      return {
        detail,
        id,
        state,
        timeLabel,
        title,
      } satisfies TrackingTimelineStep;
    })
    .filter((step): step is TrackingTimelineStep => step !== null);

  if (parsedSteps.length === 0) {
    return null;
  }

  return parsedSteps;
}

function normalizeRider(
  input: unknown,
  cityMeta: TrackingCityMeta,
  cityId: string
) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const name = readString(candidate.name);
  const phone = readString(candidate.phone);
  const vehicleLabel = readString(candidate.vehicleLabel);

  if (!name || !phone || !vehicleLabel) {
    return null;
  }

  return {
    cityId,
    name,
    phone,
    vehicleLabel,
    zone: readString(candidate.zone) ?? cityMeta.zone,
  } satisfies RiderAssignment;
}

function readReorderItems(input: unknown) {
  if (!Array.isArray(input)) {
    return null;
  }

  const items = input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const candidate = entry as Record<string, unknown>;
      const productId = readString(candidate.productId);
      const productName = readString(candidate.productName) ?? undefined;
      const quantity = readNumber(candidate.quantity);

      if (!productId || typeof quantity !== 'number') {
        return null;
      }

      return {
        productId,
        productName,
        quantity,
      } as { productId: string; productName?: string; quantity: number };
    })
    .filter(
      (item): item is { productId: string; productName?: string; quantity: number } =>
        item !== null
    );

  return items.length > 0 ? items : null;
}

function readStringArray(input: unknown) {
  if (!Array.isArray(input)) {
    return null;
  }

  const values = input.filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );

  return values.length > 0 ? values : null;
}

function normalizeTrackingStatus(input: string) {
  const normalizedValue = input.toLowerCase().replace(/[\s-]+/g, '_');

  if (normalizedValue === 'in_transit') {
    return 'out_for_delivery';
  }

  if (normalizedValue === 'rider_assigned') {
    return 'rider_assigned';
  }

  if (normalizedValue === 'out_for_delivery') {
    return 'out_for_delivery';
  }

  if (normalizedValue === 'delivered') {
    return 'delivered';
  }

  if (normalizedValue === 'packed') {
    return 'packed';
  }

  if (normalizedValue === 'confirmed') {
    return 'confirmed';
  }

  if (normalizedValue === 'cancelled') {
    return 'cancelled';
  }

  return 'confirmed';
}

function clampProgress(value: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
}

function formatEtaLabel(etaMinutes: number) {
  const etaDate = addMinutes(new Date(), etaMinutes);

  return `ETA ${formatTimeLabel(etaDate)} / ${etaMinutes} min`;
}

function formatUpdatedAtLabel(date: Date) {
  const deltaMinutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60000)
  );

  if (deltaMinutes <= 1) {
    return 'Updated just now';
  }

  return `Updated ${deltaMinutes} min ago`;
}

function defaultLiveUpdateForStatus(
  statusKey: TrackingStatusKey,
  cityLabel: string
) {
  if (statusKey === 'out_for_delivery') {
    return `Last-mile dispatch is active in ${cityLabel}.`;
  }

  if (statusKey === 'rider_assigned') {
    return 'A rider has been assigned and route batching is underway.';
  }

  if (statusKey === 'packed') {
    return 'Order packed and staged for dispatch.';
  }

  if (statusKey === 'delivered') {
    return 'Delivery completed and marked received.';
  }

  if (statusKey === 'cancelled') {
    return 'This order was cancelled before dispatch.';
  }

  return 'Order is confirmed and waiting for dispatch.';
}

function getTimelineMinuteOffset(stepId: string) {
  if (stepId === 'confirmed') {
    return -64;
  }

  if (stepId === 'packed') {
    return -39;
  }

  if (stepId === 'rider_assigned') {
    return -20;
  }

  if (stepId === 'out_for_delivery') {
    return -6;
  }

  return 0;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCityLabel(cityId: string) {
  return cityId
    .split(/[_-]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate() as Date;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'string') {
    const parsedDate = new Date(value);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}

