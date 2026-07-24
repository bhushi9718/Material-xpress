import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { materialTheme } from '@/constants/material-theme';

export interface CardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress, ...props }: CardProps) {
  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, style]}
      {...props}>
      {children}
    </CardComponent>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: materialTheme.colors.surface,
    borderRadius: materialTheme.radius.md, // 18px
    padding: materialTheme.spacing.lg, // 16px
    ...materialTheme.shadow,
  },
});
