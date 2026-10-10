import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {TextGroup as Group, TIMING} from '../config';
import {fitFontSize, KineticLine, lineToItems, Theme} from './KineticLine';

type Props = {
  group: Group;
  theme: Theme;
  pressScale?: number; // aplicado aos boxes (clique da cena 5)
  exit?: boolean; // false = a saída é feita pela transição de cena
};

// Bloco de linhas cinéticas que sai junto: sobe, desfoca e some.
export const TextGroup: React.FC<Props> = ({group, theme, pressScale, exit = true}) => {
  const frame = useCurrentFrame();
  const lines = useMemo(
    () =>
      group.lines.map((line) => {
        const items = lineToItems(line, theme);
        return {items, y: line.y, fontSize: fitFontSize(items)};
      }),
    [group, theme],
  );
  if (frame >= group.exit + TIMING.groupExit) return null;

  const p = exit
    ? interpolate(frame, [group.exit, group.exit + TIMING.groupExit], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.in(Easing.cubic),
      })
    : 0;

  return (
    <AbsoluteFill style={p > 0 ? {transform: `translateY(${-p * 160}px)`, opacity: 1 - p, filter: `blur(${p * 12}px)`} : undefined}>
      {lines.map((l, i) => (
        <KineticLine key={i} items={l.items} y={l.y} fontSize={l.fontSize} pressScale={pressScale} />
      ))}
    </AbsoluteFill>
  );
};
