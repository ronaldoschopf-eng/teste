// CENA 03 — A OFERTA (6–10 s)
// O "20%" explode em escala monumental no impacto grave, com contorno
// luminoso, "OFF" batendo na tela e flashes fotográficos ao fundo.
import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, keys, punch, shake, tween } from '../anim/motion';
import { CourtFloor, Spotlights } from '../components/Arena';
import { AutofocusFrame } from '../components/AutofocusFrame';
import { KineticText } from '../components/KineticText';
import { Particles } from '../components/Particles';
import { FlashBurst, PhotoFlash } from '../components/PhotoFlash';
import { PromoNumber } from '../components/PromoNumber';
import { COLORS, EFFECTS, SAFE, SCENES, SYNC, local, type Copy } from '../config';
import { FONTS } from '../fonts';

const END = SCENES.oferta.duration;
const DROP = local(SYNC.bassDrop, 'oferta');
const OFF = local(SYNC.offHit, 'oferta');
const FLASHES = SYNC.offerFlashes.map((f) => local(f, 'oferta'));

// Geometria principal (px)
const NUMBER = { size: 438, stretch: 1.22, baseline: 1040 };
const OFF_SLAB = { y: 1088, h: 216, w: 560 };

export const Scene03Oferta: React.FC<{ copy: Copy }> = ({ copy }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sk = shake(frame, DROP, EFFECTS.shake, 12, 'drop');
  const sk2 = shake(frame, OFF, EFFECTS.shake * 0.5, 8, 'off');
  const drift = tween(frame, [DROP, END], [1, 1.035], (x) => x);
  const exit = tween(frame, [END - 7, END], [0, 1], ease.inCubic);

  // Pulso de luz no fundo a cada flash.
  const pulse = FLASHES.reduce((a, f) => a + Math.max(0, 1 - Math.abs(frame - f) / 4), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${1 + exit * 0.25})`, transformOrigin: '50% 50%' }}>
        {/* fundo: quadra em perspectiva avançando + luz */}
        <Spotlights intensity={0.45 + pulse * 0.4} glowY={40} glow="rgba(212,255,30,0.22)" />
        <CourtFloor horizon={1180} shift={frame * 9} opacity={0.75} />
        <RadialLines frame={frame} from={DROP} />
        <Particles count={30} seed="s3" opacity={0.6} speed={1.6} accentRatio={0.3} />
        {FLASHES.map((f, i) => (
          <FlashBurst key={f} at={f} x={140 + random(`of-x${i}`) * 800} y={SAFE.top + 40 + random(`of-y${i}`) * 260} size={260 + random(`of-s${i}`) * 140} decay={8} />
        ))}

        <AbsoluteFill style={{ transform: `translate(${sk.x + sk2.x}px, ${sk.y + sk2.y}px) scale(${drift})` }}>
          {/* GARANTA */}
          <KineticText
            start={DROP - 3}
            duration={12}
            align="center"
            style={{ position: 'absolute', left: 0, right: 0, top: 392 }}
            lines={[{ text: copy.ofertaChamada, size: 96, font: FONTS.condensed, weight: 700, letterSpacing: '0.34em' }]}
          />

          <AutofocusFrame x={84} y={566} width={912} height={500} start={DROP + 2} lockAt={DROP + 12} corner={70} stroke={6} cross={false} />

          <PromoNumber text={copy.ofertaNumero} at={DROP} fontSize={NUMBER.size} stretch={NUMBER.stretch} cx={540} baseline={NUMBER.baseline} />

          <OffSlab text={copy.ofertaSufixo} frame={frame} fps={fps} at={OFF} />

          <KineticText
            start={OFF + 12}
            stagger={4}
            duration={14}
            align="center"
            lineHeight={0.95}
            style={{ position: 'absolute', left: 0, right: 0, top: OFF_SLAB.y + OFF_SLAB.h + 34 }}
            lines={copy.ofertaComplemento.map((text) => ({ text, size: 84, font: FONTS.condensed, weight: 700, letterSpacing: '0.04em' }))}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* impacto do grave: flash curto em verde-limão + branco */}
      <PhotoFlash at={DROP} attack={0} decay={5} intensity={0.6} />
      {FLASHES.map((f) => (
        <PhotoFlash key={f} at={f} attack={0} decay={4} intensity={0.12} />
      ))}
    </AbsoluteFill>
  );
};

const OffSlab: React.FC<{ text: string; frame: number; fps: number; at: number }> = ({ text, frame, fps, at }) => {
  if (frame < at - 2) return null;
  const wipe = tween(frame, [at - 2, at + 4], [0, 1], ease.outExpo);
  const p = punch(frame, fps, at, 320, 12, 0.6);
  const scale = 1.35 - 0.35 * p;
  const sheen = tween(frame, [at + 10, at + 30], [-0.3, 1.3], ease.inOut);
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 - OFF_SLAB.w / 2,
        top: OFF_SLAB.y,
        width: OFF_SLAB.w,
        height: OFF_SLAB.h,
        transform: `scale(${scale}) skewX(-8deg)`,
        transformOrigin: '50% 50%',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: COLORS.white, transform: `scaleX(${wipe})`, transformOrigin: 'left', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 160,
            left: `${sheen * 100}%`,
            background: 'linear-gradient(90deg, rgba(212,255,30,0) 0%, rgba(212,255,30,0.55) 50%, rgba(212,255,30,0) 100%)',
            transform: 'skewX(-20deg)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONTS.display,
          fontSize: 210,
          lineHeight: 1,
          color: COLORS.black,
          letterSpacing: '0.04em',
          paddingTop: 8,
          opacity: wipe > 0.6 ? 1 : 0,
          transform: 'skewX(8deg)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Linhas radiais que convergem para o número no impacto e depois somem. */
const RadialLines: React.FC<{ frame: number; from: number }> = ({ frame, from }) => {
  const t = frame - from;
  if (t < -2) return null;
  const n = 40;
  const o = keys(frame, [from - 2, from + 2, from + 26, from + 60], [0, 0.9, 0.35, 0.18]);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: o }}>
      {new Array(n).fill(0).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + random(`rl-a${i}`) * 0.1;
        const speed = 0.6 + random(`rl-s${i}`) * 0.8;
        const r0 = 300 + ((random(`rl-r${i}`) * 900 + t * 40 * speed) % 900);
        const len = 80 + random(`rl-l${i}`) * 260;
        const cx = 540;
        const cy = 820;
        const accent = i % 7 === 0;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r0}
            y1={cy + Math.sin(a) * r0}
            x2={cx + Math.cos(a) * (r0 + len)}
            y2={cy + Math.sin(a) * (r0 + len)}
            stroke={accent ? COLORS.accent : COLORS.white}
            strokeWidth={accent ? 4 : 2}
            strokeOpacity={accent ? 0.9 : 0.4}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};
