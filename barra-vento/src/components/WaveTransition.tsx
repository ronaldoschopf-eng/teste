import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, VIDEO} from '../config';

const W = VIDEO.width;
const H = VIDEO.height;

// Caminho com a borda superior ondulada; `edge` é a altura média da borda.
const wavePath = (edge: number, phase: number, amp: number) => {
  const pts: string[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * W;
    const y = edge + Math.sin((i / n) * Math.PI * 2.2 + phase) * amp + Math.sin((i / n) * Math.PI * 5 + phase * 1.7) * amp * 0.25;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${pts.join(' ')} L ${W} ${H + 400} L 0 ${H + 400} Z`;
};

type Props = {from: number; to: number; children: React.ReactNode};

// Transição em onda: faixas amarela e verde-limão sobem na frente e a cena
// nova (children) é revelada por baixo, recortada pela mesma onda.
export const WaveTransition: React.FC<Props> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  if (frame < from) return null;
  const travel = H + 520;
  const edge = H + 140 - p * travel;
  const phase = frame / 7;
  const amp = interpolate(p, [0, 0.5, 1], [60, 110, 40]);

  return (
    <AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <path d={wavePath(edge - 120, phase + 0.6, amp)} fill={COLORS.yellow} />
        <path d={wavePath(edge - 60, phase + 0.3, amp)} fill={COLORS.lime} />
      </svg>
      <AbsoluteFill style={{clipPath: `path('${wavePath(edge, phase, amp)}')`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
