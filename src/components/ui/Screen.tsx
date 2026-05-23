import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, Platform, StatusBar } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  centered?: boolean;
  contentStyle?: ViewStyle;
}

const STATUS_PAD = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0;

export default function Screen({ children, scroll, centered, contentStyle }: Props) {
  if (scroll) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: STATUS_PAD + spacing.lg },
          centered && styles.centered,
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.content,
          { paddingTop: STATUS_PAD + spacing.lg },
          centered && styles.centered,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  centered: {
    justifyContent: 'center',
  },
});
