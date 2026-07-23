import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { formatCurrency } from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import {
  isOrderActive,
  type TrackedOrder,
  type TrackingSource,
  type TrackingTimelineStep,
} from '@/services/orders/order-tracking-service';

export const orderTrackingPalette = {
  background: '#07110E',
  border: '#183028',
  liveGlow: '#4EE29B',
  muted: '#8CA298',
  panel: '#0D1714',
  panelElevated: '#11201C',
  text: '#F6F3ED',
  warning: '#DAB35D',
};

type LiveOrderTrackingCardProps = {
  cityLabel: string;
  onReorder: () => void;
  order: TrackedOrder;
  source: TrackingSource;
};

type OrderHistoryCardProps = {
  onCheckout: () => void;
  onReorder: () => void;
  onRepeatCart: () => void;
  order: TrackedOrder;
  reorderSummary: string;
};

export function LiveOrderTrackingCard({
  cityLabel,
  onReorder,
  order,
  source,
}: LiveOrderTrackingCardProps) {
  const progress = useSharedValue(order.progress);
  const pulse = useSharedValue(0.82);

  useEffect(() => {
    progress.value = withTiming(order.progress, { duration: 680 });
  }, [order.progress, progress]);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [pulse]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value, 0.05) * 100}%`,
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.96 + pulse.value * 0.08 }],
  }));
  const isPreviewMode = source === 'mock';

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={styles.liveCard}>
      <View style={styles.liveHeader}>
        <View style={styles.liveHeaderRow}>
          <Animated.View style={[styles.liveDot, pulseStyle]} />
          <Text style={styles.liveHeaderLabel}>Live delivery</Text>
        </View>
        <View style={styles.liveBadgeRow}>
          <View style={styles.cityBadge}>
            <Text style={styles.cityBadgeText}>{cityLabel}</Text>
          </View>
          <View
            style={[
              styles.sourceBadge,
              isPreviewMode && styles.sourceBadgePreview,
            ]}>
            <Text
              style={[
                styles.sourceBadgeText,
                isPreviewMode && styles.sourceBadgeTextPreview,
              ]}>
              {isPreviewMode ? 'Preview sync' : 'Firebase live'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.orderId}>{order.id}</Text>
      <Text style={styles.liveUpdate}>{order.liveUpdate}</Text>

      <View style={styles.metricGrid}>
        <TrackingMetric
          icon="time-outline"
          label="Arrival"
          value={order.etaLabel ?? 'Updating'}
        />
        <TrackingMetric
          icon="business-outline"
          label="Hub"
          value={order.hubName}
        />
        <TrackingMetric
          icon="navigate-outline"
          label="Zone"
          value={order.deliveryZone}
        />
      </View>

      <View style={styles.progressShell}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>
            {Math.round(order.progress * 100)}% route complete
          </Text>
          <Text style={styles.progressUpdateText}>{order.updatedAtLabel}</Text>
        </View>
      </View>

      {order.rider ? (
        <View style={styles.riderCard}>
          <View style={styles.riderAvatar}>
            <Ionicons
              color={orderTrackingPalette.liveGlow}
              name="bicycle-outline"
              size={18}
            />
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderLabel}>Assigned rider</Text>
            <Text style={styles.riderName}>{order.rider.name}</Text>
            <Text style={styles.riderMeta}>
              {order.rider.vehicleLabel} / {order.rider.zone}
            </Text>
          </View>
        </View>
      ) : null}

      <OrderTimeline steps={order.timeline} />

      <View style={styles.liveFooter}>
        <View>
          <Text style={styles.footerLabel}>Order total</Text>
          <Text style={styles.footerValue}>{formatCurrency(order.total)}</Text>
        </View>
        <TouchableOpacity onPress={onReorder} style={styles.reorderButton}>
          <Text style={styles.reorderButtonText}>Reorder same kit</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function OrderHistoryCard({
  onCheckout,
  onReorder,
  onRepeatCart,
  order,
  reorderSummary,
}: OrderHistoryCardProps) {
  const showMiniProgress = isOrderActive(order.statusKey);

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderInfo}>
          <Text style={styles.historyOrderId}>{order.id}</Text>
          <Text style={styles.historyDate}>{order.date}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${order.statusAccent}22` },
          ]}>
          <Text style={[styles.statusBadgeText, { color: order.statusAccent }]}>
            {order.statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.historySummary}>{order.itemSummary}</Text>
      <View style={styles.historyMetaRow}>
        <View style={styles.historyMetaChip}>
          <Ionicons
            color={orderTrackingPalette.muted}
            name="layers-outline"
            size={14}
          />
          <Text style={styles.historyMetaText}>{reorderSummary}</Text>
        </View>
      </View>

      {showMiniProgress ? (
        <View style={styles.historyProgressWrap}>
          <View style={styles.historyProgressTrack}>
            <View
              style={[
                styles.historyProgressFill,
                { width: `${Math.max(order.progress, 0.08) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.historyProgressText}>
            {order.etaLabel ?? order.updatedAtLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.historyFooter}>
        <View style={styles.historyFooterTopRow}>
          <View>
            <Text style={styles.footerLabel}>Order total</Text>
            <Text style={styles.footerValue}>{formatCurrency(order.total)}</Text>
          </View>
          <TouchableOpacity onPress={onRepeatCart} style={styles.historyRepeatButton}>
            <Text style={styles.historyRepeatText}>Repeat full cart</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.historyActionRow}>
          <TouchableOpacity onPress={onReorder} style={styles.historySecondaryButton}>
            <Text style={styles.historySecondaryButtonText}>Add to current cart</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCheckout} style={styles.historyCheckoutButton}>
            <Text style={styles.historyCheckoutButtonText}>Checkout now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function TrackingMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Ionicons color={orderTrackingPalette.muted} name={icon} size={16} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function OrderTimeline({ steps }: { steps: TrackingTimelineStep[] }) {
  return (
    <View style={styles.timelineWrap}>
      {steps.map((step, index) => {
        const isComplete = step.state === 'complete';
        const isCurrent = step.state === 'current';
        const isCancelled = step.state === 'cancelled';

        return (
          <View key={step.id} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineDot,
                  isComplete && styles.timelineDotComplete,
                  isCurrent && styles.timelineDotCurrent,
                  isCancelled && styles.timelineDotCancelled,
                ]}
              />
              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    isComplete && styles.timelineLineComplete,
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.timelineContent}>
              <View style={styles.timelineTitleRow}>
                <Text style={styles.timelineTitle}>{step.title}</Text>
                <Text style={styles.timelineTime}>{step.timeLabel}</Text>
              </View>
              <Text style={styles.timelineDetail}>{step.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cityBadge: {
    backgroundColor: '#14211D',
    borderColor: '#1F3A31',
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cityBadgeText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.text,
  },
  footerLabel: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
  },
  footerValue: {
    ...materialTheme.typography.h3,
    color: orderTrackingPalette.text,
    marginTop: 6,
  },
  historyCard: {
    backgroundColor: orderTrackingPalette.panel,
    borderColor: orderTrackingPalette.border,
    borderRadius: materialTheme.radius.lg,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  historyDate: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 5,
  },
  historyFooter: {
    borderTopColor: orderTrackingPalette.border,
    borderTopWidth: 1,
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
  },
  historyFooterTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyHeaderInfo: {
    flex: 1,
    paddingRight: 12,
  },
  historyOrderId: {
    ...materialTheme.typography.h3,
    color: orderTrackingPalette.text,
  },
  historyProgressFill: {
    backgroundColor: orderTrackingPalette.liveGlow,
    borderRadius: materialTheme.radius.pill,
    height: '100%',
  },
  historyProgressText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 8,
  },
  historyProgressTrack: {
    backgroundColor: '#14211D',
    borderRadius: materialTheme.radius.pill,
    height: 8,
    overflow: 'hidden',
  },
  historyProgressWrap: {
    marginTop: 16,
  },
  historyActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  historyCheckoutButton: {
    alignItems: 'center',
    backgroundColor: orderTrackingPalette.liveGlow,
    borderRadius: materialTheme.radius.md,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyCheckoutButtonText: {
    ...materialTheme.typography.caption,
    color: '#082316',
  },
  historyMetaChip: {
    alignItems: 'center',
    backgroundColor: '#14211D',
    borderColor: '#20352E',
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  historyMetaRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  historyMetaText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
  },
  historyRepeatButton: {
    backgroundColor: '#183128',
    borderRadius: materialTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyRepeatText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.liveGlow,
  },
  historySecondaryButton: {
    alignItems: 'center',
    backgroundColor: '#11201C',
    borderColor: '#254137',
    borderRadius: materialTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historySecondaryButtonText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.text,
  },
  historySummary: {
    ...materialTheme.typography.body,
    color: orderTrackingPalette.text,
    marginTop: 16,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  liveCard: {
    backgroundColor: orderTrackingPalette.panelElevated,
    borderColor: '#264339',
    borderRadius: materialTheme.radius.lg,
    borderWidth: 1,
    marginTop: 22,
    padding: 20,
  },
  liveDot: {
    backgroundColor: orderTrackingPalette.liveGlow,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  liveFooter: {
    alignItems: 'center',
    borderTopColor: orderTrackingPalette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
  },
  liveHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveHeaderLabel: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.liveGlow,
    textTransform: 'uppercase',
  },
  liveHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  liveUpdate: {
    ...materialTheme.typography.body,
    color: orderTrackingPalette.text,
    marginTop: 10,
  },
  metricCard: {
    backgroundColor: '#14211D',
    borderRadius: materialTheme.radius.md,
    flex: 1,
    minWidth: 92,
    padding: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  metricLabel: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 10,
  },
  metricValue: {
    ...materialTheme.typography.label,
    color: orderTrackingPalette.text,
    marginTop: 5,
  },
  orderId: {
    ...materialTheme.typography.h2,
    color: orderTrackingPalette.text,
    marginTop: 14,
  },
  progressFill: {
    backgroundColor: orderTrackingPalette.liveGlow,
    borderRadius: materialTheme.radius.pill,
    height: '100%',
  },
  progressLabel: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.text,
  },
  progressLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressShell: {
    marginTop: 18,
  },
  progressTrack: {
    backgroundColor: '#16241F',
    borderRadius: materialTheme.radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  progressUpdateText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
  },
  reorderButton: {
    backgroundColor: orderTrackingPalette.liveGlow,
    borderRadius: materialTheme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reorderButtonText: {
    ...materialTheme.typography.caption,
    color: '#082316',
  },
  riderAvatar: {
    alignItems: 'center',
    backgroundColor: '#13211C',
    borderRadius: materialTheme.radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  riderCard: {
    alignItems: 'center',
    backgroundColor: '#13211C',
    borderRadius: materialTheme.radius.md,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    padding: 14,
  },
  riderInfo: {
    flex: 1,
  },
  riderLabel: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
  },
  riderMeta: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 4,
  },
  riderName: {
    ...materialTheme.typography.label,
    color: orderTrackingPalette.text,
    marginTop: 4,
  },
  sourceBadge: {
    backgroundColor: '#13211C',
    borderColor: '#1F3A31',
    borderRadius: materialTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sourceBadgePreview: {
    backgroundColor: '#201B10',
    borderColor: '#46351A',
  },
  sourceBadgeText: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.liveGlow,
  },
  sourceBadgeTextPreview: {
    color: orderTrackingPalette.warning,
  },
  statusBadge: {
    borderRadius: materialTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: {
    ...materialTheme.typography.caption,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineDetail: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
    marginTop: 5,
  },
  timelineDot: {
    backgroundColor: '#193026',
    borderColor: orderTrackingPalette.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 12,
    marginTop: 4,
    width: 12,
  },
  timelineDotCancelled: {
    backgroundColor: '#3C1714',
    borderColor: '#76312B',
  },
  timelineDotComplete: {
    backgroundColor: orderTrackingPalette.liveGlow,
    borderColor: orderTrackingPalette.liveGlow,
  },
  timelineDotCurrent: {
    backgroundColor: orderTrackingPalette.warning,
    borderColor: orderTrackingPalette.warning,
  },
  timelineLine: {
    backgroundColor: orderTrackingPalette.border,
    flex: 1,
    marginTop: 6,
    width: 2,
  },
  timelineLineComplete: {
    backgroundColor: orderTrackingPalette.liveGlow,
  },
  timelineRail: {
    alignItems: 'center',
    marginRight: 12,
    minHeight: 52,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineTime: {
    ...materialTheme.typography.caption,
    color: orderTrackingPalette.muted,
  },
  timelineTitle: {
    ...materialTheme.typography.label,
    color: orderTrackingPalette.text,
    flex: 1,
    paddingRight: 12,
  },
  timelineTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timelineWrap: {
    marginTop: 22,
  },
});
