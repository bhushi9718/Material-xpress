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
        <TouchableOpacity onPress={onPressAction}>
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
          backgroundColor: `${accent}1A`,
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
    marginBottom: 14,
  },
  sectionTitle: {
    ...materialTheme.typography.h3,
    color: materialTheme.colors.text,
  },
  sectionAction: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.terracotta,
  },
  iconBadge: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: materialTheme.colors.border,
    justifyContent: 'center',
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: materialTheme.colors.primarySoft,
    borderRadius: materialTheme.radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
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
