import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useCart } from '@/contexts/cartcontext';
import {
  resolveOrderReorder,
  type ReorderableOrder,
} from '@/services/orders/reorder-service';

type ReplaceMode = 'merge' | 'replace';

export function useOrderReorder() {
  const router = useRouter();
  const { addBundleToCart, itemCount, replaceCartWithBundle } = useCart();

  function reorderToCart(order: ReorderableOrder) {
    runReorder(order, 'merge');
  }

  function repeatFullCart(order: ReorderableOrder) {
    runReorder(order, 'replace');
  }

  function checkoutPreviousOrder(order: ReorderableOrder) {
    runReorder(order, 'replace', true);
  }

  function runReorder(
    order: ReorderableOrder,
    mode: ReplaceMode,
    fastCheckout = false
  ) {
    const resolution = resolveOrderReorder(order);

    if (resolution.availableItems.length === 0) {
      Alert.alert(
        'Unavailable order',
        'That previous order includes items that are no longer available. Browse search to build a replacement cart.'
      );
      return;
    }

    const applyReorder = () => {
      if (mode === 'replace') {
        replaceCartWithBundle(resolution.availableItems);
      } else {
        addBundleToCart(resolution.availableItems);
      }

      router.push({
        pathname: '/cart',
        params: {
          fastCheckout: fastCheckout ? '1' : '0',
          orderId: order.id,
          reorderedLines: String(resolution.lineCount),
          reorderedUnits: String(resolution.totalUnits),
          reorderMode: mode,
          reorderNotice: '1',
          unavailableCount: String(resolution.unavailableItems.length),
        },
      });
    };

    if (mode === 'replace' && itemCount > 0) {
      Alert.alert(
        'Replace current cart?',
        fastCheckout
          ? `This will replace your current cart with ${order.id} and open the fast checkout review.`
          : `This will replace your current cart with the full contents of ${order.id}.`,
        [
          {
            style: 'cancel',
            text: 'Keep current cart',
          },
          {
            onPress: applyReorder,
            style: 'destructive',
            text: 'Replace cart',
          },
        ]
      );
      return;
    }

    applyReorder();
  }

  return {
    checkoutPreviousOrder,
    reorderToCart,
    repeatFullCart,
  };
}
