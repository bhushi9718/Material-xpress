import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  LiveOrderTrackingCard,
  OrderHistoryCard,
  orderTrackingPalette,
} from '@/components/order-tracking';
import { materialTheme } from '@/constants/material-theme';
import { useOrderReorder } from '@/hooks/use-order-reorder';
import { useLiveOrderTracking } from '@/hooks/use-live-order-tracking';
import { getOrderReorderSummary } from '@/services/orders/reorder-service';
import { isOrderActive } from '@/services/orders/order-tracking-service';

export default function OrdersScreen() {
  const {
    activeOrder,
    cityLabel,
    errorMessage,
    historicalOrders,
    isLoading,
    orders,
    source,
  } = useLiveOrderTracking();
  const {
    checkoutPreviousOrder,
    reorderToCart,
    repeatFullCart,
  } = useOrderReorder();
  const liveOrdersCount = orders.filter((order) => isOrderActive(order.statusKey)).length;
  const completedOrdersCount = orders.filter(
    (order) => order.statusKey === 'delivered'
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Realtime dispatch</Text>
            <Text style={styles.title}>Orders</Text>
          </View>
          <View style={styles.cityChip}>
            <Ionicons
              color={orderTrackingPalette.liveGlow}
              name="location-outline"
              size={14}
            />
            <Text style={styles.cityChipText}>{cityLabel}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Follow each dispatch milestone, rider handoff, and delivery ETA from the existing orders flow.
        </Text>

        <View style={styles.snapshotCard}>
          <View style={styles.snapshotMetric}>
            <Text style={styles.snapshotValue}>{String(orders.length).padStart(2, '0')}</Text>
            <Text style={styles.snapshotLabel}>Recent jobs</Text>
          </View>
          <View style={styles.snapshotMetric}>
            <Text style={styles.snapshotValue}>{String(liveOrdersCount).padStart(2, '0')}</Text>
            <Text style={styles.snapshotLabel}>Live updates</Text>
          </View>
          <View style={styles.snapshotMetric}>
            <Text style={styles.snapshotValue}>{String(completedOrdersCount).padStart(2, '0')}</Text>
            <Text style={styles.snapshotLabel}>Delivered</Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.noticeCard}>
            <Ionicons
              color={orderTrackingPalette.warning}
              name="warning-outline"
              size={18}
            />
            <Text style={styles.noticeText}>
              Firebase sync is unavailable right now, so the screen is showing the local live preview stream.
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={orderTrackingPalette.liveGlow} />
            <Text style={styles.loadingText}>Syncing order tracking feed...</Text>
          </View>
        ) : null}

        {activeOrder ? (
          <LiveOrderTrackingCard
            cityLabel={cityLabel}
            onReorder={() => reorderToCart(activeOrder)}
            order={activeOrder}
            source={source}
          />
        ) : (
          <View style={styles.idleCard}>
            <Ionicons
              color={orderTrackingPalette.liveGlow}
              name="checkmark-done-outline"
              size={22}
            />
            <Text style={styles.idleTitle}>No active deliveries</Text>
            <Text style={styles.idleText}>
              Your recent orders are complete. Reorder any bundle below to trigger a new tracked dispatch.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous orders</Text>
          <Text style={styles.sectionCaption}>
            {source === 'firebase'
              ? 'Repeat full carts or add old kits straight into the current cart'
              : 'Preview data until Firebase credentials are connected'}
          </Text>
        </View>

        {historicalOrders.map((order) => (
          <OrderHistoryCard
            key={order.id}
            onCheckout={() => checkoutPreviousOrder(order)}
            onReorder={() => reorderToCart(order)}
            onRepeatCart={() => repeatFullCart(order)}
            order={order}
            reorderSummary={getOrderReorderSummary(order)}
          />
        ))}

        {!activeOrder && historicalOrders.length === 0 && !isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              New city rollouts can plug into the same tracking architecture once orders start syncing here.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: orderTrackingPalette.background,
    flex: 1,
  },
  content: {
    padding: materialTheme.screenPadding,
    paddingBottom: 32,
  },
  cityChip: {
    alignItems: 'center',
    backgroundColor: '#101A17',
    borderColor: orderTrackingPalette.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  cityChipText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.text,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#0D1714',
    borderColor: orderTrackingPalette.border,
    borderRadius: materialTheme.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
  },
  emptyText: {
    ...materialTheme.typography.body,
    color: orderTrackingPalette.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    ...materialTheme.typography.h3,
    color: orderTrackingPalette.text,
  },
  eyebrow: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.liveGlow,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idleCard: {
    alignItems: 'center',
    backgroundColor: '#0D1714',
    borderColor: orderTrackingPalette.border,
    borderRadius: materialTheme.radius.lg,
    borderWidth: 1,
    marginTop: 22,
    padding: 24,
  },
  idleText: {
    ...materialTheme.typography.body,
    color: orderTrackingPalette.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  idleTitle: {
    ...materialTheme.typography.h3,
    color: orderTrackingPalette.text,
    marginTop: 12,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#0D1714',
    borderColor: orderTrackingPalette.border,
    borderRadius: materialTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    padding: 18,
  },
  loadingText: {
    ...materialTheme.typography.body,
    color: orderTrackingPalette.text,
    flex: 1,
  },
  noticeCard: {
    alignItems: 'center',
    backgroundColor: '#171207',
    borderColor: '#3D2F14',
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    padding: 14,
  },
  noticeText: {
    ...materialTheme.typography.caption,
    color: '#F1D38B',
    flex: 1,
  },
  sectionCaption: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 24,
  },
  sectionTitle: {
    ...materialTheme.typography.h3,
    color: orderTrackingPalette.text,
  },
  title: {
    ...materialTheme.typography.h1,
    color: orderTrackingPalette.text,
    marginTop: 4,
  },
  subtitle: {
    ...materialTheme.typography.body,
    color: orderTrackingPalette.muted,
    marginTop: 10,
  },
  snapshotCard: {
    backgroundColor: '#0D1714',
    borderColor: orderTrackingPalette.border,
    borderRadius: materialTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    padding: 18,
  },
  snapshotMetric: {
    flex: 1,
  },
  snapshotValue: {
    ...materialTheme.typography.h2,
    color: orderTrackingPalette.text,
  },
  snapshotLabel: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 6,
  },
});
