import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {BACKGROUND, COLORS, VIDEO} from '../config';
import {Grain} from './Grain';

type Variant = 'light' | 'dark';

type Blob = {color: string; size: number; x: number; y: number; opacity: number};

const BLOBS: Record<Variant, Blob[]> = {
  light: [
    {color: COLORS.lime, size: 720, x: 0.1, y: 0.16, opacity: 0.62},
    {color: COLORS.yellow, size: 640, x: 0.95, y: 0.4, opacity: 0.5},
    {color: COLORS.lime, size: 760, x: 0.82, y: 0.88, opacity: 0.5},
    {color: COLORS.yellow, size: 560, x: 0.06, y: 0.7, opacity: 0.42},
  ],
  dark: [
    {color: '#1F7A3A', size: 900, x: 0.1, y: 0.2, opacity: 0.9},
    {color: COLORS.lime, size: 560, x: 0.9, y: 0.42, opacity: 0.35},
    {color: '#25A04A', size: 820, x: 0.75, y: 0.9, opacity: 0.75},
    {color: '#1F7A3A', size: 640, x: 0.2, y: 0.72, opacity: 0.7},
  ],
};

// Os blobs são desenhados num canvas 4x menor e ampliados: o blur de 160px
// vira 40px, muito mais barato de renderizar e visualmente idêntico.
const DOWNSCALE = 4;

export const BlobBackground: React.FC<{variant: Variant; seed?: string; intensity?: number}> = ({
  variant,
  seed = 'bg',
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const base =
    variant === 'light'
      ? COLORS.white
      : `linear-gradient(170deg, ${COLORS.darkGreen} 0%, #072A14 55%, #04190C 100%)`;

  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          width: VIDEO.width / DOWNSCALE,
          height: VIDEO.height / DOWNSCALE,
          transform: `scale(${DOWNSCALE})`,
          transformOrigin: '0 0',
          filter: `blur(${BACKGROUND.blur / DOWNSCALE}px)`,
        }}
      >
        {BLOBS[variant].map((b, i) => {
          const r1 = random(`${seed}-${variant}-${i}-a`) * Math.PI * 2;
          const r2 = random(`${seed}-${variant}-${i}-b`) * Math.PI * 2;
          const t = frame / 60;
          const dx = Math.sin(t * 0.55 + r1) * 90 + Math.sin(t * 0.21 + r2) * 50;
          const dy = Math.cos(t * 0.45 + r2) * 110;
          const s = 1 + Math.sin(t * 0.7 + r1) * 0.08;
          const size = b.size / DOWNSCALE;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: (b.x * VIDEO.width + dx) / DOWNSCALE - size / 2,
                top: (b.y * VIDEO.height + dy) / DOWNSCALE - size / 2,
                width: size,
                height: size,
                borderRadius: '50%',
                background: b.color,
                opacity: b.opacity * intensity,
                transform: `scale(${s})`,
              }}
            />
          );
        })}
      </div>
      <Grain opacity={variant === 'light' ? BACKGROUND.grainOpacity : BACKGROUND.grainOpacity * 1.4} />
    </AbsoluteFill>
  );
};
