// Small SVG charts: score ring, risk gauge and a trend line.

import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { C, T } from './ui';
import { Level } from '@/lib/score';

export const LEVEL_COLORS: Record<Level, [string, string]> = {
  Low: [C.good, C.goodSoft],
  Moderate: [C.warn, C.warnSoft],
  High: [C.flare, C.flareSoft],
};

export function skinColor(v: number) {
  return v >= 7 ? C.flare : v >= 4 ? C.warn : C.good;
}

/** Circular progress ring with the value in the middle. */
export function Ring({
  value,
  max = 10,
  size = 120,
  stroke = 12,
  color,
  label,
  caption,
}: {
  value: number | null;
  max?: number;
  size?: number;
  stroke?: number;
  color: string;
  label: string;
  caption?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = value == null ? 0 : Math.min(1, Math.max(0, value / max));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.bg} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * frac} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <T size={size * 0.26} weight="bold" color={value == null ? C.faint : C.text} style={{ lineHeight: size * 0.32 }}>
        {label}
      </T>
      {caption ? (
        <T size={11} color={C.muted}>
          {caption}
        </T>
      ) : null}
    </View>
  );
}

/** Half-circle gauge for the 0-10 flare risk score. */
export function Gauge({ score, level, width = 180 }: { score: number | null; level: Level | null; width?: number }) {
  const stroke = 14;
  const r = (width - stroke) / 2;
  const cx = width / 2;
  const cy = r + stroke / 2;
  const arc = (from: number, to: number) => {
    // angles in [0,1] from left (0) to right (1) across the top
    const a0 = Math.PI * (1 - from);
    const a1 = Math.PI * (1 - to);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const frac = score == null ? 0 : Math.min(1, Math.max(0.001, score / 10));
  const color = level ? LEVEL_COLORS[level][0] : C.faint;
  const height = cy + 6;
  return (
    <View style={{ width, height, alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Path d={arc(0, 1)} stroke={C.bg} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {score != null ? <Path d={arc(0, frac)} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" /> : null}
      </Svg>
      <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }}>
        <T size={30} weight="bold" color={score == null ? C.faint : C.text} style={{ lineHeight: 34 }}>
          {score == null ? '–' : score.toFixed(1)}
        </T>
        <T size={12} weight="semibold" color={color}>
          {level ? `${level} risk` : 'No food yet'}
        </T>
      </View>
    </View>
  );
}

export type TrendPoint = { date: string; value: number | null; flare: boolean };

/** Line chart of skin rating over days, with flare days marked red. */
export function TrendLine({ points, width, height = 120 }: { points: TrendPoint[]; width: number; height?: number }) {
  const pad = 8;
  const n = points.length;
  const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, n - 1);
  const y = (v: number) => pad + (1 - v / 10) * (height - pad * 2);

  // Build path segments, breaking at gaps.
  const segments: string[] = [];
  let current = '';
  points.forEach((p, i) => {
    if (p.value == null) {
      if (current) segments.push(current);
      current = '';
      return;
    }
    current += `${current ? ' L' : 'M'} ${x(i)} ${y(p.value)}`;
  });
  if (current) segments.push(current);

  const valued = points.map((p, i) => ({ ...p, i })).filter((p) => p.value != null);
  const area =
    valued.length > 1
      ? `M ${x(valued[0].i)} ${height - pad} ` +
        valued.map((p) => `L ${x(p.i)} ${y(p.value as number)}`).join(' ') +
        ` L ${x(valued[valued.length - 1].i)} ${height - pad} Z`
      : '';

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.primary} stopOpacity={0.22} />
          <Stop offset="1" stopColor={C.primary} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[0, 5, 10].map((v) => (
        <Line key={v} x1={pad} x2={width - pad} y1={y(v)} y2={y(v)} stroke={C.border} strokeWidth={1} strokeDasharray="3 5" />
      ))}
      {area ? <Path d={area} fill="url(#trendFill)" /> : null}
      {segments.map((d, i) => (
        <Path key={i} d={d} stroke={C.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {valued.map((p) =>
        p.flare ? (
          <Circle key={p.date} cx={x(p.i)} cy={y(p.value as number)} r={5} fill={C.flare} stroke="#fff" strokeWidth={2} />
        ) : n <= 14 ? (
          <Circle key={p.date} cx={x(p.i)} cy={y(p.value as number)} r={3.5} fill={C.primary} stroke="#fff" strokeWidth={1.5} />
        ) : null,
      )}
    </Svg>
  );
}
