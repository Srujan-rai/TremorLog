import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';

interface Props {
  samples: number[]; // normalized 0–1 amplitude values
  width?: number;
  height?: number;
}

const MAX_POINTS = 150;

export default function WaveformDisplay({ samples, width = 320, height = 80 }: Props) {
  const visible = samples.slice(-MAX_POINTS);
  if (visible.length < 2) return <View style={[styles.container, { width, height }]} />;

  const midY = height / 2;

  const points = visible.map((val, i) => {
    const x = (i / (MAX_POINTS - 1)) * width;
    // center around midY, amplitude drives deflection
    const y = midY - val * midY * 0.9;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // color: green → yellow → red based on last value
  const last = visible[visible.length - 1];
  const color = last > 0.6 ? '#e74c3c' : last > 0.3 ? '#f39c12' : '#27ae60';

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={midY} x2={width} y2={midY} stroke="#eee" strokeWidth={1} />
        <Polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
