import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { Product } from '@/constants/material-data';

type CartItem = Product & {
  quantity: number;
};

type CartBundleItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  addBundleToCart: (items: CartBundleItem[]) => void;
  addToCart: (product: Product, quantity?: number) => void;
  cartItems: CartItem[];
  clearCart: () => void;
  itemCount: number;
  quantitiesById: Record<string, number>;
  removeFromCart: (productId: string) => void;
  replaceCartWithBundle: (items: CartBundleItem[]) => void;
  subtotal: number;
  updateQuantity: (productId: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    async function loadCart() {
      try {
        const savedCart = await AsyncStorage.getItem('@material_xpress_cart');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Unable to load cart', error);
      }
    }

    loadCart();
  }, []);

  useEffect(() => {
    async function saveCart() {
      try {
        await AsyncStorage.setItem(
          '@material_xpress_cart',
          JSON.stringify(cartItems)
        );
      } catch (error) {
        console.error('Unable to save cart', error);
      }
    }

    saveCart();
  }, [cartItems]);

  function addToCart(product: Product, quantity = 1) {
    const normalizedQuantity = normalizeQuantity(quantity);

    if (normalizedQuantity <= 0) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + normalizedQuantity }
            : item
        );
      }

      return [...currentItems, { ...product, quantity: normalizedQuantity }];
    });
  }

  function addBundleToCart(items: CartBundleItem[]) {
    const normalizedBundle = normalizeBundleItems(items);

    if (normalizedBundle.length === 0) {
      return;
    }

    setCartItems((currentItems) => {
      const nextItems = new Map(
        currentItems.map((item) => [item.id, { ...item }])
      );

      normalizedBundle.forEach((bundleItem) => {
        const existingItem = nextItems.get(bundleItem.id);

        if (existingItem) {
          nextItems.set(bundleItem.id, {
            ...existingItem,
            quantity: existingItem.quantity + bundleItem.quantity,
          });
          return;
        }

        nextItems.set(bundleItem.id, bundleItem);
      });

      return [...nextItems.values()];
    });
  }

  function replaceCartWithBundle(items: CartBundleItem[]) {
    setCartItems(normalizeBundleItems(items));
  }

  function updateQuantity(productId: string, quantity: number) {
    const normalizedQuantity = normalizeQuantity(quantity);

    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === productId ? { ...item, quantity: normalizedQuantity } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId)
    );
  }

  function clearCart() {
    setCartItems([]);
  }

  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const quantitiesById = useMemo(
    () =>
      cartItems.reduce<Record<string, number>>((lookup, item) => {
        lookup[item.id] = item.quantity;
        return lookup;
      }, {}),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      addBundleToCart,
      addToCart,
      cartItems,
      clearCart,
      itemCount,
      quantitiesById,
      removeFromCart,
      replaceCartWithBundle,
      subtotal,
      updateQuantity,
    }),
    [cartItems, itemCount, quantitiesById, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeBundleItems(items: CartBundleItem[]) {
  const normalizedItems = new Map<string, CartItem>();

  items.forEach(({ product, quantity }) => {
    const normalizedQuantity = normalizeQuantity(quantity);

    if (normalizedQuantity <= 0) {
      return;
    }

    const existingItem = normalizedItems.get(product.id);

    normalizedItems.set(product.id, {
      ...product,
      quantity: (existingItem?.quantity ?? 0) + normalizedQuantity,
    });
  });

  return [...normalizedItems.values()];
}
