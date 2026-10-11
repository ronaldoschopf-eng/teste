// Número promocional monumental ("20%"): entra rápido, ultrapassa a escala
// final e estabiliza; um contorno luminoso percorre as letras sem parar.
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, tween } from '../anim/motion';
import { COLORS } from '../config';
import { FONTS } from '../fonts';

type Props = {
  text: string;
  /** Quadro de entrada (impacto). */
  at: number;
  fontSize: number;
  /** Centro horizontal e linha de base (px). */
  cx: number;
  baseline: number;
  fill?: string;
  glowColor?: string;
  /** Estica verticalmente (tipografia condensada "esportiva"). */
  stretch?: number;
};

export const PromoNumber: React.FC<Props> = ({ text, at, fontSize, cx, baseline, fill = COLORS.accent, glowColor = COLORS.white, stretch = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at - 1) return null;

  // Escala: de 0.35 até ~1.08 e assenta em 1 (mola subamortecida).
  const sp = spring({ frame: frame - at, fps, config: { stiffness: 260, damping: 11, mass: 0.75 } });
  const scale = 0.35 + 0.65 * sp;
  const rise = (1 - tween(frame, [at, at + 8], [0, 1], ease.outExpo)) * 140;
  const blur = tween(frame, [at, at + 5], [14, 0]);

  // Contorno: primeiro desenha o traço inteiro, depois um brilho circula.
  const draw = tween(frame, [at + 4, at + 30], [0, 1], ease.inOut);
  const dash = 2400;
  const travel = (frame - at) * 38;
  const box = { w: 1080, h: fontSize * 1.15 * stretch };
  const base = box.h - fontSize * 0.08;
  const y = baseline - base;
  const stretchT = `translate(0 ${base}) scale(1 ${stretch}) translate(0 ${-base})`;

  const textProps = {
    x: box.w / 2,
    y: base,
    textAnchor: 'middle' as const,
    fontFamily: FONTS.display,
    fontSize,
    letterSpacing: '-0.03em',
  };

  return (
    <svg
      width={box.w}
      height={box.h}
      viewBox={`0 0 ${box.w} ${box.h}`}
      style={{
        position: 'absolute',
        left: cx - box.w / 2,
        top: y + rise,
        overflow: 'visible',
        transform: `scale(${scale})`,
        transformOrigin: `50% 75%`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
      }}
    >
      <g transform={stretchT}>
      {/* sombra de profundidade */}
      <text {...textProps} fill="rgba(0,0,0,0.55)" transform="translate(14 18)">
        {text}
      </text>
      <text {...textProps} fill={fill}>
        {text}
      </text>
      {/* traço de contorno sendo desenhado */}
      <text {...textProps} fill="none" stroke={COLORS.black} strokeWidth={5} strokeDasharray={dash} strokeDashoffset={dash * (1 - draw)} opacity={0.9}>
        {text}
      </text>
      {/* brilho que percorre o contorno */}
      <g style={{ filter: `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 26px ${fill})` }}>
        <text
          {...textProps}
          fill="none"
          stroke={glowColor}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray="120 520"
          strokeDashoffset={-travel}
          opacity={draw}
        >
          {text}
        </text>
      </g>
      </g>
    </svg>
  );
};
