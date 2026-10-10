import React from 'react';
import {Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {COLORS} from '../config';

type Props = {
  x: number;
  y: number;
  start: number;
  seed: string;
  angle?: number; // direção principal (graus; -45 = para cima e à direita)
  size?: number;
  color?: string;
};

// "Faíscas": traços curvos e bolinhas que aparecem, se espalham e somem.
export const Sparks: React.FC<Props> = ({x, y, start, seed, angle = -45, size = 1, color = COLORS.yellow}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > 40) return null;
  const grow = interpolate(t, [0, 16], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const fade = interpolate(t, [22, 40], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const base = ((angle + (random(seed) - 0.5) * 30) * Math.PI) / 180;

  return (
    <svg
      width={300}
      height={300}
      viewBox="-150 -150 300 300"
      style={{position: 'absolute', left: x - 150 * size, top: y - 150 * size, width: 300 * size, height: 300 * size, overflow: 'visible', opacity: fade}}
    >
      {[0, 1, 2].map((i) => {
        const a = base + (i - 1) * 0.75;
        const r0 = 40 + 40 * grow;
        const r1 = r0 + 46;
        const bend = 18 * (i % 2 === 0 ? 1 : -1);
        const p0 = [Math.cos(a) * r0, Math.sin(a) * r0];
        const p1 = [Math.cos(a) * r1, Math.sin(a) * r1];
        const c = [(p0[0] + p1[0]) / 2 - Math.sin(a) * bend, (p0[1] + p1[1]) / 2 + Math.cos(a) * bend];
        return (
          <path
            key={i}
            d={`M ${p0[0]} ${p0[1]} Q ${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`}
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            fill="none"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - grow}
          />
        );
      })}
      {[0, 1, 2].map((i) => {
        const a = base + (i - 1) * 1.1 + 0.4 + random(`${seed}-d${i}`) * 0.3;
        const r = 70 + 90 * grow + i * 16;
        return <circle key={`d${i}`} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={(7 + i * 2) * grow} fill={color} />;
      })}
    </svg>
  );
};
