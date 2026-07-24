import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { categories } from '@/constants/material-data';
import { getFirebaseFirestore } from '@/services/firebase/client';
import type { VendorSession } from '@/services/vendor/vendor-auth-service';

const CATEGORY_INDEX = new Map(categories.map((category) => [category.id, category]));
const ORDER_STATUS_FLOW = [
  'new',
  'accepted',
  'packing',
  'ready',
  'out_for_delivery',
  'completed',
] as const;

const previewProductListeners = new Map<
  string,
  Set<(products: VendorProduct[]) => void>
>();
const previewOrderListeners = new Map<string, Set<(orders: VendorOrder[]) => void>>();
const previewProductCache = new Map<string, VendorProduct[]>();
const previewOrderCache = new Map<string, VendorOrder[]>();

type VendorProductDocShape = {
  accent?: unknown;
  category?: unknown;
  categoryId?: unknown;
  cityId?: unknown;
  icon?: unknown;
  lowStockThreshold?: unknown;
  name?: unknown;
  price?: unknown;
  sku?: unknown;
  stockQuantity?: unknown;
  subtitle?: unknown;
  unit?: unknown;
  updatedAt?: unknown;
  vendorId?: unknown;
};

type VendorOrderDocShape = {
  cityId?: unknown;
  createdAt?: unknown;
  customerName?: unknown;
  deliveryZone?: unknown;
  itemCount?: unknown;
  items?: unknown;
  status?: unknown;
  total?: unknown;
  updatedAt?: unknown;
  vendorId?: unknown;
};

type VendorOrderItemDocShape = {
  name?: unknown;
  productId?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
};

export type VendorProductStatus = 'active' | 'low_stock' | 'out_of_stock';
export type VendorOrderStatus = (typeof ORDER_STATUS_FLOW)[number];

export type VendorProduct = {
  accent: string;
  category: string;
  categoryId: string;
  cityId: string;
  icon: string;
  id: string;
  lowStockThreshold: number;
  name: string;
  price: number;
  sku: string;
  status: VendorProductStatus;
  stockQuantity: number;
  subtitle: string;
  unit: string;
  updatedAtLabel: string;
  vendorId: string;
};

