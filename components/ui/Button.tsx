import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { materialTheme } from '@/constants/material-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  labelStyle,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';

  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isPrimary) return isDisabled ? materialTheme.colors.primarySoft : materialTheme.colors.primary;
    if (isSecondary) return isDisabled ? materialTheme.colors.surfaceMuted : materialTheme.colors.accentSoft;
    if (isOutline) return 'transparent';
    return 'transparent'; // ghost
  };

  const getBorderColor = () => {
    if (isOutline) return isDisabled ? materialTheme.colors.border : materialTheme.colors.textMuted;
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDisabled && isPrimary) return materialTheme.colors.textMuted;
    if (isDisabled) return materialTheme.colors.textMuted;
    if (isPrimary) return materialTheme.colors.white;
    if (isSecondary || isOutline || isGhost) return materialTheme.colors.primary;
    return materialTheme.colors.text;
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 36;
      case 'lg':
        return 56;
      case 'md':
      default:
        return 48;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: isOutline ? 1 : 0,
          height: getHeight(),
          paddingHorizontal: size === 'sm' ? materialTheme.spacing.md : materialTheme.spacing.lg,
        },
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              materialTheme.typography.button,
              { color: getTextColor() },
              icon && iconPosition === 'left' ? { marginLeft: materialTheme.spacing.sm } : undefined,
              icon && iconPosition === 'right' ? { marginRight: materialTheme.spacing.sm } : undefined,
              labelStyle,
            ]}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: materialTheme.radius.sm,
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
