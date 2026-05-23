import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

/** Plain wrapper — Reanimated entering animations can leave content invisible if worklets misconfigure. */
export default function ScreenFade({ children }: Props) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
