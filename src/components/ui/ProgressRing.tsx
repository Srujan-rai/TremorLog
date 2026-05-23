import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/tokens';

interface Props {
  progress: number; // 0–1
  label: string;
  sublabel?: string;
  size?: number;
  stroke?: number;
  color?: string;
  labelColor?: string;
  labelSize?: number;
}

export default function ProgressRing({
  progress,
  label,
  sublabel,
  size = 160,
  stroke = 10,
  color,
  labelColor,
  labelSize,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clamped);
  const ringColor = color ?? colors.primary;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.borderLight}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text
          style={[
            styles.label,
            labelColor ? { color: labelColor } : undefined,
            labelSize ? { fontSize: labelSize } : undefined,
          ]}
        >
          {label}
        </Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sublabel: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 4,
  },
});
