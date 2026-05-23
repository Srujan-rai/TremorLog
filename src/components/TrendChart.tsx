import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle, Polygon, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '../theme/tokens';

interface Props {
  scores: number[];
  width?: number;
  height?: number;
}

export default function TrendChart({ scores, width = 320, height = 160 }: Props) {
  if (scores.length < 2) return null;

  const pad = { top: 20, bottom: 32, left: 36, right: 16 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const points = scores.map((score, i) => {
    const x = pad.left + (i / (scores.length - 1)) * chartW;
    const y = pad.top + (1 - score / 100) * chartH;
    return { x, y, score };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `${points[0].x},${pad.top + chartH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${pad.top + chartH}`,
  ].join(' ');

  const last = points[points.length - 1];
  const gridValues = [0, 50, 100];

  return (
    <View>
      <Svg width={width} height={height}>
        {gridValues.map((val) => {
          const y = pad.top + (1 - val / 100) * chartH;
          return (
            <Line
              key={val}
              x1={pad.left}
              y1={y}
              x2={pad.left + chartW}
              y2={y}
              stroke={colors.borderLight}
              strokeWidth={1}
              strokeDasharray={val === 0 || val === 100 ? undefined : '4,4'}
            />
          );
        })}

        <Line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + chartH}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Line
          x1={pad.left}
          y1={pad.top + chartH}
          x2={pad.left + chartW}
          y2={pad.top + chartH}
          stroke={colors.border}
          strokeWidth={1}
        />

        {gridValues.map((val) => {
          const y = pad.top + (1 - val / 100) * chartH;
          return (
            <SvgText key={`label-${val}`} x={pad.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill={colors.textHint}>
              {val}
            </SvgText>
          );
        })}

        <Polygon points={areaPoints} fill={colors.primary + '1F'} />

        <Polyline
          points={linePoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <Circle cx={last.x} cy={last.y} r={5} fill={colors.primary} />
        <SvgText
          x={last.x}
          y={last.y - 10}
          textAnchor="middle"
          fontSize={11}
          fontWeight="600"
          fill={colors.primaryDark}
        >
          {last.score}
        </SvgText>
      </Svg>
      <Text style={styles.caption}>{scores.length} sessions shown</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 14,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
