// Partículas de poeira suspensas na luz da arena. Movimento lento, com leve
// oscilação lateral; tudo derivado de random(seed), sem estado.
import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { COLORS } from '../config';

type Props = {
  count: number;
  seed?: string;
  /** Multiplicador da velocidade (0 = congelado). */
  speed?: number;
  /** Quadro a partir do qual as partículas param (congelamento). */
  freezeAt?: number;
  opacity?: number;
  area?: { x: number; y: number; width: number; height: number };
  accentRatio?: number;
};

export const Particles: React.FC<Props> = ({
  count,
  seed = 'dust',
  speed = 1,
  freezeAt,
  opacity = 0.7,
  area = { x: 0, y: 0, width: 1080, height: 1920 },
  accentRatio = 0.1,
}) => {
  const raw = useCurrentFrame();
  const frame = freezeAt !== undefined ? Math.min(raw, freezeAt) : raw;
  return (
    <div style={{ position: 'absolute', left: area.x, top: area.y, width: area.width, height: area.height, overflow: 'hidden', pointerEvents: 'none' }}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-${k}-${i}`);
        const size = 2 + r('s') * 6;
        const depth = 0.3 + r('d') * 0.9;
        const vy = -(0.4 + r('v') * 1.4) * depth * speed;
        const y = ((((r('y') * area.height + vy * frame) % area.height) + area.height) % area.height);
        const x = r('x') * area.width + Math.sin(frame / (18 + r('p') * 30) + r('ph') * 6.28) * 14 * depth;
        const twinkle = 0.55 + 0.45 * Math.sin(frame / (6 + r('t') * 10) + r('tp') * 6.28);
        const accent = r('a') < accentRatio;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size * depth,
              height: size * depth,
              borderRadius: '50%',
              background: accent ? COLORS.accent : COLORS.white,
              opacity: opacity * twinkle * (0.3 + depth * 0.6),
              boxShadow: `0 0 ${8 * depth}px ${accent ? COLORS.accent : 'rgba(255,255,255,0.8)'}`,
            }}
          />
        );
      })}
    </div>
  );
};
