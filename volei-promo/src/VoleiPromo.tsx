// Composição principal: monta as quatro cenas na linha do tempo, as
// transições por flash, o acabamento (grão, vinheta) e o áudio opcional.
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { PhotoFlash } from './components/PhotoFlash';
import { FilmGrain, SafeAreaGuide, ShutterCurtain, Vignette } from './components/Overlays';
import { SoundTrack } from './components/SoundTrack';
import { COLORS, EFFECTS, SCENES, SYNC, type PromoProps } from './config';
import { Scene01Impacto } from './scenes/Scene01Impacto';
import { Scene02Fotografia } from './scenes/Scene02Fotografia';
import { Scene03Oferta } from './scenes/Scene03Oferta';
import { Scene04Cta } from './scenes/Scene04Cta';

export const VoleiPromo: React.FC<PromoProps> = ({ copy, brand, media, mostrarAreasSeguras }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
    <Sequence name="01 · Impacto" from={SCENES.impacto.from} durationInFrames={SCENES.impacto.duration}>
      <Scene01Impacto lines={copy.impacto} />
    </Sequence>
    <Sequence name="02 · Fotografia" from={SCENES.fotografia.from} durationInFrames={SCENES.fotografia.duration}>
      <Scene02Fotografia lines={copy.fotografia} fotos={media.fotos} />
    </Sequence>
    <Sequence name="03 · Oferta" from={SCENES.oferta.from} durationInFrames={SCENES.oferta.duration}>
      <Scene03Oferta copy={copy} />
    </Sequence>
    <Sequence name="04 · Chamada" from={SCENES.cta.from} durationInFrames={SCENES.cta.duration}>
      <Scene04Cta copy={copy} brand={brand} />
    </Sequence>

    {/* transições por flash fotográfico */}
    {[SYNC.transition1, SYNC.transition2, SYNC.transition3].map((f) => (
      <PhotoFlash key={f} at={f} attack={3} decay={6} intensity={EFFECTS.flashPeak} />
    ))}

    <Vignette strength={EFFECTS.vignette} />
    <FilmGrain opacity={EFFECTS.grain} />
    <ShutterCurtain closeAt={SYNC.shutterClose} closeFrames={6} />
    <SoundTrack audio={media.audio} />
    {mostrarAreasSeguras ? <SafeAreaGuide /> : null}
  </AbsoluteFill>
);
