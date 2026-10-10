import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {BACKGROUND, COLORS, HALFTONE, VIDEO} from '../config';
import {Grain} from './Grain';
import {Halftone} from './Halftone';

type Variant = 'light' | 'dark';

type Blob = {color: string; size: number; x: number; y: number; opacity: number};

const BLOBS: Record<Variant, Blob[]> = {
  light: [
    {color: COLORS.pinkSoft, size: 720, x: 0.1, y: 0.16, opacity: 0.55},
    {color: COLORS.orangeSoft, size: 640, x: 0.95, y: 0.4, opacity: 0.5},
    {color: COLORS.pinkSoft, size: 760, x: 0.82, y: 0.88, opacity: 0.45},
    {color: COLORS.orangeSoft, size: 560, x: 0.06, y: 0.7, opacity: 0.42},
  ],
  dark: [
    {color: COLORS.pink, size: 900, x: 0.1, y: 0.2, opacity: 0.7},
    {color: COLORS.orange, size: 560, x: 0.9, y: 0.42, opacity: 0.45},
    {color: '#C8135F', size: 820, x: 0.75, y: 0.9, opacity: 0.8},
    {color: COLORS.orange, size: 640, x: 0.2, y: 0.72, opacity: 0.35},
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
      : `linear-gradient(170deg, ${COLORS.deep} 0%, #400724 55%, #2A0418 100%)`;

  // Posição de cada blob neste frame (movimento lento e contínuo).
  const t = frame / 60;
  const placed = BLOBS[variant].map((b, i) => {
    const r1 = random(`${seed}-${variant}-${i}-a`) * Math.PI * 2;
    const r2 = random(`${seed}-${variant}-${i}-b`) * Math.PI * 2;
    const dx = Math.sin(t * 0.55 + r1) * 90 + Math.sin(t * 0.21 + r2) * 50;
    const dy = Math.cos(t * 0.45 + r2) * 110;
    const s = 1 + Math.sin(t * 0.7 + r1) * 0.08;
    return {...b, cx: b.x * VIDEO.width + dx, cy: b.y * VIDEO.height + dy, s};
  });

  const blobLayer = (color: (b: Blob) => string, alpha: (b: Blob) => number, sizeK = 1) => (
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
      {placed.map((b, i) => {
        const size = (b.size * sizeK) / DOWNSCALE;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.cx / DOWNSCALE - size / 2,
              top: b.cy / DOWNSCALE - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: color(b),
              opacity: alpha(b),
              transform: `scale(${b.s})`,
            }}
          />
        );
      })}
    </div>
  );

  const ink = `linear-gradient(160deg, ${COLORS.pink} 10%, ${COLORS.orange} 90%)`;

  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      {blobLayer((b) => b.color, (b) => b.opacity * intensity)}
      {/* Meio-tom: os mesmos blobs e os cantos viram campos de pontos */}
      <Halftone ink={ink} mode={variant} opacity={HALFTONE.intensity * Math.min(1, intensity * 1.4)}>
        {blobLayer(() => '#000000', (b) => Math.min(0.95, b.opacity * 1.25), 0.85)}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.85) 100%)'}} />
      </Halftone>
      <Grain opacity={variant === 'light' ? BACKGROUND.grainOpacity : BACKGROUND.grainOpacity * 1.4} />
    </AbsoluteFill>
  );
};
