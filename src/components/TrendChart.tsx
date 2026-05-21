import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';

interface Props {
  scores: number[];
  width?: number;
  height?: number;
}

export default function TrendChart({ scores, width = 320, height = 160 }: Props) {
  if (scores.length < 2) return null;

  const pad = { top: 16, bottom: 28, left: 32, right: 16 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const points = scores.map((score, i) => {
    const x = pad.left + (i / (scores.length - 1)) * chartW;
    const y = pad.top + (1 - score / 100) * chartH;
    return `${x},${y}`;
  });

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y axis */}
        <Line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + chartH} stroke="#ccc" strokeWidth={1} />
        {/* X axis */}
        <Line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH} stroke="#ccc" strokeWidth={1} />
        {/* Y labels */}
        {[0, 50, 100].map((val) => {
          const y = pad.top + (1 - val / 100) * chartH;
          return (
            <SvgText key={val} x={pad.left - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#999">
              {val}
            </SvgText>
          );
        })}
        {/* Line */}
        <Polyline
          points={points.join(' ')}
          fill="none"
          stroke="#2e86c1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
