// CENA 04 — CHAMADA PARA AÇÃO (10–15 s)
// O movimento diminui e a atenção vai para o link: chamada, frase de apoio,
// seta para a área livre do sticker de link e assinatura do fotógrafo.
// Termina com um último flash; a cortina do obturador (VoleiPromo) fecha.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../anim/motion';
import { CourtFloor } from '../components/Arena';
import { LinkArrow, Signature, StickerZone } from '../components/CtaEnding';
import { KineticText } from '../components/KineticText';
import { Particles } from '../components/Particles';
import { PhotoFlash } from '../components/PhotoFlash';
import { SpeedLines } from '../components/SpeedLines';
import { COLORS, SAFE, SYNC, local, type Brand, type Copy } from '../config';
import { FONTS } from '../fonts';

const HIT = local(SYNC.ctaHit, 'cta');
const FINAL = local(SYNC.finalFlash, 'cta');

/** Quebra uma frase em duas linhas de tamanho parecido. */
const splitBalanced = (text: string): string[] => {
  const words = text.split(' ');
  if (words.length < 4) return [text];
  let best = 1;
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (d < diff) {
      diff = d;
      best = i;
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

export const Scene04Cta: React.FC<{ copy: Copy; brand: Brand }> = ({ copy, brand }) => {
  const frame = useCurrentFrame();

  // Menos elementos em movimento com o passar do tempo.
  const calm = tween(frame, [0, 40], [1, 0], ease.outCubic);
  const enter = tween(frame, [0, 14], [1.06, 1], ease.outExpo);
  const finalGlow = tween(frame, [FINAL, FINAL + 10], [0, 1], ease.outCubic);

  const last = copy.cta.length - 1;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 55% at 50% 42%, ${COLORS.graphite} 0%, ${COLORS.black} 72%)` }} />
      {/* fundo vivo, mas quase parado */}
      <CourtFloor horizon={1560} shift={frame * 1.2} opacity={0.4} />
      <Particles count={16} seed="s4" opacity={0.45} speed={0.4} accentRatio={0.15} />
      {/* marca d'água da oferta, em contorno, derivando devagar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 470 + Math.sin(frame / 40) * 12,
          textAlign: 'center',
          fontFamily: FONTS.display,
          fontSize: 760,
          lineHeight: 1,
          color: 'transparent',
          WebkitTextStroke: `3px rgba(246,247,242,${0.07 * tween(frame, [HIT, HIT + 30], [0, 1])})`,
          transform: `translateX(${-30 + frame * 0.35}px) rotate(-6deg)`,
          whiteSpace: 'nowrap',
        }}
      >
        {copy.ofertaNumero}
      </div>
      {calm > 0.01 ? <SpeedLines count={18} angle={90} speed={30} opacity={0.4 * calm} seed="s4-speed" /> : null}

      <AbsoluteFill style={{ transform: `scale(${enter})` }}>
        <KineticText
          start={HIT}
          stagger={4}
          duration={14}
          align="center"
          lineHeight={0.9}
          style={{ position: 'absolute', left: 0, right: 0, top: 290 }}
          lines={copy.cta.map((text, i) => ({
            text,
            size: i === last ? 224 : 128,
            color: i === last ? COLORS.accent : COLORS.white,
          }))}
        />
        {/* brilho final atrás da oferta */}
        <div
          style={{
            position: 'absolute',
            left: 140,
            right: 140,
            top: 560,
            height: 220,
            background: `radial-gradient(ellipse at center, rgba(212,255,30,${0.22 * finalGlow}) 0%, rgba(212,255,30,0) 70%)`,
            filter: 'blur(10px)',
          }}
        />

        <KineticText
          start={HIT + 22}
          stagger={4}
          duration={16}
          align="center"
          lineHeight={1.05}
          style={{ position: 'absolute', left: 0, right: 0, top: 812 }}
          lines={splitBalanced(copy.ctaApoio).map((text) => ({ text, size: 58, font: FONTS.condensed, weight: 500, letterSpacing: '0.01em', color: COLORS.white }))}
        />

        <LinkArrow x={540} y={985} length={110} start={HIT + 34} />
        <StickerZone start={HIT + 40} />
        <Signature brand={brand} start={HIT + 50} y={SAFE.stickerZone.y + SAFE.stickerZone.height + 52} />
      </AbsoluteFill>

      <PhotoFlash at={HIT} attack={0} decay={4} intensity={0.25} />
      <PhotoFlash at={FINAL} attack={1} decay={9} intensity={0.9} />
    </AbsoluteFill>
  );
};
