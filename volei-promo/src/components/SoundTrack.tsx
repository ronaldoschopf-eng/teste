// Trilha e efeitos sonoros opcionais. Só é montado o que existir em
// DEFAULT_PROPS.media.audio — nada de caminhos inventados. Cada efeito
// toca nos quadros de SYNC, então mover um ponto de sincronização move o
// som e a imagem juntos.
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { SYNC, type Media } from '../config';

const Hit: React.FC<{ src: string; at: number; volume?: number }> = ({ src, at, volume = 1 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={60} name={`sfx ${src} @${at}`}>
    <Audio src={staticFile(src)} volume={volume} />
  </Sequence>
);

export const SoundTrack: React.FC<{ audio: Media['audio'] }> = ({ audio }) => (
  <>
    {audio.trilha ? <Audio src={staticFile(audio.trilha)} volume={audio.volumeTrilha} /> : null}
    {audio.obturador
      ? [SYNC.freeze, ...SYNC.shutters, SYNC.finalFlash].map((f) => <Hit key={`sh${f}`} src={audio.obturador as string} at={f} volume={0.8} />)
      : null}
    {audio.whoosh
      ? [SYNC.transition1, SYNC.transition2, SYNC.transition3].map((f) => <Hit key={`wh${f}`} src={audio.whoosh as string} at={f - 6} volume={0.7} />)
      : null}
    {audio.impacto ? [SYNC.bassDrop, SYNC.ctaHit].map((f) => <Hit key={`im${f}`} src={audio.impacto as string} at={f} />) : null}
  </>
);