export type VendorOrderItem = {
  name: string;
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type VendorOrder = {
  cityId: string;
  createdAtLabel: string;
  customerName: string;
  deliveryZone: string;
  id: string;
  itemCount: number;
  items: VendorOrderItem[];
  status: VendorOrderStatus;
  total: number;
  updatedAtLabel: string;
  vendorId: string;
};

export type VendorProductInput = {
  categoryId: string;
  name: string;
  price: number;
  stockQuantity: number;
  subtitle: string;
  unit: string;
};

export function getVendorCollectionPaths(params: {
  cityId: string;
  vendorId: string;
}) {
  return {
    vendorOrders: `cities/${params.cityId}/vendorOrders`,
    vendorProducts: `cities/${params.cityId}/vendorProducts`,
    vendorProfile: `vendors/${params.vendorId}`,
  };
}

export async function ensureVendorProfile(session: VendorSession) {
  const firestore = getFirebaseFirestore();

  if (!firestore || session.source !== 'firebase') {
    return;
  }

  await setDoc(
    doc(firestore, 'vendors', session.uid),
    {
      cityId: session.cityId,
      displayName: session.displayName,
      email: session.email,
      role: session.role,
      shopName: session.shopName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToVendorProducts(params: {
  onError?: (error: Error) => void;
  onUpdate: (products: VendorProduct[]) => void;
  session: VendorSession;
}) {
  const firestore = getFirebaseFirestore();

  if (!firestore || params.session.source === 'preview') {
    return subscribeToPreviewProducts(params);
  }

  const vendorProductsQuery = query(
    collection(firestore, 'cities', params.session.cityId, 'vendorProducts'),
    where('vendorId', '==', params.session.uid),
    limit(80)
  );

  return onSnapshot(
    vendorProductsQuery,
    (snapshot) => {
      const products = snapshot.docs
        .map((entry) =>
          normalizeVendorProductDoc(
            entry.id,
            entry.data() as VendorProductDocShape,
            params.session
          )
        )
        .filter((item): item is VendorProduct => item !== null)
        .sort((left, right) => left.name.localeCompare(right.name)) as VendorProduct[];

      params.onUpdate(products);
    },
    (error) => {
      params.onError?.(
        error instanceof Error
          ? error
          : new Error('Vendor products could not be loaded.')
      );
    }
  );
}

export function subscribeToVendorOrders(params: {
  onError?: (error: Error) => void;
  onUpdate: (orders: VendorOrder[]) => void;
  session: VendorSession;
}) {
  const firestore = getFirebaseFirestore();

  if (!firestore || params.session.source === 'preview') {
    return subscribeToPreviewOrders(params);
  }

  const vendorOrdersQuery = query(
    collection(firestore, 'cities', params.session.cityId, 'vendorOrders'),
    where('vendorId', '==', params.session.uid),
    limit(60)
  );

  return onSnapshot(
    vendorOrdersQuery,
    (snapshot) => {
      const orders = snapshot.docs
        .map((entry) =>
          normalizeVendorOrderDoc(
            entry.id,
            entry.data() as VendorOrderDocShape,
            params.session
          )
        )
        .filter((item): item is VendorOrder => item !== null)
        .sort((left, right) => right.id.localeCompare(left.id));

      params.onUpdate(orders as VendorOrder[]);
    },
    (error) => {
      params.onError?.(
        error instanceof Error
          ? error
          : new Error('Vendor orders could not be loaded.')
      );
    }
  );
}

export async function createVendorProduct(params: {
  input: VendorProductInput;
  session: VendorSession;
}) {
  const normalizedInput = normalizeProductInput(params.input);
  const categoryMeta =
    CATEGORY_INDEX.get(normalizedInput.categoryId) ?? categories[0];
  const firestore = getFirebaseFirestore();

  if (!firestore || params.session.source === 'preview') {
    const nextProducts = await ensurePreviewProducts(params.session);
    const nextProductId = `vp-${Date.now()}`;
    const createdProduct = buildVendorProductRecord({
      accent: categoryMeta.accent,
      category: categoryMeta.name,
      categoryId: normalizedInput.categoryId,
      cityId: params.session.cityId,
      icon: categoryMeta.icon,
      id: nextProductId,
      lowStockThreshold: 12,
      name: normalizedInput.name,
      price: normalizedInput.price,
      sku: buildSku(normalizedInput.name, normalizedInput.categoryId, nextProductId),
      stockQuantity: normalizedInput.stockQuantity,
      subtitle: normalizedInput.subtitle,
      unit: normalizedInput.unit,
      updatedAtLabel: 'Updated just now',
      vendorId: params.session.uid,
    });

    const cacheKey = getPreviewProductsKey(params.session.uid);
    previewProductCache.set(cacheKey, [createdProduct, ...nextProducts]);
    await persistPreviewProducts(cacheKey);
    emitPreviewProducts(cacheKey);
    return createdProduct;
  }

  const collectionRef = collection(
    firestore,
    'cities',
    params.session.cityId,
    'vendorProducts'
  );
  const nextDocument = doc(collectionRef);

  await setDoc(nextDocument, {
    accent: categoryMeta.accent,
    category: categoryMeta.name,
    categoryId: normalizedInput.categoryId,
    cityId: params.session.cityId,
    createdAt: serverTimestamp(),
    icon: categoryMeta.icon,
    lowStockThreshold: 12,
    name: normalizedInput.name,
    price: normalizedInput.price,
    sku: buildSku(normalizedInput.name, normalizedInput.categoryId, nextDocument.id),
    stockQuantity: normalizedInput.stockQuantity,
    subtitle: normalizedInput.subtitle,
    unit: normalizedInput.unit,
    updatedAt: serverTimestamp(),
    vendorId: params.session.uid,
  });
}

export async function updateVendorProduct(params: {
  productId: string;
  session: VendorSession;
  updates: Partial<Pick<VendorProduct, 'price' | 'stockQuantity' | 'subtitle' | 'unit'>>;
}) {
  const firestore = getFirebaseFirestore();
  const nextPrice =
    typeof params.updates.price === 'number'
      ? normalizeMoney(params.updates.price)
      : undefined;
  const nextStock =
    typeof params.updates.stockQuantity === 'number'
      ? normalizeInteger(params.updates.stockQuantity)
      : undefined;
  const nextSubtitle =
    typeof params.updates.subtitle === 'string'
      ? params.updates.subtitle.trim()
      : undefined;
  const nextUnit =
    typeof params.updates.unit === 'string' ? params.updates.unit.trim() : undefined;

  if (!firestore || params.session.source === 'preview') {
    const cacheKey = getPreviewProductsKey(params.session.uid);
    const products = await ensurePreviewProducts(params.session);

    previewProductCache.set(
      cacheKey,
      products.map((product) => {
        if (product.id !== params.productId) {
          return product;
        }

        return buildVendorProductRecord({
          ...product,
          price: nextPrice ?? product.price,
          status: computeProductStatus(
            nextStock ?? product.stockQuantity,
            product.lowStockThreshold
          ),
          stockQuantity: nextStock ?? product.stockQuantity,
          subtitle: nextSubtitle ?? product.subtitle,
          unit: nextUnit ?? product.unit,
          updatedAtLabel: 'Updated just now',
        });
      })
    );

    await persistPreviewProducts(cacheKey);
    emitPreviewProducts(cacheKey);
    return;
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof nextPrice === 'number') {
    updatePayload.price = nextPrice;
  }

  if (typeof nextStock === 'number') {
    updatePayload.stockQuantity = nextStock;
  }

  if (typeof nextSubtitle === 'string' && nextSubtitle.length > 0) {
    updatePayload.subtitle = nextSubtitle;
  }

  if (typeof nextUnit === 'string' && nextUnit.length > 0) {
    updatePayload.unit = nextUnit;
  }

  await updateDoc(
    doc(
      firestore,
      'cities',
      params.session.cityId,
      'vendorProducts',
      params.productId
    ),
    updatePayload
  );
}

export async function updateVendorOrderStatus(params: {
  orderId: string;
  session: VendorSession;
  status: VendorOrderStatus;
}) {
  const nextStatus = normalizeVendorOrderStatus(params.status);
  const firestore = getFirebaseFirestore();

  if (!firestore || params.session.source === 'preview') {
    const cacheKey = getPreviewOrdersKey(params.session.uid);
    const orders = await ensurePreviewOrders(params.session);

    previewOrderCache.set(
      cacheKey,
      orders.map((order) =>
        order.id === params.orderId
          ? {
              ...order,
              status: nextStatus,
              updatedAtLabel: 'Updated just now',
            }
          : order
      )
    );

    await persistPreviewOrders(cacheKey);
    emitPreviewOrders(cacheKey);
    return;
  }

  await updateDoc(
    doc(
      firestore,
      'cities',
      params.session.cityId,
      'vendorOrders',
      params.orderId
    ),
    {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    }
  );
}

export function getNextVendorOrderStatus(status: VendorOrderStatus) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  if (currentIndex < 0 || currentIndex >= ORDER_STATUS_FLOW.length - 1) {
    return null;
  }

  return ORDER_STATUS_FLOW[currentIndex + 1];
}

function subscribeToPreviewProducts(params: {
  onUpdate: (products: VendorProduct[]) => void;
  session: VendorSession;
}) {
  const cacheKey = getPreviewProductsKey(params.session.uid);
  let active = true;

  void ensurePreviewProducts(params.session).then((products) => {
    if (active) {
      params.onUpdate(products);
    }
  });

  const listeners = previewProductListeners.get(cacheKey) ?? new Set();
  listeners.add(params.onUpdate);
  previewProductListeners.set(cacheKey, listeners);

  return () => {
    active = false;
    listeners.delete(params.onUpdate);
  };
}

function subscribeToPreviewOrders(params: {
  onUpdate: (orders: VendorOrder[]) => void;
  session: VendorSession;
}) {
  const cacheKey = getPreviewOrdersKey(params.session.uid);
  let active = true;

  void ensurePreviewOrders(params.session).then((orders) => {
    if (active) {
      params.onUpdate(orders as VendorOrder[]);
    }
  });

  const listeners = previewOrderListeners.get(cacheKey) ?? new Set();
  listeners.add(params.onUpdate);
  previewOrderListeners.set(cacheKey, listeners);

  return () => {
    active = false;
    listeners.delete(params.onUpdate);
  };
}

async function ensurePreviewProducts(session: VendorSession) {
  const cacheKey = getPreviewProductsKey(session.uid);

  if (previewProductCache.has(cacheKey)) {
    return previewProductCache.get(cacheKey)!;
  }

  try {
    const storedValue = await AsyncStorage.getItem(cacheKey);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue) as VendorProduct[];
      previewProductCache.set(cacheKey, parsedValue);
      return parsedValue;
    }
  } catch (error) {
    console.error('Unable to load preview vendor products.', error);
  }

  const seededProducts = buildInitialPreviewProducts(session);
  previewProductCache.set(cacheKey, seededProducts);
  await persistPreviewProducts(cacheKey);
  return seededProducts;
}

async function ensurePreviewOrders(session: VendorSession) {
  const cacheKey = getPreviewOrdersKey(session.uid);

  if (previewOrderCache.has(cacheKey)) {
    return previewOrderCache.get(cacheKey)!;
  }

  try {
    const storedValue = await AsyncStorage.getItem(cacheKey);

    if (storedValue) {
      const parsedValue = JSON.parse(storedValue) as VendorOrder[];
      previewOrderCache.set(cacheKey, parsedValue);
      return parsedValue;
    }
  } catch (error) {
    console.error('Unable to load preview vendor orders.', error);
  }

  const seededOrders = buildInitialPreviewOrders(session);
  previewOrderCache.set(cacheKey, seededOrders);
  await persistPreviewOrders(cacheKey);
  return seededOrders;
}

async function persistPreviewProducts(cacheKey: string) {
  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify(previewProductCache.get(cacheKey) ?? [])
    );
  } catch (error) {
    console.error('Unable to save preview vendor products.', error);
  }
}

