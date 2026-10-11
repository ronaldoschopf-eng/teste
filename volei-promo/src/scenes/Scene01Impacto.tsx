// CENA 01 — O IMPACTO (0–3 s)
// Arena escura, disparos da arquibancada, atleta salta para o ataque e a
// câmera congela o instante do contato com a bola. Entra a manchete.
import React from 'react';
import { AbsoluteFill, random, useCurrentFrame } from 'remotion';
import { ease, keys, shake, tween } from '../anim/motion';
import { Arena } from '../components/Arena';
import { AutofocusFrame } from '../components/AutofocusFrame';
import { Athlete, POSES, handPosition, poseAt } from '../components/Athlete';
import { Ball } from '../components/Ball';
import { KineticText } from '../components/KineticText';
import { Particles } from '../components/Particles';
import { FlashBurst, PhotoFlash } from '../components/PhotoFlash';
import { SpeedLines } from '../components/SpeedLines';
import { COLORS, EFFECTS, SAFE, SCENES, SYNC, local } from '../config';
import { FONTS } from '../fonts';

const FREEZE = local(SYNC.freeze, 'impacto');
const IMPACT = local(SYNC.ballImpact, 'impacto');
const HEADLINE = local(SYNC.headline, 'impacto');
const END = SCENES.impacto.duration;

const ATHLETE = { x: 560, scale: 1.12, startY: 1780, apexY: 905 };
const POSE_TRACK = [
  [0, POSES.crouch],
  [9, POSES.rise],
  [23, POSES.cocked],
  [IMPACT - 1, POSES.contact],
] as [number, typeof POSES.crouch][];

const athleteY = (f: number) => tween(f, [0, IMPACT], [ATHLETE.startY, ATHLETE.apexY], ease.outCubic);

export const Scene01Impacto: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  // "Mundo" congela no disparo; só a câmera (push-in) e os gráficos seguem.
  const t = Math.min(frame, FREEZE);
  const frozen = frame >= FREEZE;

  const pose = poseAt(t, POSE_TRACK);
  const ay = athleteY(t);
  const hand = handPosition(POSES.contact, ATHLETE.x, athleteY(IMPACT), ATHLETE.scale);
  const contact = { x: hand.x + 18, y: hand.y - 44 };

  // Bola: parábola desde o levantamento até a mão; depois do contato, dispara.
  const ballAt = (f: number) => {
    if (f <= IMPACT) {
      const p = tween(f, [4, IMPACT], [0, 1], (x) => x);
      return { x: -60 + (contact.x + 60) * p, y: contact.y - 520 * 4 * p * (1 - p) * 0.55 + (1 - p) * 120 };
    }
    const p = f - IMPACT;
    return { x: contact.x + p * 46, y: contact.y + p * 30 };
  };
  const ball = ballAt(t);
  const ballPrev = ballAt(Math.max(0, t - 4));

  // Luzes acendem e piscam com os flashes da arquibancada.
  const flick = SYNC.arenaFlashes.reduce((acc, f) => acc + Math.max(0, 1 - Math.abs(frame - f) / 2) * 0.35, 0);
  const lights = tween(frame, [0, 14], [0, 1], ease.outCubic) + flick;

  // Câmera: tremor no contato e push-in lento depois do congelamento.
  const sk = shake(frame, IMPACT, 10, 6, 'impact');
  const push = frozen ? tween(frame, [FREEZE, END], [1, 1.06], ease.outCubic) : 1;
  const exit = tween(frame, [END - 7, END], [0, 1], ease.inCubic);
  const worldScale = push + exit * 0.18;

  // Pós-congelamento: leve dessaturação e contraste (foto "revelada").
  const still = tween(frame, [FREEZE, FREEZE + 8], [0, 1]);

  const ghostFrames = [IMPACT - 12, IMPACT - 6];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          transform: `translate(${sk.x}px, ${sk.y}px) scale(${worldScale})`,
          transformOrigin: '52% 30%',
          filter: `saturate(${1 - still * 0.6}) contrast(${1 + still * 0.12})`,
        }}
      >
        <Arena lights={Math.min(1.2, lights)} horizon={1420} glowY={26} />
        <Particles count={EFFECTS.particles} freezeAt={FREEZE} seed="s1" opacity={0.65} />

        {/* disparos de flash na arquibancada */}
        {SYNC.arenaFlashes.map((f, i) => (
          <FlashBurst key={f} at={f} x={120 + random(`af-x${i}`) * 840} y={180 + random(`af-y${i}`) * 520} size={180 + random(`af-s${i}`) * 160} />
        ))}

        {/* linhas de velocidade do salto: descem enquanto o atleta sobe e param no congelamento */}
        <SpeedLines
          count={EFFECTS.speedLines}
          angle={90}
          speed={(f) => (f < FREEZE ? keys(f, [0, 10, IMPACT], [70, 52, 26]) : 0)}
          area={{ x: 180, y: 0, width: 760, height: 1500 }}
          opacity={frozen ? 0.28 : 0.55}
          seed="s1-speed"
          minLength={160}
          maxLength={560}
        />

        {/* rastro: múltipla exposição do salto, revelada no congelamento */}
        {ghostFrames.map((gf, i) => (
          <Athlete
            key={gf}
            pose={poseAt(gf, POSE_TRACK)}
            x={ATHLETE.x - (2 - i) * 34}
            y={athleteY(gf)}
            scale={ATHLETE.scale}
            ghost
            ghostColor={frozen ? COLORS.accent : COLORS.white}
            opacity={frozen ? still * (0.1 + i * 0.06) : frame > gf ? 0.05 : 0}
          />
        ))}

        <Athlete pose={pose} x={ATHLETE.x} y={ay} scale={ATHLETE.scale} rim={0.9 * Math.min(1, lights)} />
        <Ball x={ball.x} y={ball.y} r={40} rotation={t * 24} trailFrom={ballPrev} glow={frozen ? 1 : 0.6} />

        {/* autofoco busca a bola e trava no contato */}
        <AutofocusFrame x={contact.x - 110} y={contact.y - 110} width={220} height={220} start={IMPACT - 12} lockAt={FREEZE} corner={40} stroke={5} />
      </AbsoluteFill>

      {/* moldura de "foto capturada" + dados de exposição */}
      <FrozenFrame frame={frame} from={FREEZE} />

      {/* rastros gráficos atrás da manchete */}
      <MotionSlashes frame={frame} from={HEADLINE - 2} />

      <KineticText
        start={HEADLINE}
        stagger={4}
        duration={13}
        lineHeight={0.9}
        style={{ position: 'absolute', left: SAFE.side, top: 1160 }}
        lines={lines.map((text, i) => ({
          text,
          size: 148,
          color: i === lines.length - 1 ? COLORS.accent : COLORS.white,
        }))}
      />

      {/* flash do disparo que congela o instante */}
      <PhotoFlash at={FREEZE} attack={0} decay={6} intensity={0.95} origin={{ x: 70, y: 22 }} />
      <PhotoFlash at={IMPACT} attack={0} decay={2} intensity={0.35} />
    </AbsoluteFill>
  );
};

