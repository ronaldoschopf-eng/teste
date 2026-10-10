import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TYPO} from '../config';
import {FONT_FAMILY} from '../fonts';

export const useWordEntrance = (enterFrame: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - enterFrame, fps, config: {damping: 12, mass: 0.8}});
  return {
    progress: p,
    style: {
      opacity: interpolate(p, [0, 0.6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      filter: `blur(${Math.max(0, interpolate(p, [0, 1], [8, 0]))}px)`,
    } as React.CSSProperties,
  };
};

type Props = {
  text: string;
  enterFrame: number;
  x: number; // posição horizontal na linha (px)
  color?: string;
  glow?: boolean;
  fontSize?: number;
};

// Uma palavra que entra com spring: sobe 40px, ganha opacidade, perde blur.
export const KineticWord: React.FC<Props> = ({text, enterFrame, x, color = COLORS.nearBlack, glow, fontSize = TYPO.kineticSize}) => {
  const frame = useCurrentFrame();
  const {style} = useWordEntrance(enterFrame);
  const pulse = glow ? 0.5 + 0.5 * Math.sin((frame - enterFrame) / 9) : 0;
  const glowOn = glow ? Math.min(1, Math.max(0, (frame - enterFrame - 10) / 20)) : 0;
  const glowShadow = glow
    ? `0 0 ${18 + pulse * 22}px rgba(255, 212, 0, ${(0.55 + pulse * 0.4) * glowOn}), 0 0 ${50 + pulse * 40}px rgba(255, 212, 0, ${(0.35 + pulse * 0.3) * glowOn})`
    : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        fontFamily: FONT_FAMILY,
        fontWeight: TYPO.kineticWeight,
        fontSize,
        letterSpacing: TYPO.letterSpacing,
        color: glow ? mixToYellow(glowOn * (0.35 + pulse * 0.25)) : color,
        textShadow: glowShadow,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// Mistura branco → amarelo para o brilho (palavras brancas da cena escura).
const mixToYellow = (t: number) => {
  const r = 255;
  const g = Math.round(255 - (255 - 212) * t);
  const b = Math.round(255 - 255 * t);
  return `rgb(${r}, ${g}, ${b})`;
};