async function persistPreviewOrders(cacheKey: string) {
  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify(previewOrderCache.get(cacheKey) ?? [])
    );
  } catch (error) {
    console.error('Unable to save preview vendor orders.', error);
  }
}

function emitPreviewProducts(cacheKey: string) {
  const products = previewProductCache.get(cacheKey) ?? [];
  const listeners = previewProductListeners.get(cacheKey);

  listeners?.forEach((listener) => {
    listener([...products]);
  });
}

function emitPreviewOrders(cacheKey: string) {
  const orders = previewOrderCache.get(cacheKey) ?? [];
  const listeners = previewOrderListeners.get(cacheKey);

  listeners?.forEach((listener) => {
    listener([...orders]);
  });
}

function buildInitialPreviewProducts(session: VendorSession) {
  return [
    buildVendorProductRecord({
      accent: '#B38843',
      category: 'Hinges',
      categoryId: 'hinges',
      cityId: session.cityId,
      icon: 'construct-outline',
      id: 'vp-soft-close-hinge',
      lowStockThreshold: 20,
      name: 'SS 304 Soft Close Cabinet Hinge',
      price: 252,
      sku: 'MX-HNG-304-001',
      stockQuantity: 96,
      subtitle: 'Vendor batch / satin finish',
      unit: 'pair',
      updatedAtLabel: 'Updated 12 min ago',
      vendorId: session.uid,
    }),
    buildVendorProductRecord({
      accent: '#355C73',
      category: 'Drawer Slides',
      categoryId: 'slides',
      cityId: session.cityId,
      icon: 'swap-horizontal-outline',
      id: 'vp-telescopic-slide',
      lowStockThreshold: 12,
      name: 'Telescopic Drawer Slide 450mm',
      price: 438,
      sku: 'MX-SLD-450-010',
      stockQuantity: 42,
      subtitle: 'Ball bearing channel pair',
      unit: 'pair',
      updatedAtLabel: 'Updated 28 min ago',
      vendorId: session.uid,
    }),
    buildVendorProductRecord({
      accent: '#6D5C43',
      category: 'Locks',
      categoryId: 'locks',
      cityId: session.cityId,
      icon: 'lock-closed-outline',
      id: 'vp-mortise-lock',
      lowStockThreshold: 10,
      name: 'Mortise Lock Body 60mm',
      price: 695,
      sku: 'MX-LCK-060-004',
      stockQuantity: 18,
      subtitle: 'Black plate / brass latch',
      unit: 'piece',
      updatedAtLabel: 'Updated 41 min ago',
      vendorId: session.uid,
    }),
    buildVendorProductRecord({
      accent: '#4F6B57',
      category: 'Fasteners',
      categoryId: 'fasteners',
      cityId: session.cityId,
      icon: 'hardware-chip-outline',
      id: 'vp-wood-screws',
      lowStockThreshold: 16,
      name: 'Wood Screws 1.5 inch',
      price: 92,
      sku: 'MX-FST-150-022',
      stockQuantity: 9,
      subtitle: '100-piece installation box',
      unit: 'box',
      updatedAtLabel: 'Updated 1 hour ago',
      vendorId: session.uid,
    }),
  ];
}

