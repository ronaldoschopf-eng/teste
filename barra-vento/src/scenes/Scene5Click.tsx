import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {SAFE, TEXT_GROUPS, TIMING} from '../config';
import {BlobBackground} from '../components/BlobBackground';
import {Cursor, Ripple} from '../components/Cursor';
import {FloatingEmojis} from '../components/FloatingEmojis';
import {fitFontSize, lineToItems, useLineLayout} from '../components/KineticLine';
import {Sparks} from '../components/Sparks';
import {TextGroup} from '../components/TextGroup';

// Cena 5 (fundo claro): "Suas fotos estarão" / "no [link da bio.]" + cursor que clica.
export const Scene5Click: React.FC = () => {
  const frame = useCurrentFrame();
  const group = TEXT_GROUPS.link;
  // Linha com o box: calcula onde ele está na tela no momento do clique.
  const boxLine = group.lines[group.lines.length - 1];
  const items = useMemo(() => lineToItems(boxLine, 'light'), [boxLine]);
  const fontSize = useMemo(() => fitFontSize(items), [items]);
  const layoutAt = useLineLayout(items, fontSize);
  const at = layoutAt(TIMING.click);
  const boxIndex = items.findIndex((it) => it.kind === 'box');
  const bp = at.positions[boxIndex];
  const boxLeft = SAFE.side + bp.left - at.shift;
  const boxCx = boxLeft + bp.width / 2;
  const lineHeight = Math.round(fontSize * 1.3);

  const press = interpolate(frame, [TIMING.click - 3, TIMING.click + 2, TIMING.click + 16], [1, 0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      <BlobBackground variant="light" seed="s5" />
      <FloatingEmojis start={TIMING.lightReveal.from + 14} />
      {/* A saída deste bloco é a transição para o card final */}
      <TextGroup group={group} theme="light" pressScale={press} exit={false} />
      <Ripple x={boxCx} y={boxLine.y} start={TIMING.click} />
      <Sparks x={boxLeft - 20} y={boxLine.y + lineHeight / 2 + 10} start={TIMING.click + 2} seed="s5-b" angle={135} size={1.1} />
      <Sparks x={boxLeft + bp.width + 20} y={boxLine.y + lineHeight / 2} start={TIMING.click + 6} seed="s5-c" angle={45} />
      <Cursor enter={TIMING.cursorEnter} click={TIMING.click} from={{x: 980, y: 1520}} to={{x: boxCx + 30, y: boxLine.y + 24}} />
    </AbsoluteFill>
  );
};
