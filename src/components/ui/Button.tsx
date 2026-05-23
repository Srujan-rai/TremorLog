import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        variant === 'primary' && styles.primarySize,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.surface} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              variant === 'primary' && styles.primaryText,
              variant === 'secondary' && styles.secondaryText,
              variant === 'ghost' && styles.ghostText,
              variant === 'destructive' && styles.destructiveText,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  primarySize: {
    minHeight: 72,
    borderRadius: radii.lg,
    ...shadows.button,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryMuted,
    minHeight: 64,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  destructive: {
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  disabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
  },
  primaryText: {
    color: colors.surface,
    fontSize: 22,
  },
  secondaryText: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  ghostText: {
    color: colors.textHint,
    fontWeight: '600',
  },
  destructiveText: {
    color: colors.danger,
    fontWeight: '600',
  },
});