function buildInitialPreviewOrders(session: VendorSession): VendorOrder[] {
  return [
    {
      cityId: session.cityId,
      createdAtLabel: 'Today / 10:40 AM',
      customerName: 'Sharma Interiors',
      deliveryZone: 'Civil Lines',
      id: 'VO-2041',
      itemCount: 14,
      items: [
        { name: 'SS 304 Soft Close Cabinet Hinge', productId: 'vp-soft-close-hinge', quantity: 10, unitPrice: 252 },
        { name: 'Wood Screws 1.5 inch', productId: 'vp-wood-screws', quantity: 4, unitPrice: 92 },
      ],
      status: 'new',
      total: 2896,
      updatedAtLabel: 'Updated 4 min ago',
      vendorId: session.uid,
    },
    {
      cityId: session.cityId,
      createdAtLabel: 'Today / 08:25 AM',
      customerName: 'Site Office / Mehra Buildtech',
      deliveryZone: 'MG Road',
      id: 'VO-2039',
      itemCount: 8,
      items: [
        { name: 'Telescopic Drawer Slide 450mm', productId: 'vp-telescopic-slide', quantity: 6, unitPrice: 438 },
        { name: 'Aluminium D Handle 300mm', productId: 'aluminium-d-handle', quantity: 2, unitPrice: 210 },
      ],
      status: 'packing',
      total: 3048,
      updatedAtLabel: 'Updated 19 min ago',
      vendorId: session.uid,
    },
    {
      cityId: session.cityId,
      createdAtLabel: 'Yesterday / 05:10 PM',
      customerName: 'Royal Doors & Decor',
      deliveryZone: 'Sanjay Place',
      id: 'VO-2031',
      itemCount: 5,
      items: [
        { name: 'Mortise Lock Body 60mm', productId: 'vp-mortise-lock', quantity: 5, unitPrice: 695 },
      ],
      status: 'out_for_delivery',
      total: 3475,
      updatedAtLabel: 'Updated 52 min ago',
      vendorId: session.uid,
    },
  ];
}

