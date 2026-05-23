import React, { useState } from 'react';
import { TextInput as RNTextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';

export default function TextInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <RNTextInput
      {...props}
      style={[styles.input, focused && styles.focused, props.style]}
      placeholderTextColor={colors.textDisabled}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: (typography.body.fontSize as number) ?? 18,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
  },
  focused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
});
