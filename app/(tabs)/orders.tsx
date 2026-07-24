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
} from '@/components/order-tracking';
import { materialTheme } from '@/constants/material-theme';
import { useOrderReorder } from '@/hooks/use-order-reorder';
import { useLiveOrderTracking } from '@/hooks/use-live-order-tracking';
import { getOrderReorderSummary } from '@/services/orders/reorder-service';
import { isOrderActive } from '@/services/orders/order-tracking-service';
import { Card } from '@/components/ui/Card';

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
              color={materialTheme.colors.success}
              name="location-outline"
              size={14}
            />
            <Text style={styles.cityChipText}>{cityLabel}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Follow each dispatch milestone, rider handoff, and delivery ETA from the existing orders flow.
        </Text>

        <Card style={styles.snapshotCard}>
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
        </Card>

        {errorMessage ? (
          <Card style={styles.noticeCard}>
            <Ionicons
              color={materialTheme.colors.terracotta}
              name="warning-outline"
              size={18}
            />
            <Text style={styles.noticeText}>
              Firebase sync is unavailable right now, so the screen is showing the local live preview stream.
            </Text>
          </Card>
        ) : null}

        {isLoading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={materialTheme.colors.primary} />
            <Text style={styles.loadingText}>Syncing order tracking feed...</Text>
          </Card>
        ) : null}

        {activeOrder ? (
          <LiveOrderTrackingCard
            cityLabel={cityLabel}
            onReorder={() => reorderToCart(activeOrder)}
            order={activeOrder}
            source={source}
          />
        ) : (
          <Card style={styles.idleCard}>
            <Ionicons
              color={materialTheme.colors.success}
              name="checkmark-done-outline"
              size={22}
            />
            <Text style={styles.idleTitle}>No active deliveries</Text>
            <Text style={styles.idleText}>
              Your recent orders are complete. Reorder any bundle below to trigger a new tracked dispatch.
            </Text>
          </Card>
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
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              New city rollouts can plug into the same tracking architecture once orders start syncing here.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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
  cityChip: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderColor: materialTheme.colors.border,
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: materialTheme.spacing.md,
    paddingVertical: materialTheme.spacing.sm,
  },
  cityChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.text,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: materialTheme.spacing.lg,
    padding: materialTheme.spacing.xxl,
  },
  emptyText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  eyebrow: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.success,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idleCard: {
    alignItems: 'center',
    marginTop: materialTheme.spacing.xl,
    padding: materialTheme.spacing.xxl,
  },
  idleText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
    textAlign: 'center',
  },
  idleTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
    marginTop: materialTheme.spacing.md,
  },
  loadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: materialTheme.spacing.md,
    marginTop: materialTheme.spacing.lg,
    padding: materialTheme.spacing.lg,
  },
  loadingText: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
    flex: 1,
  },
  noticeCard: {
    alignItems: 'center',
    borderColor: materialTheme.colors.terracotta,
    borderWidth: 1,
    flexDirection: 'row',
    gap: materialTheme.spacing.sm,
    marginTop: materialTheme.spacing.lg,
    padding: materialTheme.spacing.md,
  },
  noticeText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.terracotta,
    flex: 1,
  },
  sectionCaption: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.xs,
  },
  sectionHeader: {
    marginTop: materialTheme.spacing.xxl,
  },
  sectionTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  title: {
    ...materialTheme.typography.h1,
    color: materialTheme.colors.text,
    marginTop: materialTheme.spacing.xs,
  },
  subtitle: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.md,
  },
  snapshotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: materialTheme.spacing.xl,
    padding: materialTheme.spacing.lg,
  },
  snapshotMetric: {
    flex: 1,
  },
  snapshotValue: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.text,
  },
  snapshotLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
    marginTop: materialTheme.spacing.sm,
  },
});