function normalizeVendorProductDoc(
  docId: string,
  payload: VendorProductDocShape,
  session: VendorSession
) {
  const categoryId = readString(payload.categoryId) ?? 'hinges';
  const categoryMeta = CATEGORY_INDEX.get(categoryId) ?? categories[0];
  const stockQuantity = normalizeInteger(readNumber(payload.stockQuantity) ?? 0);
  const lowStockThreshold = normalizeInteger(readNumber(payload.lowStockThreshold) ?? 12);
  const updatedAt = toDate(payload.updatedAt);

  return buildVendorProductRecord({
    accent: readString(payload.accent) ?? categoryMeta.accent,
    category: readString(payload.category) ?? categoryMeta.name,
    categoryId,
    cityId: readString(payload.cityId) ?? session.cityId,
    icon: readString(payload.icon) ?? categoryMeta.icon,
    id: docId,
    lowStockThreshold,
    name: readString(payload.name) ?? 'Untitled product',
    price: normalizeMoney(readNumber(payload.price) ?? 0),
    sku: readString(payload.sku) ?? buildSku('product', categoryId, docId),
    stockQuantity,
    subtitle: readString(payload.subtitle) ?? categoryMeta.blurb,
    unit: readString(payload.unit) ?? 'piece',
    updatedAtLabel: formatRelativeTime(updatedAt),
    vendorId: readString(payload.vendorId) ?? session.uid,
  });
}

