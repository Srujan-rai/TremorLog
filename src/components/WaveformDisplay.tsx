import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import { colors, radii } from '../theme/tokens';
import { movementColor } from '../theme/scoreColors';

interface Props {
  samples: number[];
  width?: number;
  height?: number;
}

const MAX_POINTS = 150;

export default function WaveformDisplay({ samples, width = 320, height = 80 }: Props) {
  const visible = samples.slice(-MAX_POINTS);
  if (visible.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

  const midY = height / 2;
  const padX = 8;

  const points = visible.map((val, i) => {
    const x = padX + (i / (MAX_POINTS - 1)) * (width - padX * 2);
    const y = midY - val * midY * 0.85;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = visible[visible.length - 1];
  const strokeColor = movementColor(last);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Line
          x1={padX}
          y1={midY}
          x2={width - padX}
          y2={midY}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <Polyline
          points={points.join(' ')}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
});
