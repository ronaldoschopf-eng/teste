import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {SAFE, TEXT, TIMING, TYPO} from '../config';
import {BlobBackground} from '../components/BlobBackground';
import {KineticLine, LINE_HEIGHT, LineItem, useLineLayout} from '../components/KineticLine';
import {Sparks} from '../components/Sparks';

// Cena 1 (fundo claro): "Suas" → "fotos" → "do" → [4º Festival / Barra Vento / de Capoeira].
export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const items = useMemo<LineItem[]>(() => {
    const {scene1WordStart: s, wordInterval: d} = TIMING;
    return [
      ...TEXT.scene1Words.map((text, i) => ({kind: 'word' as const, text, enter: s + i * d})),
      {kind: 'box' as const, contents: TEXT.scene1Box, swapFrames: TIMING.scene1BoxSwaps, enter: s + TEXT.scene1Words.length * d},
    ];
  }, []);
  const box = items[items.length - 1];
  const layoutAt = useLineLayout(items);

  // Saída: o texto sobe e desfoca enquanto a onda passa.
  const exit = interpolate(frame, [TIMING.wave.from - 4, TIMING.wave.to - 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  // Faíscas no canto superior direito do box, a cada entrada/troca.
  const sparkFrames = [box.enter + 10, ...TIMING.scene1BoxSwaps.map((f) => f + 6)];

  return (
    <AbsoluteFill>
      <BlobBackground variant="light" seed="s1" />
      <AbsoluteFill style={{transform: `translateY(${-exit * 220}px)`, opacity: 1 - exit, filter: `blur(${exit * 12}px)`}}>
        <KineticLine items={items} />
        {sparkFrames.map((f, i) => {
          const {positions, shift} = layoutAt(f);
          const p = positions[positions.length - 1];
          const x = SAFE.side + p.left + p.width - shift;
          return <Sparks key={i} x={x + 10} y={TYPO.lineY - LINE_HEIGHT / 2 - 10} start={f} seed={`s1-${i}`} />;
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
