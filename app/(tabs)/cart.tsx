import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
} from '@/services/order/whatsapp-order';

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

  if (cartItems.length > 0) {
    void requestQuote({
      items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
    });
  }

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

    const orderResult = await openWhatsAppOrder({ message });

    if (orderResult === 'missing-number') {
      Alert.alert(
        'WhatsApp ordering unavailable',
        'Add EXPO_PUBLIC_MATERIAL_XPRESS_WHATSAPP_NUMBER to enable direct WhatsApp orders.'
      );
      return;
    }

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
          <View style={styles.emptyCard}>
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
            <TouchableOpacity
              onPress={() => router.push('/search')}
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Browse products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {showReorderNotice ? (
              <View style={styles.reorderNoticeCard}>
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
              </View>
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
                style={styles.cartCard}>
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
              </Animated.View>
              );
            })}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Delivery address</Text>
              <TouchableOpacity onPress={getCurrentLocation} style={styles.locationButton}>
                {loadingLocation ? (
                  <ActivityIndicator color={materialTheme.colors.white} />
                ) : (
                  <>
                    <Ionicons
                      color={materialTheme.colors.white}
                      name="locate-outline"
                      size={16}
                    />
                    <Text style={styles.locationButtonText}>Use current location</Text>
                  </>
                )}
              </TouchableOpacity>
              <TextInput
                multiline
                onChangeText={setAddress}
                placeholder="Enter complete delivery address"
                placeholderTextColor={materialTheme.colors.textMuted}
                style={styles.addressInput}
                textAlignVertical="top"
                value={address}
              />
            </View>

            <View style={styles.sectionCard}>
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
            </View>

            <View style={styles.summaryCard}>
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
                {quote ? `Server-verified � ${roleLabel} pricing${isFetching ? ' � refreshing' : ''}` : 'Refreshing server pricing�'}
                {pricingError ? ` � ${pricingError.message}` : ''}
              </Text>
            </View>
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

const styles = StyleSheet.create({  reorderNoticeCard: {
    ...materialTheme.shadow,
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderColor: materialTheme.colors.success,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 6,
    padding: 14,
  },
  reorderNoticeHeader: { flex: 1 },
  reorderNoticeTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  reorderNoticeIcon: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reorderNoticeTextWrap: { flex: 1 },
  reorderNoticeTitle: { ...materialTheme.typography.h3, color: materialTheme.colors.text },
  reorderNoticeSummary: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 4,
  },
  reorderNoticeCaption: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: 4,
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
    gap: 10,
    marginBottom: 16,
    padding: 12,
  },
  progressText: { ...materialTheme.typography.caption, color: materialTheme.colors.text, flex: 1 },
  cartCard: { ...materialTheme.shadow, backgroundColor: materialTheme.colors.surface, borderRadius: materialTheme.radius.md, marginBottom: 12, padding: 16 },
  cartCardTop: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  cartInfo: { flex: 1 },
  cartName: { ...materialTheme.typography.h3, color: materialTheme.colors.text },
  cartMeta: { ...materialTheme.typography.caption, color: materialTheme.colors.textMuted, marginTop: 6 },
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
    marginTop: 16,
  },
  cartTotalChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cartTotalChipText: { ...materialTheme.typography.caption, color: materialTheme.colors.textMuted },
  lineTotal: { ...materialTheme.typography.h3, color: materialTheme.colors.primary },
  sectionCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 18,
    padding: 18,
  },
  sectionTitle: { ...materialTheme.typography.h3, color: materialTheme.colors.text },
  locationButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 14,
  },
  locationButtonText: { ...materialTheme.typography.label, color: materialTheme.colors.white },
  addressInput: {
    ...materialTheme.typography.body,
    backgroundColor: materialTheme.colors.white,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    color: materialTheme.colors.text,
    marginTop: 14,
    minHeight: 110,
    padding: 14,
  },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  paymentChip: {
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paymentChipActive: { backgroundColor: materialTheme.colors.primary },
  paymentChipText: { ...materialTheme.typography.caption, color: materialTheme.colors.text },
  paymentChipTextActive: { color: materialTheme.colors.white },
  summaryCard: {
    ...materialTheme.shadow,
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 18,
    padding: 18,
  },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { ...materialTheme.typography.body, color: materialTheme.colors.textMuted },
  summaryValue: { ...materialTheme.typography.label, color: materialTheme.colors.text },
  safeArea: {
    backgroundColor: materialTheme.colors.background,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: 32,
  },
  contentWithStickyFooter: {
    paddingBottom: 238,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.text,
  },
  subtitle: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 6,
  },
  emptyCard: {
    ...materialTheme.shadow,
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.lg,
    marginTop: 24,
    padding: 28,
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
    marginTop: 18,
  },
  emptyText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.md,
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.white,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primary,
    borderRadius: materialTheme.radius.md,
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.white,
  },
  summaryRowTotal: {
    borderTopColor: materialTheme.colors.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 12,
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
    marginTop: 10,
  },
});
