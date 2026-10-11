// Flash fotográfico: um estouro branco de poucos quadros, com um núcleo
// mais quente no ponto de origem. Usado nas transições e nos disparos.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { flashCurve } from '../anim/motion';
import { COLORS } from '../config';

type Props = {
  /** Quadro (relativo à Sequence atual) do pico do flash. */
  at: number;
  attack?: number;
  decay?: number;
  /** 0–1 */
  intensity?: number;
  /** Origem do brilho, em % da tela. */
  origin?: { x: number; y: number };
  color?: string;
};

export const PhotoFlash: React.FC<Props> = ({
  at,
  attack = 1,
  decay = 7,
  intensity = 1,
  origin = { x: 50, y: 42 },
  color = COLORS.white,
}) => {
  const frame = useCurrentFrame();
  const v = flashCurve(frame, at, attack, decay) * intensity;
  if (v <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(circle at ${origin.x}% ${origin.y}%, ${color} 0%, ${color} 35%, rgba(246,247,242,0.85) 70%, rgba(246,247,242,0.7) 100%)`,
        opacity: v,
        mixBlendMode: 'screen',
      }}
    />
  );
};

/**
 * Estouro pontual (flash de câmera na arquibancada): núcleo, halo e
 * quatro raios finos em cruz.
 */
export const FlashBurst: React.FC<{ x: number; y: number; at: number; size?: number; decay?: number }> = ({
  x,
  y,
  at,
  size = 220,
  decay = 6,
}) => {
  const frame = useCurrentFrame();
  const v = flashCurve(frame, at, 0, decay);
  if (v <= 0.001) return null;
  const s = size * (0.7 + v * 0.5);
  return (
    <div style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, opacity: v, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.55) 14%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0) 70%)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 3, marginTop: -1.5, background: 'linear-gradient(90deg, transparent, #fff, transparent)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 3, marginLeft: -1.5, background: 'linear-gradient(180deg, transparent, #fff, transparent)' }} />
    </div>
  );
};
