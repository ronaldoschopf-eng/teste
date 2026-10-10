import React from 'react';
import {AbsoluteFill, Easing, Html5Audio, interpolate, useCurrentFrame} from 'remotion';
import {FULL_TEXT, PHOTOS, TEXT_GROUPS, TextGroup as Group, TIMING, Token, VIDEO} from './config';
import {MUSIC_SRC, PHOTO_FILES} from './assets';
import {useFontsReady} from './fonts';
import {EndCard} from './components/EndCard';
import {Show} from './components/Show';
import {WaveTransition} from './components/WaveTransition';
import {photoSrc} from './scenes/PhotoLayers';
import {Scene1Intro} from './scenes/Scene1Intro';
import {Collage, Scene3Rain} from './scenes/Scene3Rain';
import {Scene5Click} from './scenes/Scene5Click';

// Confere se os blocos de texto formam exatamente a frase do config.
const joined = (Object.values(TEXT_GROUPS) as Group[])
  .flatMap((g) => g.lines.flatMap((l): Token[] => l.tokens))
  .map((t) => (typeof t === 'string' ? t : 'glow' in t ? t.glow : t.box.join(' ')))
  .join(' ');
if (joined !== FULL_TEXT) {
  console.warn(`Os blocos de texto não formam FULL_TEXT:\n${joined}\n${FULL_TEXT}`);
}

export const BarraVento: React.FC = () => {
  const frame = useCurrentFrame();
  const ready = useFontsReady();

  // Revelação clara (cena 4 → 5): círculo que abre do centro do grid.
  const reveal = interpolate(frame, [TIMING.lightReveal.from, TIMING.lightReveal.to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  const revealRadius = reveal * Math.hypot(VIDEO.width, VIDEO.height);

  // Card final entra sobre a cena 5 (dissolve com leve zoom e blur).
  const end = interpolate(frame, [TIMING.endCard.from, TIMING.endCard.from + 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });

  if (!ready) return <AbsoluteFill style={{background: '#FFFFFF'}} />;

  return (
    <AbsoluteFill style={{background: '#FFFFFF'}}>
      {/* Cenas 1–2 */}
      <Show from={TIMING.scene1.from} to={TIMING.scene1.to}>
        <Scene1Intro />
      </Show>

      {/* Cenas 2–4: a onda revela o fundo escuro */}
      <Show from={TIMING.wave.from} to={TIMING.lightReveal.to}>
        <WaveTransition from={TIMING.wave.from} to={TIMING.wave.to}>
          <Scene3Rain photos={PHOTO_FILES} />
        </WaveTransition>
      </Show>

      {/* Cena 5: revelada por um círculo claro */}
      <Show from={TIMING.scene5.from} to={TIMING.scene5.to}>
        <AbsoluteFill
          style={{
            clipPath: reveal < 1 ? `circle(${revealRadius}px at 540px ${PHOTOS.grid.centerY}px)` : undefined,
            transform: `scale(${1.04 - 0.04 * end})`,
            filter: end > 0 ? `blur(${end * 14}px)` : undefined,
            opacity: 1 - end,
          }}
        >
          <Scene5Click />
        </AbsoluteFill>
      </Show>

      {/* Cena 4: grid em zoom-out por cima da revelação */}
      <Show from={TIMING.zoomOut.from} to={TIMING.zoomOut.to}>
        <Collage photos={PHOTO_FILES} />
      </Show>

      {/* Cena 6: card final */}
      <Show from={TIMING.endCard.from} to={TIMING.endCard.to}>
        <AbsoluteFill
          style={{
            opacity: end,
            transform: `scale(${1.06 - 0.06 * end})`,
            filter: end < 1 ? `blur(${(1 - end) * 16}px)` : undefined,
          }}
        >
          <EndCard photos={[0, 1, 2].map((i) => photoSrc(PHOTO_FILES, i + 3))} />
        </AbsoluteFill>
      </Show>

      {MUSIC_SRC ? (
        <Html5Audio
          src={MUSIC_SRC}
          volume={(f) =>
            interpolate(
              f,
              [0, TIMING.musicFadeIn, VIDEO.durationInFrames - TIMING.musicFadeOut, VIDEO.durationInFrames],
              [0, TIMING.musicVolume, TIMING.musicVolume, 0],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            )
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
