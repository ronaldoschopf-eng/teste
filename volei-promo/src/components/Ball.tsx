// Bola de vôlei vetorial (gomos curvos) com sombreamento e rastro opcional.
import React from 'react';
import { COLORS } from '../config';

type Props = {
  x: number;
  y: number;
  r?: number;
  rotation?: number;
  /** Rastro: ponto de onde a bola veio (px). */
  trailFrom?: { x: number; y: number } | null;
  trailOpacity?: number;
  glow?: number;
};

export const Ball: React.FC<Props> = ({ x, y, r = 36, rotation = 0, trailFrom = null, trailOpacity = 0.8, glow = 0.6 }) => {
  const trail = trailFrom ? (
    (() => {
      const dx = x - trailFrom.x;
      const dy = y - trailFrom.y;
      const len = Math.hypot(dx, dy);
      if (len < 4) return null;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      return (
        <div
          style={{
            position: 'absolute',
            left: trailFrom.x,
            top: trailFrom.y - r,
            width: len,
            height: r * 2,
            transformOrigin: `0 ${r}px`,
            transform: `rotate(${ang}deg)`,
            background: `linear-gradient(90deg, rgba(246,247,242,0) 0%, rgba(246,247,242,${0.35 * trailOpacity}) 70%, rgba(246,247,242,${0.7 * trailOpacity}) 100%)`,
            clipPath: `polygon(0 50%, 100% 0, 100% 100%)`,
          }}
        />
      );
    })()
  ) : null;

  return (
    <>
      {trail}
      <svg
        width={r * 2}
        height={r * 2}
        viewBox="-50 -50 100 100"
        style={{
          position: 'absolute',
          left: x - r,
          top: y - r,
          overflow: 'visible',
          filter: glow > 0 ? `drop-shadow(0 0 ${18 * glow}px rgba(255,255,255,${0.7 * glow}))` : undefined,
        }}
      >
        <defs>
          <radialGradient id="ball-shade" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#E9EBE4" />
            <stop offset="100%" stopColor="#9AA0A6" />
          </radialGradient>
        </defs>
        <circle r={48} fill="url(#ball-shade)" />
        <g transform={`rotate(${rotation})`} fill="none" stroke={COLORS.steel} strokeWidth={3.2} strokeLinecap="round" opacity={0.85}>
          <path d="M -46 -10 C -20 -6, 10 -24, 22 -44" />
          <path d="M -40 22 C -8 14, 26 -6, 44 -22" />
          <path d="M -22 42 C 4 26, 30 18, 47 10" />
          <path d="M 0 -48 C -10 -20, -6 14, 12 46" />
        </g>
        <circle r={48} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={2} />
      </svg>
    </>
  );
};
