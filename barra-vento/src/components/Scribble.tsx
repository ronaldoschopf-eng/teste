import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, TIMING} from '../config';

// Rabisco feito à mão (laço) desenhado com stroke-dashoffset.
export const Scribble: React.FC<{width: number; height: number; start: number; color?: string}> = ({
  width,
  height,
  start,
  color = COLORS.yellow,
}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [start, start + TIMING.scribbleDraw], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const w = width + 120;
  const h = height + 90;
  // Laço irregular que dá ~1,2 voltas ao redor do box.
  const d = `M ${w * 0.08} ${h * 0.62}
    C ${w * 0.02} ${h * 0.2}, ${w * 0.45} ${h * 0.02}, ${w * 0.78} ${h * 0.08}
    C ${w * 1.02} ${h * 0.13}, ${w * 1.0} ${h * 0.78}, ${w * 0.7} ${h * 0.92}
    C ${w * 0.42} ${h * 1.03}, ${w * 0.0} ${h * 0.92}, ${w * 0.05} ${h * 0.5}
    C ${w * 0.08} ${h * 0.22}, ${w * 0.5} ${h * 0.0}, ${w * 0.9} ${h * 0.2}`;
  return (
    <svg
      width={w}
      height={h}
      style={{position: 'absolute', left: -60, top: -45, overflow: 'visible'}}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={draw}
      />
    </svg>
  );
};
