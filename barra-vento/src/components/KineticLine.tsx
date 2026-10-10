import React, {useMemo} from 'react';
import {measureText} from '@remotion/layout-utils';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, SAFE, TYPO, VIDEO} from '../config';
import {TEXT_FONT} from '../fonts';
import {boxWidthAt, HighlightBox} from './HighlightBox';
import {KineticWord} from './KineticWord';

export type LineItem =
  | {kind: 'word'; text: string; enter: number; color?: string; glow?: boolean}
  | {kind: 'box'; contents: string[]; swapFrames: number[]; enter: number};

export const LINE_HEIGHT = Math.round(TYPO.kineticSize * 1.3);
const BOX_MARGIN = 22;

const measure = (text: string, fontSize: number) =>
  measureText({
    text,
    fontFamily: TEXT_FONT,
    fontSize,
    fontWeight: TYPO.kineticWeight,
    letterSpacing: `${TYPO.letterSpacing}px`,
  }).width;

// Calcula a posição de cada item e o deslocamento da "câmera" num frame.
export const useLineLayout = (items: LineItem[], fontSize: number = TYPO.kineticSize) => {
  const {fps} = useVideoConfig();
  const measured = useMemo(
    () => items.map((it) => (it.kind === 'word' ? [measure(it.text, fontSize)] : it.contents.map((c) => measure(c, fontSize)))),
    [items, fontSize],
  );

  return (frame: number) => {
    let x = 0;
    let cameraEdge = 0;
    const positions = items.map((it, i) => {
      const w = it.kind === 'word' ? measured[i][0] : boxWidthAt(frame, measured[i], it.swapFrames);
      // Boxes ganham respiro extra por causa das barrinhas laterais.
      const pad = it.kind === 'box' ? BOX_MARGIN : 0;
      const left = x + pad;
      x += w + TYPO.wordGap + pad * 2;
      // A câmera acompanha a borda direita de cada item conforme ele entra.
      const cam = spring({frame: frame - it.enter, fps, config: {damping: 200}, durationInFrames: 26});
      cameraEdge += cam * (left + w + pad - cameraEdge);
      return {left, width: w};
    });
    const maxRight = VIDEO.width - SAFE.side * 2;
    const shift = Math.max(0, cameraEdge - maxRight);
    return {positions, shift, measured};
  };
};

type Props = {
  items: LineItem[];
  y?: number;
  pressScale?: number;
  fontSize?: number;
  style?: React.CSSProperties;
};

// Linha de tipografia cinética que desliza para a esquerda quando passa da largura.
export const KineticLine: React.FC<Props> = ({items, y = TYPO.lineY, pressScale, fontSize = TYPO.kineticSize, style}) => {
  const frame = useCurrentFrame();
  const layoutAt = useLineLayout(items, fontSize);
  const {positions, shift, measured} = layoutAt(frame);
  const lineHeight = Math.round(fontSize * 1.3);

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.side,
        top: y - lineHeight / 2,
        height: lineHeight,
        width: VIDEO.width,
        transform: `translateX(${-shift}px)`,
        ...style,
      }}
    >
      {items.map((it, i) =>
        it.kind === 'word' ? (
          <KineticWord
            key={i}
            text={it.text}
            enterFrame={it.enter}
            x={positions[i].left}
            color={it.color ?? COLORS.nearBlack}
            glow={it.glow}
            fontSize={fontSize}
          />
        ) : (
          <div key={i} style={{position: 'absolute', left: positions[i].left, top: 0}}>
            <HighlightBox
              contents={it.contents}
              swapFrames={it.swapFrames}
              enterFrame={it.enter}
              widths={measured[i]}
              height={lineHeight}
              pressScale={pressScale}
              fontSize={fontSize}
            />
          </div>
        ),
      )}
    </div>
  );
};
