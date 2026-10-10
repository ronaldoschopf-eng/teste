import React, {useMemo} from 'react';
import {measureText} from '@remotion/layout-utils';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, SAFE, TextLine, TYPO, VIDEO} from '../config';
import {TEXT_FONT} from '../fonts';
import {boxWidthAt, HighlightBox} from './HighlightBox';
import {KineticWord} from './KineticWord';
import {Sparks} from './Sparks';

export type Theme = 'light' | 'dark';

export type LineItem =
  | {kind: 'word'; text: string; enter: number; color: string; glow?: boolean}
  | {kind: 'box'; contents: string[]; swapFrames: number[]; enter: number};

const BOX_MARGIN = 22; // respiro extra dos boxes por causa das barrinhas laterais
const MAX_WIDTH = VIDEO.width - SAFE.side * 2;

// Converte uma linha do config em itens com frame de entrada e cor.
export const lineToItems = (line: TextLine, theme: Theme): LineItem[] => {
  const color = theme === 'light' ? COLORS.ink : COLORS.white;
  return line.tokens.map((t, i) => {
    const enter = line.start + i * TYPO.wordInterval;
    if (typeof t === 'string') return {kind: 'word', text: t, enter, color};
    if ('glow' in t) return {kind: 'word', text: t.glow, enter, color: COLORS.white, glow: true};
    return {kind: 'box', contents: t.box, swapFrames: line.swaps ?? [], enter};
  });
};

const measure = (text: string, fontSize: number) =>
  measureText({
    text,
    fontFamily: TEXT_FONT,
    fontSize,
    fontWeight: TYPO.kineticWeight,
    letterSpacing: `${TYPO.letterSpacing}px`,
  }).width;

// Largura total da linha no maior conteúdo de cada box.
const naturalWidth = (items: LineItem[], fontSize: number) =>
  items.reduce((sum, it, i) => {
    const w = it.kind === 'word' ? measure(it.text, fontSize) : Math.max(...it.contents.map((c) => measure(c, fontSize))) + TYPO.boxPaddingX * 2 + BOX_MARGIN * 2;
    return sum + w + (i > 0 ? TYPO.wordGap : 0);
  }, 0);

// Maior tamanho de fonte (até TYPO.kineticSize) em que a linha cabe na largura.
// Abaixo de TYPO.minSize, a "câmera" desliza para a esquerda.
export const fitFontSize = (items: LineItem[]) => {
  let size = TYPO.kineticSize;
  for (let i = 0; i < 3; i++) {
    const w = naturalWidth(items, size);
    if (w <= MAX_WIDTH) break;
    size = Math.max(TYPO.minSize, Math.floor(size * (MAX_WIDTH / w) * 0.99));
  }
  return size;
};

// Calcula a posição de cada item e o deslocamento da "câmera" num frame.
export const useLineLayout = (items: LineItem[], fontSize: number) => {
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
      const pad = it.kind === 'box' ? BOX_MARGIN : 0;
      const left = x + pad;
      x += w + TYPO.wordGap + pad * 2;
      // A câmera acompanha a borda direita de cada item conforme ele entra.
      const cam = spring({frame: frame - it.enter, fps, config: {damping: 200}, durationInFrames: 26});
      cameraEdge += cam * (left + w + pad - cameraEdge);
      return {left, width: w};
    });
    const shift = Math.max(0, cameraEdge - MAX_WIDTH);
    return {positions, shift, measured};
  };
};

type Props = {
  items: LineItem[];
  y: number;
  fontSize: number;
  pressScale?: number;
};

// Linha de tipografia cinética. Cada box solta faíscas ao entrar e a cada troca.
export const KineticLine: React.FC<Props> = ({items, y, fontSize, pressScale}) => {
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
      }}
    >
      {items.map((it, i) =>
        it.kind === 'word' ? (
          <KineticWord
            key={i}
            text={it.text}
            enterFrame={it.enter}
            x={positions[i].left}
            color={it.color}
            glow={it.glow}
            fontSize={fontSize}
          />
        ) : (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: positions[i].left, top: 0}}>
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
            {[it.enter + 10, ...it.swapFrames.map((f) => f + 6)].map((f, k) => {
              const p = layoutAt(f).positions[i];
              return <Sparks key={`sp-${k}`} x={p.left + p.width + 14} y={-14} start={f} seed={`${it.contents[0]}-${k}`} />;
            })}
          </React.Fragment>
        ),
      )}
    </div>
  );
};
