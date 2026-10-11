// Camadas de acabamento: grão de filme, vinheta, cortina de obturador e
// guia de áreas seguras do Instagram.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../anim/motion';
import { COLORS, SAFE } from '../config';
import { FONTS } from '../fonts';

/** Grão determinístico: feTurbulence com semente trocada a cada quadro. */
export const FilmGrain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <svg width="100%" height="100%">
        <filter id={`grain-${frame}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${frame})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength: number }> = ({ strength }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 85% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

/**
 * Cortina de obturador: duas lâminas pretas fecham do topo e da base.
 * `closeAt` = quadro em que começam a fechar; `openAt` (opcional) reabre.
 */
export const ShutterCurtain: React.FC<{ closeAt: number; closeFrames?: number; openAt?: number; openFrames?: number }> = ({
  closeAt,
  closeFrames = 4,
  openAt,
  openFrames = 4,
}) => {
  const frame = useCurrentFrame();
  const close = tween(frame, [closeAt, closeAt + closeFrames], [0, 1], ease.inCubic);
  const open = openAt === undefined ? 0 : tween(frame, [openAt, openAt + openFrames], [0, 1], ease.outCubic);
  const v = close * (1 - open);
  if (v <= 0) return null;
  const h = 50 * v;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: `${h}%`, background: COLORS.black, borderBottom: v < 1 ? `2px solid ${COLORS.graphite2}` : undefined }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${h}%`, background: COLORS.black, borderTop: v < 1 ? `2px solid ${COLORS.graphite2}` : undefined }} />
    </AbsoluteFill>
  );
};

/** Só para revisão: marca as áreas cobertas pela interface do Instagram. */
export const SafeAreaGuide: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', fontFamily: FONTS.mono, fontSize: 22, color: '#ff4d6d' }}>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: SAFE.top, background: 'rgba(255,0,60,0.22)' }}>
      <span style={{ position: 'absolute', left: 20, bottom: 10 }}>topo: perfil / barra de progresso</span>
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, top: SAFE.bottom, bottom: 0, background: 'rgba(255,0,60,0.22)' }}>
      <span style={{ position: 'absolute', left: 20, top: 10 }}>base: legenda / responder</span>
    </div>
    <div style={{ position: 'absolute', top: SAFE.top, bottom: 1920 - SAFE.bottom, left: 0, width: SAFE.side, background: 'rgba(255,0,60,0.12)' }} />
    <div style={{ position: 'absolute', top: SAFE.top, bottom: 1920 - SAFE.bottom, right: 0, width: SAFE.side, background: 'rgba(255,0,60,0.12)' }} />
    <div
      style={{
        position: 'absolute',
        left: SAFE.stickerZone.x,
        top: SAFE.stickerZone.y,
        width: SAFE.stickerZone.width,
        height: SAFE.stickerZone.height,
        border: '3px dashed #ff4d6d',
      }}
    >
      <span style={{ position: 'absolute', left: 12, top: 8 }}>sticker de link</span>
    </div>
  </AbsoluteFill>
);
