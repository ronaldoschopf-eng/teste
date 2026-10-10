import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS} from '../config';

type Props = {
  enter: number; // início da entrada
  click: number; // frame do clique
  from: {x: number; y: number};
  to: {x: number; y: number}; // ponta do cursor no momento do clique
};

// Mão/cursor que entra numa curva, "clica" (aperta) e solta um ripple rosa.
export const Cursor: React.FC<Props> = ({enter, click, from, to}) => {
  const frame = useCurrentFrame();
  if (frame < enter) return null;
  const travel = interpolate(frame, [enter, click - 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
  // Curva quadrática para um movimento mais natural.
  const cx = (from.x + to.x) / 2 + 220;
  const cy = (from.y + to.y) / 2 + 120;
  const x = (1 - travel) ** 2 * from.x + 2 * (1 - travel) * travel * cx + travel ** 2 * to.x;
  const y = (1 - travel) ** 2 * from.y + 2 * (1 - travel) * travel * cy + travel ** 2 * to.y;
  const press = interpolate(frame, [click - 4, click, click + 8], [1, 0.82, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [enter, enter + 8], [0, 1], {extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [click + 30, click + 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});

  return (
    <div
      style={{
        position: 'absolute',
        left: x + exit * 160,
        top: y + exit * 260,
        opacity: opacity * (1 - exit),
        transform: `scale(${press}) rotate(${(1 - travel) * -14}deg)`,
        transformOrigin: '0 0',
        filter: 'drop-shadow(0 14px 18px rgba(0, 0, 0, 0.3))',
      }}
    >
      {/* mão apontando (desenho próprio) — a ponta do dedo fica em (0, 0) */}
      <svg width={150} height={190} viewBox="-30 -6 150 190" style={{position: 'absolute', left: -30, top: -6}}>
        <path
          d="M8 0 C 18 0 24 8 24 18 L 24 70 C 28 62 42 60 48 70 C 52 62 66 62 70 74 C 76 66 90 68 92 80 L 92 122 C 92 150 74 170 46 170 L 34 170 C 16 170 4 158 -6 140 L -26 100 C -32 88 -18 78 -8 88 L -8 88 L -8 18 C -8 8 -2 0 8 0 Z"
          fill="#FFFFFF"
          stroke={COLORS.ink}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        <path d="M24 70 L24 104 M48 70 L48 104 M70 74 L70 106" stroke={COLORS.ink} strokeWidth={6} strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const Ripple: React.FC<{x: number; y: number; start: number}> = ({x, y, start}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > 50) return null;
  return (
    <>
      {[0, 10].map((d) => {
        const p = interpolate(t - d, [0, 36], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        if (t - d < 0) return null;
        const r = 40 + p * 300;
        return (
          <div
            key={d}
            style={{
              position: 'absolute',
              left: x - r,
              top: y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `${10 * (1 - p) + 2}px solid ${COLORS.pink}`,
              background: d === 0 ? `rgba(255, 31, 122, ${0.18 * (1 - p)})` : undefined,
              opacity: 1 - p,
            }}
          />
        );
      })}
    </>
  );
};
