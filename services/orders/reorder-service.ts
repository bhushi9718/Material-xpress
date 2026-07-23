import {
  products,
  type OrderHistoryItem,
  type Product,
} from '@/constants/material-data';

const PRODUCT_INDEX = new Map(products.map((product) => [product.id, product]));

type RequestedReorderItem = {
  productId: string;
  productName?: string;
  quantity: number;
};

export type ReorderableOrder = Pick<
  OrderHistoryItem,
  'date' | 'id' | 'itemSummary' | 'productIds' | 'reorderItems' | 'total'
>;

export type ResolvedReorderBundleItem = {
  product: Product;
  quantity: number;
};

export type UnavailableReorderItem = {
  productId: string;
  productName: string;
  quantity: number;
};

export type OrderReorderResolution = {
  availableItems: ResolvedReorderBundleItem[];
  lineCount: number;
  total: number;
  totalUnits: number;
  unavailableItems: UnavailableReorderItem[];
};

export function resolveOrderReorder(order: ReorderableOrder): OrderReorderResolution {
  const requestedItems = getRequestedReorderItems(order);
  const availableItems: ResolvedReorderBundleItem[] = [];
  const unavailableItems: UnavailableReorderItem[] = [];

  for (const requestedItem of requestedItems) {
    const product = PRODUCT_INDEX.get(requestedItem.productId);

    if (!product) {
      unavailableItems.push({
        productId: requestedItem.productId,
        productName:
          requestedItem.productName ?? `Archived item ${unavailableItems.length + 1}`,
        quantity: requestedItem.quantity,
      });
      continue;
    }

    availableItems.push({
      product,
      quantity: requestedItem.quantity,
    });
  }

  return {
    availableItems,
    lineCount: availableItems.length,
    total: availableItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ),
    totalUnits: availableItems.reduce((sum, item) => sum + item.quantity, 0),
    unavailableItems,
  };
}

export function getOrderReorderSummary(order: ReorderableOrder) {
  const requestedItems = getRequestedReorderItems(order);
  const lineCount = requestedItems.length;
  const totalUnits = requestedItems.reduce((sum, item) => sum + item.quantity, 0);

  return `${formatCount(lineCount, 'line')} / ${formatCount(totalUnits, 'unit')}`;
}

function getRequestedReorderItems(order: ReorderableOrder) {
  const sourceItems = (
    order.reorderItems?.length
      ? order.reorderItems
      : order.productIds.map((productId) => ({
          productId,
          quantity: 1,
        }))
  ) as Array<{ productId: string; productName?: string; quantity: number }>;

  const requestIndex = new Map<string, RequestedReorderItem>();

  sourceItems.forEach((item) => {
    const normalizedQuantity = normalizeQuantity(item.quantity);

    if (!item.productId || normalizedQuantity <= 0) {
      return;
    }

    const currentEntry = requestIndex.get(item.productId);

    requestIndex.set(item.productId, {
      productId: item.productId,
      productName: item.productName ?? currentEntry?.productName,
      quantity: (currentEntry?.quantity ?? 0) + normalizedQuantity,
    });
  });

  return [...requestIndex.values()];
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function formatCount(value: number, label: string) {
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}