function normalizeVendorOrderDoc(
  docId: string,
  payload: VendorOrderDocShape,
  session: VendorSession
) {
  const createdAt = toDate(payload.createdAt);
  const updatedAt = toDate(payload.updatedAt);
  const items = normalizeVendorOrderItems(payload.items);

  return {
    cityId: readString(payload.cityId) ?? session.cityId,
    createdAtLabel: formatTimestamp(createdAt),
    customerName: readString(payload.customerName) ?? 'Vendor customer',
    deliveryZone: readString(payload.deliveryZone) ?? 'Central zone',
    id: docId,
    itemCount:
      normalizeInteger(
        readNumber(payload.itemCount) ??
          items.reduce((count, item) => count + item.quantity, 0)
      ) || items.length,
    items,
    status: normalizeVendorOrderStatus(readString(payload.status) ?? 'new'),
    total: normalizeMoney(readNumber(payload.total) ?? 0),
    updatedAtLabel: formatRelativeTime(updatedAt),
    vendorId: readString(payload.vendorId) ?? session.uid,
  } satisfies VendorOrder;
}

function normalizeVendorOrderItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as VendorOrderItem[];
  }

  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const item = entry as VendorOrderItemDocShape;
      const productId = readString(item.productId) ?? `item-${index + 1}`;
      const name = readString(item.name) ?? 'Order item';
      const quantity = normalizeInteger(readNumber(item.quantity) ?? 1);
      const unitPrice = normalizeMoney(readNumber(item.unitPrice) ?? 0);

      return {
        name,
        productId,
        quantity,
        unitPrice,
      };
    })
    .filter((item): item is VendorOrderItem => item !== null);
}

function buildVendorProductRecord(product: Omit<VendorProduct, 'status'> & { status?: VendorProductStatus }) {
  const status =
    product.status ??
    computeProductStatus(product.stockQuantity, product.lowStockThreshold);

  return {
    ...product,
    status,
  } satisfies VendorProduct;
}

function normalizeProductInput(input: VendorProductInput) {
  const categoryId = CATEGORY_INDEX.has(input.categoryId)
    ? input.categoryId
    : categories[0].id;
  const trimmedName = input.name.trim();

  if (trimmedName.length < 3) {
    throw new Error('Add a product name with at least 3 characters.');
  }

  return {
    categoryId,
    name: trimmedName,
    price: normalizeMoney(input.price),
    stockQuantity: normalizeInteger(input.stockQuantity),
    subtitle: input.subtitle.trim() || CATEGORY_INDEX.get(categoryId)?.blurb || 'Vendor catalog product',
    unit: input.unit.trim() || 'piece',
  };
}

function computeProductStatus(stockQuantity: number, threshold: number): VendorProductStatus {
  if (stockQuantity <= 0) {
    return 'out_of_stock';
  }

  if (stockQuantity <= threshold) {
    return 'low_stock';
  }

  return 'active';
}

function normalizeVendorOrderStatus(value: string): VendorOrderStatus {
  const normalizedValue = value.toLowerCase().replace(/[\s-]+/g, '_');

  if (ORDER_STATUS_FLOW.includes(normalizedValue as VendorOrderStatus)) {
    return normalizedValue as VendorOrderStatus;
  }

  return 'new';
}

function buildSku(name: string, categoryId: string, seed: string) {
  const nameToken = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');
  const categoryToken = categoryId.toUpperCase().slice(0, 3);
  const seedToken = seed.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(-4).padStart(4, '0');

  return `MX-${categoryToken}-${nameToken}-${seedToken}`;
}

function getPreviewProductsKey(vendorId: string) {
  return `@material_xpress_vendor_products_${vendorId}`;
}

function getPreviewOrdersKey(vendorId: string) {
  return `@material_xpress_vendor_orders_${vendorId}`;
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Number(value.toFixed(2)));
}

function normalizeInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
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

function formatRelativeTime(date: Date | null) {
  if (!date) {
    return 'Updated recently';
  }

  const deltaMinutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60000)
  );

  if (deltaMinutes <= 1) {
    return 'Updated just now';
  }

  if (deltaMinutes < 60) {
    return `Updated ${deltaMinutes} min ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `Updated ${deltaHours} hr ago`;
  }

  return `Updated ${Math.round(deltaHours / 24)} day ago`;
}

function formatTimestamp(date: Date | null) {
  if (!date) {
    return 'Today / pending';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}
