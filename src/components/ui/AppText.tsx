import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { typography } from '../../theme/tokens';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'button';

interface Props {
  variant?: Variant;
  children: React.ReactNode;
  style?: TextStyle;
  color?: string;
}

export default function AppText({ variant = 'body', children, style, color }: Props) {
  return (
    <Text style={[typography[variant] as TextStyle, color ? { color } : undefined, style]}>
      {children}
    </Text>
  );
}
