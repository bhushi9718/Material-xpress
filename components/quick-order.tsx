import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewStyle,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCurrency } from '@/constants/material-data';
import { materialTheme } from '@/constants/material-theme';
import { QuantityStepper } from '@/components/material-primitives';
import { Button } from '@/components/ui/Button';

type QuickOrderControlsProps = {
  bulkOptions?: number[];
  onAddOne: () => void;
  onBulkAdd: (amount: number) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  quantity: number;
  variant?: 'card' | 'list';
};

type CartQuantityEditorProps = {
  bulkOptions?: number[];
  onBulkAdd: (amount: number) => void;
  onCommitQuantity: (amount: number) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  quantity: number;
};

type StickyCheckoutBarProps = {
  itemCount: number;
  note: string;
  onCheckout: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  total: number;
};

type ScaleButtonProps = TouchableOpacityProps & {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export function QuickOrderControls({
  bulkOptions = [5, 10],
  onAddOne,
  onBulkAdd,
  onDecrease,
  onIncrease,
  quantity,
  variant = 'card',
}: QuickOrderControlsProps) {
  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(220)}
      style={styles.quickOrderWrap}>
      {quantity > 0 ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.springify().damping(18)}
          style={[
            styles.quickOrderPrimaryRow,
            variant === 'list' && styles.quickOrderPrimaryRowList,
          ]}>
          <QuantityStepper
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            quantity={quantity}
          />
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityBadgeLabel}>In cart</Text>
            <Text style={styles.quantityBadgeValue}>{quantity}</Text>
          </View>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.springify().damping(18)}
          style={styles.quickOrderPrimaryRow}>
          <Button
            label={variant === 'list' ? 'Fast add' : 'Add'}
            onPress={onAddOne}
            icon={<Ionicons color={materialTheme.colors.white} name="add" size={16} />}
            style={{ flex: 1, paddingVertical: 11 }}
          />
        </Animated.View>
      )}

      <View style={styles.bulkRow}>
        {bulkOptions.map((amount) => (
          <ScaleButton
            key={amount}
            onPress={() => onBulkAdd(amount)}
            style={[
              styles.bulkChip,
              variant === 'list' && styles.bulkChipList,
            ]}>
            <Text style={styles.bulkChipText}>+{amount}</Text>
          </ScaleButton>
        ))}
      </View>
    </Animated.View>
  );
}

export function CartQuantityEditor({
  bulkOptions = [5, 10],
  onBulkAdd,
  onCommitQuantity,
  onDecrease,
  onIncrease,
  quantity,
}: CartQuantityEditorProps) {
  const [draftQuantity, setDraftQuantity] = useState(() => String(quantity));
  const [isEditing, setIsEditing] = useState(false);

  function commitQuantity() {
    const parsedValue = Number.parseInt(draftQuantity, 10);
    const nextQuantity = Number.isNaN(parsedValue) ? quantity : parsedValue;
    setIsEditing(false);
    setDraftQuantity(String(nextQuantity));
    onCommitQuantity(nextQuantity);
  }

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(200)}
      style={styles.cartEditor}>
      <View style={styles.cartEditorHeader}>
        <Text style={styles.cartEditorLabel}>Quantity</Text>
        <View style={styles.bulkRow}>
          {bulkOptions.map((amount) => (
            <ScaleButton
              key={amount}
              onPress={() => onBulkAdd(amount)}
              style={styles.bulkChip}>
              <Text style={styles.bulkChipText}>+{amount}</Text>
            </ScaleButton>
          ))}
        </View>
      </View>

      <View style={styles.cartEditorControls}>
        <ScaleButton onPress={onDecrease} style={styles.editorIconButton}>
          <Ionicons
            color={materialTheme.colors.primary}
            name="remove"
            size={16}
          />
        </ScaleButton>
        <TextInput
          keyboardType="number-pad"
          onBlur={commitQuantity}
          onChangeText={(value) => {
            setIsEditing(true);
            setDraftQuantity(value);
          }}
          onFocus={() => {
            setIsEditing(true);
            setDraftQuantity(String(quantity));
          }}
          onSubmitEditing={commitQuantity}
          selectTextOnFocus
          style={styles.cartEditorInput}
          value={isEditing ? draftQuantity : String(quantity)}
        />
        <ScaleButton onPress={onIncrease} style={styles.editorIconButton}>
          <Ionicons
            color={materialTheme.colors.primary}
            name="add"
            size={16}
          />
        </ScaleButton>
      </View>
    </Animated.View>
  );
}

export function StickyCheckoutBar({
  itemCount,
  note,
  onCheckout,
  onSecondaryAction,
  secondaryActionLabel,
  total,
}: StickyCheckoutBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(160)}
      style={[
        styles.checkoutBar,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}>
      <View style={styles.checkoutSummary}>
        <Text style={styles.checkoutSummaryLabel}>
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </Text>
        <Text style={styles.checkoutSummaryValue}>{formatCurrency(total)}</Text>
        <Text style={styles.checkoutSummaryNote}>{note}</Text>
      </View>

      <View style={styles.checkoutActions}>
        {secondaryActionLabel && onSecondaryAction ? (
          <Button
            label={secondaryActionLabel}
            onPress={onSecondaryAction}
            icon={<Ionicons color={materialTheme.colors.success} name="logo-whatsapp" size={18} />}
            variant="outline"
            style={{ borderColor: materialTheme.colors.success }}
            labelStyle={{ color: materialTheme.colors.success }}
          />
        ) : null}

        <Button
          label="Proceed to checkout"
          onPress={onCheckout}
          icon={<Ionicons color={materialTheme.colors.white} name="arrow-forward" size={18} />}
        />
      </View>
    </Animated.View>
  );
}

function ScaleButton({
  children,
  style,
  ...touchableProps
}: ScaleButtonProps) {
  return (
    <TouchableOpacity
      {...touchableProps}
      activeOpacity={0.92}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  quickOrderWrap: {
    gap: 10,
  },
  quickOrderPrimaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickOrderPrimaryRowList: {
    alignItems: 'flex-start',
  },
  quantityBadge: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surfaceMuted,
    borderRadius: materialTheme.radius.md,
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  quantityBadgeLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  quantityBadgeValue: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    marginTop: 2,
  },
  bulkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkChip: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    justifyContent: 'center',
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bulkChipList: {
    minWidth: 54,
  },
  bulkChipText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.primary,
  },
  cartEditor: {
    gap: 10,
    marginTop: 14,
  },
  cartEditorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartEditorLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  cartEditorControls: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  editorIconButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  cartEditorInput: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    minWidth: 42,
    paddingVertical: 6,
    textAlign: 'center',
  },
  checkoutBar: {
    backgroundColor: materialTheme.colors.surface,
    borderTopColor: materialTheme.colors.border,
    borderTopWidth: 1,
    gap: 14,
    paddingHorizontal: materialTheme.screenPadding,
    paddingTop: 14,
  },
  checkoutSummary: {
    gap: 2,
  },
  checkoutSummaryLabel: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  checkoutSummaryValue: {
    ...materialTheme.typography.h2,
    color: materialTheme.colors.primary,
  },
  checkoutSummaryNote: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.textMuted,
  },
  checkoutActions: {
    gap: 10,
  },
});