const FrozenFrame: React.FC<{ frame: number; from: number }> = ({ frame, from }) => {
  if (frame < from) return null;
  const p = tween(frame, [from, from + 10], [0, 1], ease.outExpo);
  const inset = 44 + (1 - p) * 40;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: p }}>
      <div style={{ position: 'absolute', inset, border: `2px solid rgba(246,247,242,0.35)` }} />
      <div
        style={{
          position: 'absolute',
          left: SAFE.side,
          top: SAFE.top + 10,
          fontFamily: FONTS.mono,
          fontSize: 26,
          letterSpacing: '0.08em',
          color: COLORS.white,
          opacity: 0.85,
          display: 'flex',
          gap: 28,
        }}
      >
        <span style={{ color: COLORS.accent }}>● CAPTURADO</span>
        <span>1/4000s</span>
        <span>f/2.8</span>
        <span>ISO 3200</span>
      </div>
    </AbsoluteFill>
  );
};

const MotionSlashes: React.FC<{ frame: number; from: number }> = ({ frame, from }) => {
  if (frame < from) return null;
  const bars = [
    { y: 1128, w: 540, d: 0, h: 8, c: COLORS.accent },
    { y: 1146, w: 300, d: 3, h: 3, c: COLORS.white },
    { y: 1560, w: 760, d: 6, h: 3, c: 'rgba(246,247,242,0.5)' },
  ];
  return (
    <>
      {bars.map((b, i) => {
        const p = tween(frame, [from + b.d, from + b.d + 12], [0, 1], ease.outExpo);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: SAFE.side,
              top: b.y,
              width: b.w,
              height: b.h,
              background: b.c,
              transform: `scaleX(${p}) skewX(-24deg)`,
              transformOrigin: 'left',
            }}
          />
        );
      })}
    </>
  );
};
