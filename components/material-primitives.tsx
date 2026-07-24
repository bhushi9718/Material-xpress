import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { materialTheme } from '@/constants/material-theme';

type SectionHeadingProps = {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
};

type ProductIconBadgeProps = {
  accent: string;
  icon: string;
  size?: number;
};

type QuantityStepperProps = {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

export function SectionHeading({
  title,
  actionLabel,
  onPressAction,
}: SectionHeadingProps) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onPressAction ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onPressAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ProductIconBadge({
  accent,
  icon,
  size = 54,
}: ProductIconBadgeProps) {
  return (
    <View
      style={[
        styles.iconBadge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${accent}20`,
        },
      ]}>
      <Ionicons
        color={accent}
        name={icon as ComponentProps<typeof Ionicons>['name']}
        size={size * 0.48}
      />
    </View>
  );
}

export function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}: QuantityStepperProps) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onDecrease} style={styles.stepperButton}>
        <Ionicons name="remove" size={16} color={materialTheme.colors.primary} />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{quantity}</Text>
      <TouchableOpacity onPress={onIncrease} style={styles.stepperButton}>
        <Ionicons name="add" size={16} color={materialTheme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: materialTheme.spacing.md,
  },
  sectionTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  sectionAction: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
  },
  iconBadge: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderWidth: 0, // removed border for cleaner look in dark mode
    justifyContent: 'center',
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: materialTheme.spacing.sm,
    paddingHorizontal: materialTheme.spacing.xs,
    paddingVertical: materialTheme.spacing.xs,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepperValue: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.primary,
    minWidth: 16,
    textAlign: 'center',
  },
});
