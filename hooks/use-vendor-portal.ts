import { startTransition, useEffect, useMemo, useState } from 'react';

import {
  ensureVendorProfile,
  getVendorCollectionPaths,
  subscribeToVendorOrders,
  subscribeToVendorProducts,
  updateVendorOrderStatus,
  updateVendorProduct,
  createVendorProduct,
  type VendorOrder,
  type VendorOrderStatus,
  type VendorProduct,
  type VendorProductInput,
} from '@/services/vendor/vendor-data-service';
import {
  signInVendor,
  signOutVendor,
  subscribeToVendorSession,
  supportsFirebaseVendorAuth,
  type VendorSession,
} from '@/services/vendor/vendor-auth-service';

export function useVendorPortal() {
  const [authBusy, setAuthBusy] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<VendorSession | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToVendorSession((nextSession) => {
      startTransition(() => {
        setSession(nextSession);
        setAuthLoading(false);
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!session) {
      setOrders([]);
      setProducts([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    setErrorMessage(null);
    let productStreamReady = false;
    let orderStreamReady = false;

    const markReady = () => {
      if (productStreamReady && orderStreamReady) {
        setDataLoading(false);
      }
    };

    void ensureVendorProfile(session).catch((error) => {
      console.warn('Vendor profile could not be prepared.', error);
    });

    const unsubscribeProducts = subscribeToVendorProducts({
      onError: (error) => {
        setErrorMessage(error.message);
        setDataLoading(false);
      },
      onUpdate: (nextProducts) => {
        startTransition(() => {
          setProducts(nextProducts);
          productStreamReady = true;
          markReady();
        });
      },
      session,
    });

    const unsubscribeOrders = subscribeToVendorOrders({
      onError: (error) => {
        setErrorMessage(error.message);
        setDataLoading(false);
      },
      onUpdate: (nextOrders) => {
        startTransition(() => {
          setOrders(nextOrders);
          orderStreamReady = true;
          markReady();
        });
      },
      session,
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [session]);

  async function login(email: string, password: string) {
    setAuthBusy(true);
    setErrorMessage(null);

    try {
      const nextSession = await signInVendor({ email, password });
      setSession(nextSession);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Vendor sign-in failed.'
      );
      throw error;
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    setAuthBusy(true);

    try {
      await signOutVendor();
      setSession(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Vendor sign-out failed.'
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function uploadProduct(input: VendorProductInput) {
    if (!session) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await createVendorProduct({ input, session });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Product upload failed.'
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function saveProductListing(
    productId: string,
    updates: Partial<
      Pick<VendorProduct, 'price' | 'stockQuantity' | 'subtitle' | 'unit'>
    >
  ) {
    if (!session) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await updateVendorProduct({
        productId,
        session,
        updates,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Product update failed.'
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function saveOrderStatus(orderId: string, status: VendorOrderStatus) {
    if (!session) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await updateVendorOrderStatus({
        orderId,
        session,
        status,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Order update failed.'
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }

  const metrics = useMemo(() => {
    const lowStockCount = products.filter(
      (product) => product.status !== 'active'
    ).length;
    const activeProducts = products.length;
    const liveOrders = orders.filter((order) => order.status !== 'completed').length;
    const completedRevenue = orders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0);

    return {
      activeProducts,
      completedRevenue,
      liveOrders,
      lowStockCount,
    };
  }, [orders, products]);

  return {
    authBusy,
    authLoading,
    collectionPaths: session
      ? getVendorCollectionPaths({
          cityId: session.cityId,
          vendorId: session.uid,
        })
      : null,
    dataLoading,
    errorMessage,
    login,
    logout,
    metrics,
    orders,
    products,
    saveOrderStatus,
    saveProductListing,
    saving,
    session,
    supportsFirebaseAuth: supportsFirebaseVendorAuth(),
    uploadProduct,
  };
}
