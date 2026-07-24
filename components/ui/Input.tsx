import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { materialTheme } from '@/constants/material-theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getBorderColor = () => {
    if (error) return materialTheme.colors.danger;
    if (isFocused) return materialTheme.colors.primary;
    return materialTheme.colors.border;
  };

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: materialTheme.colors.surfaceMuted, // slightly off-background
          },
        ]}>
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        
        <TextInput
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholderTextColor={materialTheme.colors.textMuted}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : {},
            rightIcon ? { paddingRight: 0 } : {},
            style,
          ]}
          {...props}
        />

        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...materialTheme.typography.label,
    color: materialTheme.colors.textSecondary,
    marginBottom: materialTheme.spacing.sm,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: materialTheme.radius.sm, // 14px
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    overflow: 'hidden',
  },
  input: {
    ...materialTheme.typography.body,
    color: materialTheme.colors.text,
    flex: 1,
    height: '100%',
    paddingHorizontal: materialTheme.spacing.lg,
  },
  leftIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: materialTheme.spacing.md,
    paddingRight: materialTheme.spacing.sm,
  },
  rightIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: materialTheme.spacing.sm,
    paddingRight: materialTheme.spacing.md,
  },
  errorText: {
    ...materialTheme.typography.caption,
    color: materialTheme.colors.danger,
    marginTop: materialTheme.spacing.xs,
  },
});
