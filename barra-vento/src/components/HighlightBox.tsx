import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TIMING, TYPO} from '../config';
import {FONT_FAMILY} from '../fonts';
import {Scribble} from './Scribble';

type Props = {
  contents: string[]; // textos que se alternam (wipe vertical)
  swapFrames: number[]; // frame de início de cada troca (contents.length - 1)
  enterFrame: number;
  widths: number[]; // largura medida de cada conteúdo (sem padding)
  height: number;
  pressScale?: number; // usado pelo clique da cena 5
  fontSize?: number;
};

export const boxWidthAt = (frame: number, widths: number[], swapFrames: number[]) => {
  let w = widths[0];
  swapFrames.forEach((s, i) => {
    const t = interpolate(frame, [s, s + TIMING.boxSwapDuration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.7, 0, 0.3, 1),
    });
    w = w + (widths[i + 1] - widths[i]) * t;
  });
  return w + TYPO.boxPaddingX * 2;
};

// Retângulo verde-limão que "abre" (scaleX 0 → 1) com barrinhas nas laterais.
export const HighlightBox: React.FC<Props> = ({
  contents,
  swapFrames,
  enterFrame,
  widths,
  height,
  pressScale = 1,
  fontSize = TYPO.kineticSize,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const open = spring({frame: frame - enterFrame, fps, config: {damping: 14, stiffness: 140}});
  const width = boxWidthAt(frame, widths, swapFrames);
  const barOpacity = interpolate(frame - enterFrame, [0, 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Conteúdo atual: quantas trocas já terminaram; se uma está em andamento,
  // faz o wipe vertical do conteúdo i para o i + 1.
  const done = swapFrames.filter((s) => frame >= s + TIMING.boxSwapDuration).length;
  const active = swapFrames.findIndex((s) => frame >= s && frame < s + TIMING.boxSwapDuration);
  const swapping = active !== -1;
  const wipe = swapping
    ? interpolate(frame, [swapFrames[active], swapFrames[active] + TIMING.boxSwapDuration], [0, 1], {
        easing: Easing.bezier(0.7, 0, 0.3, 1),
      })
    : 0;
  const current = contents[swapping ? active : done];
  const next = swapping ? contents[active + 1] : undefined;

  const textIn = spring({frame: frame - enterFrame - 6, fps, config: {damping: 12}});
  const textStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    fontFamily: FONT_FAMILY,
    fontWeight: TYPO.kineticWeight,
    fontSize,
    letterSpacing: TYPO.letterSpacing,
    color: COLORS.darkGreen,
  };

  const halfOpen = (width / 2) * open;
  const bar = (side: -1 | 1) => (
    <div
      style={{
        position: 'absolute',
        left: width / 2 + side * (halfOpen + 10) - 3,
        top: -16,
        width: 6,
        height: height + 32,
        borderRadius: 3,
        background: COLORS.darkGreen,
        opacity: barOpacity,
      }}
    />
  );

  return (
    <div style={{position: 'absolute', width, height, transform: `scale(${pressScale})`}}>
      <Scribble width={width} height={height} start={enterFrame + 8} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: COLORS.lime,
          borderRadius: 10,
          transform: `scaleX(${open})`,
          boxShadow: '0 18px 40px rgba(11, 61, 30, 0.18)',
        }}
      />
      {bar(-1)}
      {bar(1)}
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${(1 - open) * 50}% 0 ${(1 - open) * 50}%)`}}>
        {swapping && next ? (
          <>
            <div style={{...textStyle, transform: `translateY(${-wipe * 100}%)`}}>{current}</div>
            <div style={{...textStyle, transform: `translateY(${(1 - wipe) * 100}%)`}}>{next}</div>
          </>
        ) : (
          <div
            style={{
              ...textStyle,
              opacity: textIn,
              transform: `translateY(${(1 - textIn) * 30}px)`,
              filter: `blur(${Math.max(0, (1 - textIn) * 6)}px)`,
            }}
          >
            {current}
          </div>
        )}
      </div>
    </div>
  );
};
