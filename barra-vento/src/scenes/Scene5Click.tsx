import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {SAFE, TEXT, TIMING, TYPO} from '../config';
import {BlobBackground} from '../components/BlobBackground';
import {Cursor, Ripple} from '../components/Cursor';
import {FloatingEmojis} from '../components/FloatingEmojis';
import {KineticLine, LINE_HEIGHT, LineItem, useLineLayout} from '../components/KineticLine';
import {Sparks} from '../components/Sparks';

// Cena 5 (fundo claro): "clique" → "no" → [link da bio] + cursor que clica.
export const Scene5Click: React.FC = () => {
  const frame = useCurrentFrame();
  const items = useMemo<LineItem[]>(() => {
    const s = TIMING.scene5WordStart;
    const d = TIMING.wordInterval;
    return [
      ...TEXT.scene5Words.map((text, i) => ({kind: 'word' as const, text, enter: s + i * d})),
      {kind: 'box' as const, contents: [TEXT.scene5Box], swapFrames: [], enter: s + TEXT.scene5Words.length * d},
    ];
  }, []);
  const box = items[items.length - 1];
  const layoutAt = useLineLayout(items, TYPO.scene5Size);

  // Centro do box (em coordenadas da tela) no momento do clique.
  const at = layoutAt(TIMING.click);
  const bp = at.positions[at.positions.length - 1];
  const boxCx = SAFE.side + bp.left + bp.width / 2 - at.shift;
  const boxRight = SAFE.side + bp.left + bp.width - at.shift;

  const press = interpolate(frame, [TIMING.click - 3, TIMING.click + 2, TIMING.click + 16], [1, 0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <BlobBackground variant="light" seed="s5" />
      <FloatingEmojis start={TIMING.lightReveal.from + 14} />
      <KineticLine items={items} pressScale={press} fontSize={TYPO.scene5Size} />
      <Sparks x={boxRight + 10} y={TYPO.lineY - LINE_HEIGHT / 2 - 10} start={box.enter + 10} seed="s5-a" />
      <Ripple x={boxCx} y={TYPO.lineY} start={TIMING.click} />
      <Sparks x={boxCx - bp.width / 2 - 20} y={TYPO.lineY + LINE_HEIGHT / 2 + 10} start={TIMING.click + 2} seed="s5-b" size={1.1} />
      <Sparks x={boxRight + 20} y={TYPO.lineY + LINE_HEIGHT / 2} start={TIMING.click + 6} seed="s5-c" />
      <Cursor
        enter={TIMING.cursorEnter}
        click={TIMING.click}
        from={{x: 980, y: 1500}}
        to={{x: boxCx + 30, y: TYPO.lineY + 24}}
      />
    </AbsoluteFill>
  );
};
