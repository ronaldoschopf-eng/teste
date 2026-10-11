// Linhas de velocidade: traços afinados que atravessam a tela na direção do
// movimento. A velocidade pode ser zerada (congelamento) via `speed`.
import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { COLORS } from '../config';

type Props = {
  count: number;
  /** Ângulo do movimento em graus (90 = de cima para baixo). */
  angle?: number;
  /** px por quadro. Pode ser uma função do quadro para acelerar/frear. */
  speed?: number | ((frame: number) => number);
  /** Área ocupada (px). */
  area?: { x: number; y: number; width: number; height: number };
  color?: string;
  opacity?: number;
  minLength?: number;
  maxLength?: number;
  thickness?: number;
  seed?: string;
  /** Fração das linhas que usam a cor de destaque. */
  accentRatio?: number;
};

export const SpeedLines: React.FC<Props> = ({
  count,
  angle = 90,
  speed = 40,
  area = { x: 0, y: 0, width: 1080, height: 1920 },
  color = COLORS.white,
  opacity = 0.5,
  minLength = 120,
  maxLength = 520,
  thickness = 3,
  seed = 'speed',
  accentRatio = 0.12,
}) => {
  const frame = useCurrentFrame();
  // Distância percorrida = soma das velocidades (permite frear sem "pular").
  let travel = 0;
  if (typeof speed === 'number') travel = speed * frame;
  else for (let f = 0; f < frame; f++) travel += speed(f);

  const span = Math.hypot(area.width, area.height) + maxLength;
  return (
    <div style={{ position: 'absolute', left: area.x, top: area.y, width: area.width, height: area.height, overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: span,
          height: span,
          marginLeft: -span / 2,
          marginTop: -span / 2,
          transform: `rotate(${angle - 90}deg)`,
        }}
      >
        {new Array(count).fill(0).map((_, i) => {
          const len = minLength + random(`${seed}-l${i}`) * (maxLength - minLength);
          const x = random(`${seed}-x${i}`) * span;
          const rate = 0.6 + random(`${seed}-r${i}`) * 0.9;
          const y = (((random(`${seed}-y${i}`) * span + travel * rate) % (span + len)) + span + len) % (span + len) - len;
          const accent = random(`${seed}-a${i}`) < accentRatio;
          const w = thickness * (0.5 + random(`${seed}-w${i}`));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                height: len,
                borderRadius: w,
                background: `linear-gradient(180deg, transparent, ${accent ? COLORS.accent : color})`,
                opacity: opacity * (0.35 + random(`${seed}-o${i}`) * 0.65),
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
