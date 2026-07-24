import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
} from 'react-native-reanimated';

import {
  formatCurrency,
  paymentOptions,
  savedLocations,
} from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import { CartQuantityEditor, StickyCheckoutBar } from '@/components/quick-order';
import { ProductIconBadge } from '@/components/material-primitives';
import { useCart } from '@/contexts/cartcontext';
import { usePricing, useRoleBadge } from '@/contexts/pricing/pricing-context';
import {
  buildWhatsAppOrderMessage,
  openWhatsAppOrder,
  type OpenWhatsAppOrderResult,
} from '@/services/order/whatsapp-order';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const FREE_DELIVERY_TARGET = 2000;

export default function CartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    fastCheckout?: string | string[];
    orderId?: string | string[];
    reorderedLines?: string | string[];
    reorderedUnits?: string | string[];
    reorderMode?: string | string[];
    reorderNotice?: string | string[];
    unavailableCount?: string | string[];
  }>();
  const {
    addToCart,
    cartItems,
    clearCart,
    itemCount,
    removeFromCart,
    subtotal,
    updateQuantity,
  } = useCart();
  const { quote, requestQuote, isFetching, error: pricingError } = usePricing();
  const { label: roleLabel } = useRoleBadge();

  const [address, setAddress] = useState(savedLocations[0].address);
  const [paymentMode, setPaymentMode] = useState<(typeof paymentOptions)[number]>('UPI');
  const [dismissedReorderNoticeKey, setDismissedReorderNoticeKey] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (cartItems.length > 0) {
      void requestQuote({
        items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });
    }
  }, [cartItems, requestQuote]);

  const quoteSubtotal = quote?.subtotal ?? subtotal;
  const quoteGrandTotal = quote?.grandTotal ?? subtotal;
  const quoteDiscount = quote?.discountTotal ?? 0;

  const reorderNotice = readFirstParam(params.reorderNotice);
  const reorderMode = readFirstParam(params.reorderMode);
  const reorderOrderId = readFirstParam(params.orderId);
  const reorderedLines = parseCountParam(params.reorderedLines);
  const reorderedUnits = parseCountParam(params.reorderedUnits);
  const unavailableCount = parseCountParam(params.unavailableCount);
  const isFastCheckout = readFirstParam(params.fastCheckout) === '1';
  const reorderNoticeKey = [
    reorderNotice,
    reorderMode,
    reorderOrderId,
    reorderedLines,
    reorderedUnits,
    unavailableCount,
    isFastCheckout ? '1' : '0',
  ].join(':');
  const showReorderNotice =
    reorderNotice === '1' &&
    Boolean(reorderOrderId) &&
    cartItems.length > 0 &&
    dismissedReorderNoticeKey !== reorderNoticeKey;

  const deliveryGap = Math.max(0, FREE_DELIVERY_TARGET - quoteSubtotal);
  const orderTotal = quoteGrandTotal + (deliveryGap > 0 ? 120 : 0);
  const checkoutNote =
    deliveryGap > 0
      ? `${formatCurrency(deliveryGap)} away from free delivery`
      : 'Free delivery unlocked for this contractor order';
  const reorderNoticeTitle = isFastCheckout
    ? 'Reorder ready for checkout'
    : reorderMode === 'replace'
      ? 'Previous order loaded'
      : 'Previous order added';
  const reorderNoticeSummary = [
    reorderOrderId,
    reorderedLines > 0 ? formatCountLabel(reorderedLines, 'line') : null,
    reorderedUnits > 0 ? formatCountLabel(reorderedUnits, 'item') : null,
  ]
    .filter(Boolean)
    .join(' / ');
  const reorderNoticeCaption =
    unavailableCount > 0
      ? `${formatCountLabel(unavailableCount, 'item')} unavailable and skipped safely.`
      : isFastCheckout
        ? 'Your order is loaded for a faster checkout review below.'
        : 'You can fine-tune quantities or continue straight to checkout.';

  async function getCurrentLocation() {
    setLoadingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to fill your address.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const resolvedAddress = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (resolvedAddress[0]) {
        const place = resolvedAddress[0];
        const composedAddress = [
          place.name,
          place.street,
          place.city ?? place.subregion,
          place.region,
          place.postalCode,
        ]
          .filter(Boolean)
          .join(', ');

        setAddress(composedAddress);
      }
    } catch (error) {
      Alert.alert('Location unavailable', 'Unable to read your current location right now.');
      console.error(error);
    } finally {
      setLoadingLocation(false);
    }
  }

  function handleCheckout() {
    if (address.trim().length < 10) {
      Alert.alert('Address needed', 'Add a valid address to continue.');
      return;
    }

    Alert.alert(
      'Order placed',
      `Payment mode: ${paymentMode}\nTotal: ${formatCurrency(orderTotal)}`,
      [
        {
          text: 'Done',
          onPress: () => {
            clearCart();
            router.push('/orders');
          },
        },
      ]
    );
  }

  async function handleOrderOnWhatsApp() {
    const deliveryFee = deliveryGap > 0 ? 120 : 0;
    const message = buildWhatsAppOrderMessage({
      address,
      deliveryFee,
      items: cartItems.map((item) => ({
        ...item,
        price:
          quote?.lines.find((line) => line.productId === item.id)?.effectiveUnitPrice ??
          item.price,
      })),
      paymentMode,
      subtotal: quoteSubtotal,
      total: orderTotal,
    });

    const orderResult: OpenWhatsAppOrderResult = await openWhatsAppOrder({ message });

    if (orderResult === 'unavailable') {
      Alert.alert(
        'Unable to open WhatsApp',
        'WhatsApp could not be opened right now. Please try again or continue with regular checkout.'
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          cartItems.length > 0 && styles.contentWithStickyFooter,
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart ({itemCount})</Text>
          <Text style={styles.subtitle}>
            Review quantities, delivery details, and payment before checkout.
          </Text>
        </View>

        {cartItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                color={materialTheme.colors.primary}
                name="cart-outline"
                size={30}
              />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>
              Add hardware from search or featured picks to start a new order.
            </Text>
            <Button
              label="Browse products"
              onPress={() => router.push('/search')}
              style={{ marginTop: materialTheme.spacing.lg }}
            />
          </Card>
        ) : (
          <>
            {showReorderNotice ? (
              <Card style={styles.reorderNoticeCard}>
                <View style={styles.reorderNoticeHeader}>
                  <View style={styles.reorderNoticeTitleRow}>
                    <View style={styles.reorderNoticeIcon}>
                      <Ionicons
                        color={materialTheme.colors.success}
                        name={isFastCheckout ? 'flash-outline' : 'refresh-outline'}
                        size={18}
                      />
                    </View>
                    <View style={styles.reorderNoticeTextWrap}>
                      <Text style={styles.reorderNoticeTitle}>{reorderNoticeTitle}</Text>
                      <Text style={styles.reorderNoticeSummary}>{reorderNoticeSummary}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDismissedReorderNoticeKey(reorderNoticeKey)}
                    style={styles.reorderNoticeCloseButton}>
                    <Ionicons
                      color={materialTheme.colors.textMuted}
                      name="close-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.reorderNoticeCaption}>{reorderNoticeCaption}</Text>
              </Card>
            ) : null}

            <View style={styles.progressCard}>
              <Ionicons
                color={materialTheme.colors.success}
                name="car-sport-outline"
                size={18}
              />
              <Text style={styles.progressText}>
                {deliveryGap > 0
                  ? `${formatCurrency(deliveryGap)} away from free delivery`
                  : 'Free delivery unlocked for this order'}
              </Text>
            </View>

            {cartItems.map((item) => {
              const lineQuote = quote?.lines.find((line) => line.productId === item.id);
              const linePrice = lineQuote?.effectiveUnitPrice ?? item.price;
              const lineTotal = lineQuote?.lineTotal ?? item.price * item.quantity;
              return (
              <Animated.View
                entering={FadeInDown.duration(200)}
                exiting={FadeOutLeft.duration(160)}
                key={item.id}
                layout={LinearTransition.springify().damping(18).stiffness(220)}
                style={styles.cartCardWrapper}>
                <Card style={styles.cartCard}>
                  <View style={styles.cartCardTop}>
                    <ProductIconBadge accent={item.accent} icon={item.icon} size={52} />
                    <View style={styles.cartInfo}>
                      <Text style={styles.cartName}>{item.name}</Text>
                      <Text style={styles.cartMeta}>
                        {formatCurrency(linePrice)} / {item.unit}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.id)}
                      style={styles.removeButton}>
                      <Ionicons
                        color={materialTheme.colors.textMuted}
                        name="trash-outline"
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cartTotalsRow}>
                    <View style={styles.cartTotalChip}>
                      <Text style={styles.cartTotalChipText}>
                        {item.quantity} x {formatCurrency(linePrice)}
                      </Text>
                    </View>
                    <Text style={styles.lineTotal}>
                      {formatCurrency(lineTotal)}
                    </Text>
                  </View>

                  <CartQuantityEditor
                    bulkOptions={[5, 10]}
                    onBulkAdd={(amount) => addToCart(item, amount)}
                    onCommitQuantity={(amount) => updateQuantity(item.id, amount)}
                    onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                    onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                    quantity={item.quantity}
                  />
                </Card>
              </Animated.View>
              );
            })}

            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Delivery address</Text>
              <Button
                label="Use current location"
                onPress={getCurrentLocation}
                loading={loadingLocation}
                icon={<Ionicons color={materialTheme.colors.white} name="locate-outline" size={16} />}
                style={{ marginTop: materialTheme.spacing.md }}
              />
              <Input
                multiline
                onChangeText={setAddress}
                placeholder="Enter complete delivery address"
                containerStyle={{ marginTop: materialTheme.spacing.md }}
                style={{ minHeight: 110, paddingVertical: materialTheme.spacing.md, textAlignVertical: 'top' }}
                value={address}
              />
            </Card>

            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Payment method</Text>
              <View style={styles.paymentRow}>
                {paymentOptions.map((option) => {
                  const isActive = paymentMode === option;

                  return (
                    <TouchableOpacity
                      key={option}
                      onPress={() => setPaymentMode(option)}
                      style={[
                        styles.paymentChip,
                        isActive && styles.paymentChipActive,
                      ]}>
                      <Text
                        style={[
                          styles.paymentChipText,
                          isActive && styles.paymentChipTextActive,
                        ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(quoteSubtotal)}</Text>
              </View>
              {quoteDiscount > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount{quote?.couponApplied ? ` (${quote.couponApplied.code})` : ''}</Text>
                  <Text style={styles.summaryValue}>-{formatCurrency(quoteDiscount)}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>
                  {deliveryGap > 0 ? formatCurrency(120) : 'FREE'}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(orderTotal)}</Text>
              </View>
              <Text style={styles.summaryFootnote}>
                {quote ? `Server-verified • ${roleLabel} pricing${isFetching ? ' • refreshing' : ''}` : 'Refreshing server pricing…'}
                {pricingError ? ` • ${pricingError.message}` : ''}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      {cartItems.length > 0 ? (
        <StickyCheckoutBar
          itemCount={itemCount}
          note={checkoutNote}
          onCheckout={handleCheckout}
          onSecondaryAction={() => {
            void handleOrderOnWhatsApp();
          }}
          secondaryActionLabel="Order on WhatsApp"
          total={orderTotal}
        />
      ) : null}
    </SafeAreaView>
  );
}

function readFirstParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseCountParam(value?: string | string[]) {
  const firstValue = readFirstParam(value);

  if (!firstValue) {
    return 0;
  }

  const parsedValue = Number.parseInt(firstValue, 10);

  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  return Math.max(0, parsedValue);
}

function formatCountLabel(value: number, label: string) {
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: materialTheme.spacing.xxxl,
  },
  contentWithStickyFooter: {
    paddingBottom: 238,
  },
  header: {
    marginBottom: materialTheme.spacing.lg,
  },
  title: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.text,
  },
  subtitle: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  reorderNoticeCard: {
    borderColor: materialTheme.colors.success,
    borderWidth: 1,
    marginBottom: materialTheme.spacing.lg,
  },
  reorderNoticeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reorderNoticeTitleRow: { alignItems: 'center', flexDirection: 'row', gap: materialTheme.spacing.sm },
  reorderNoticeIcon: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reorderNoticeTextWrap: { flex: 1 },
  reorderNoticeTitle: { ...materialTheme.typography.h3, color: materialTheme.colors.text },
  reorderNoticeSummary: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  reorderNoticeCaption: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
  },
  reorderNoticeCloseButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  progressCard: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: materialTheme.spacing.sm,
    marginBottom: materialTheme.spacing.lg,
    padding: materialTheme.spacing.md,
  },
  progressText: { ...materialTheme.typography.caption, color: materialTheme.colors.text, flex: 1 },
  cartCardWrapper: {
    marginBottom: materialTheme.spacing.md,
  },
  cartCard: {
    padding: materialTheme.spacing.lg,
  },
  cartCardTop: { alignItems: 'center', flexDirection: 'row', gap: materialTheme.spacing.md },
  cartInfo: { flex: 1 },
  cartName: { ...materialTheme.typography.h3, color: materialTheme.colors.text },
  cartMeta: { ...materialTheme.typography.caption, color: materialTheme.colors.textMuted, marginTop: materialTheme.spacing.xs },
  removeButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  cartTotalsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: materialTheme.spacing.lg,
  },
  cartTotalChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.sm,
  },
  cartTotalChipText: { ...materialTheme.typography.caption, color: materialTheme.colors.textMuted },
  lineTotal: { ...materialTheme.typography.h3, color: materialTheme.colors.primary },
  sectionCard: {
    marginTop: materialTheme.spacing.lg,
  },
  sectionTitle: { ...materialTheme.typography.h3, color: materialTheme.colors.text },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: materialTheme.spacing.sm, marginTop: materialTheme.spacing.md },
  paymentChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: materialTheme.spacing.lg,
    paddingVertical: materialTheme.spacing.md,
  },
  paymentChipActive: { backgroundColor: materialTheme.colors.primary },
  paymentChipText: { ...materialTheme.typography.caption, color: materialTheme.colors.text },
  paymentChipTextActive: { color: materialTheme.colors.white },
  summaryCard: {
    marginTop: materialTheme.spacing.lg,
  },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: materialTheme.spacing.sm },
  summaryLabel: { ...materialTheme.typography.body, color: materialTheme.colors.textMuted },
  summaryValue: { ...materialTheme.typography.label, color: materialTheme.colors.text },
  emptyCard: {
    alignItems: 'center',
    marginTop: materialTheme.spacing.xxl,
    padding: materialTheme.spacing.xxl,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  emptyTitle: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
    marginTop: materialTheme.spacing.lg,
  },
  emptyText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
    textAlign: 'center',
  },
  summaryRowTotal: {
    borderTopColor: materialTheme.colors.border,
    borderTopWidth: 1,
    marginTop: materialTheme.spacing.sm,
    paddingTop: materialTheme.spacing.md,
  },
  totalLabel: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  totalValue: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.primary,
  },
  summaryFootnote: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.md,
  },
});
