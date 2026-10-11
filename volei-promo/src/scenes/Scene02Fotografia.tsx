// CENA 02 — A FOTOGRAFIA (3–6 s)
// Visor de câmera profissional: pontos de AF acompanham o lance, o foco
// trava e o obturador dispara três vezes (ataque, bloqueio, comemoração).
// Cada disparo vira uma miniatura na "tira de contato" abaixo do visor.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ease, tween } from '../anim/motion';
import { AutofocusFrame } from '../components/AutofocusFrame';
import { CAPTURE_SHUTTER, CaptureView, VIEW, captureTarget, type CaptureKind } from '../components/CaptureView';
import { FocusIndicator } from '../components/FocusIndicator';
import { KineticText } from '../components/KineticText';
import { Particles } from '../components/Particles';
import { SpeedLines } from '../components/SpeedLines';
import { COLORS, SAFE, SCENES, SYNC, local, type Media } from '../config';
import { FONTS } from '../fonts';

const END = SCENES.fotografia.duration;
const VF = { x: 80, y: 630, ...VIEW }; // posição do visor na tela
const KINDS: CaptureKind[] = ['ataque', 'bloqueio', 'comemoracao'];
const SHUTTERS = SYNC.shutters.map((s) => local(s, 'fotografia'));
const STARTS = SHUTTERS.map((s) => s - CAPTURE_SHUTTER);
const PAN = 6; // duração do chicote entre capturas
const THUMB = { w: 188, h: Math.round((188 * VIEW.height) / VIEW.width), gap: 26, y: 1428 };

export const Scene02Fotografia: React.FC<{ lines: string[]; fotos: Media['fotos'] }> = ({ lines, fotos }) => {
  const frame = useCurrentFrame();

  // Captura ativa e deslocamento do chicote (whip pan) entre elas.
  const panOffset = (i: number) => {
    let x = 0;
    if (i > 0) x += tween(frame, [STARTS[i] - PAN / 2, STARTS[i] + PAN / 2], [VIEW.width, 0], ease.inOut);
    if (i < KINDS.length - 1) x -= tween(frame, [STARTS[i + 1] - PAN / 2, STARTS[i + 1] + PAN / 2], [0, VIEW.width], ease.inOut);
    return x;
  };
  const active = STARTS.reduce((acc, s, i) => (frame >= s ? i : acc), 0);
  const panning = STARTS.slice(1).some((s) => Math.abs(frame - s) < PAN / 2 + 1);

  // A tipografia "acompanha" os chicotes com um leve recuo lateral.
  const textNudge = STARTS.slice(1).reduce((acc, s) => {
    const t = tween(frame, [s - PAN / 2, s + 10], [0, 1], (x) => x);
    return acc - Math.sin(t * Math.PI) * 26;
  }, 0);

  // Entrada do visor (logo após o flash de transição) e saída por zoom.
  const enter = tween(frame, [0, 12], [0, 1], ease.outExpo);
  const exit = tween(frame, [END - 8, END], [0, 1], ease.inCubic);
  const vfScale = 1.08 - 0.08 * enter + exit * 0.22;

  const counter = SHUTTERS.filter((s) => frame >= s).length;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 50% at 50% 55%, ${COLORS.graphite} 0%, ${COLORS.black} 70%)` }} />
      <Particles count={18} seed="s2" opacity={0.35} speed={0.6} accentRatio={0} />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${vfScale})`, transformOrigin: `${VF.x + VF.width / 2}px ${VF.y + VF.height / 2}px` }}>
        {/* VISOR */}
        <div style={{ position: 'absolute', left: VF.x, top: VF.y, width: VF.width, height: VF.height, overflow: 'hidden', background: COLORS.black }}>
          {KINDS.map((k, i) => {
            const x = panOffset(i);
            if (Math.abs(x) >= VIEW.width) return null;
            return (
              <div key={k} style={{ position: 'absolute', inset: 0, transform: `translateX(${x}px)` }}>
                <CaptureView kind={k} frame={frame - STARTS[i]} photo={fotos[k]} />
              </div>
            );
          })}
          {panning ? <SpeedLines count={22} angle={0} speed={-90} area={{ x: 0, y: 0, width: VIEW.width, height: VIEW.height }} opacity={0.5} seed="pan" accentRatio={0.2} /> : null}

          {/* pontos de AF acompanhando o assunto */}
          <FocusIndicator
            width={VIEW.width}
            height={VIEW.height}
            target={(f) => captureTarget(KINDS[active], f - STARTS[active])}
            locked={(f) => SHUTTERS.some((s) => f >= s - 4 && f <= s + 8)}
            opacity={0.85}
            radius={140}
          />
          {KINDS.map((k, i) => {
            const t = captureTarget(k, CAPTURE_SHUTTER);
            return (
              <AutofocusFrame
                key={k}
                x={t.x - 120}
                y={t.y - 120}
                width={240}
                height={240}
                start={STARTS[i] + 2}
                lockAt={SHUTTERS[i] - 3}
                endAt={SHUTTERS[i] + 7}
                corner={38}
                stroke={5}
                cross={false}
              />
            );
          })}

          {/* espelho/obturador: escurece 1 quadro e o flash revela a captura */}
          {SHUTTERS.map((s) => {
            const black = frame === s ? 0.92 : 0;
            const white = tween(frame, [s + 1, s + 6], [0.75, 0], ease.outCubic) * (frame > s ? 1 : 0);
            return (
              <React.Fragment key={s}>
                {black > 0 ? <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: black }} /> : null}
                {white > 0 ? <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: white }} /> : null}
              </React.Fragment>
            );
          })}

          <ViewfinderHud counter={counter} frame={frame} />
        </div>

        {/* marcas de enquadramento fora do visor */}
        <FrameMarks />
      </div>

      {/* tira de contato */}
      <ContactStrip frame={frame} fotos={fotos} enter={enter} />

      <div style={{ position: 'absolute', left: SAFE.side, top: 262, transform: `translateX(${textNudge}px)` }}>
        <KineticText
          start={2}
          stagger={SHUTTERS[1] - SHUTTERS[0]}
          duration={12}
          lineHeight={0.9}
          lines={lines.map((text, i) => ({ text, size: 100, color: i === lines.length - 1 ? COLORS.accent : COLORS.white }))}
        />
      </div>
    </AbsoluteFill>
  );
};

const ViewfinderHud: React.FC<{ counter: number; frame: number }> = ({ counter, frame }) => {
  const mono: React.CSSProperties = { fontFamily: FONTS.mono, fontSize: 24, letterSpacing: '0.06em', color: COLORS.white };
  const burst = [0, 1, 2].map((i) => i < counter);
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 64, background: 'linear-gradient(180deg, rgba(0,0,0,0.75), rgba(0,0,0,0))' }} />
      <div style={{ ...mono, position: 'absolute', left: 28, top: 20, display: 'flex', gap: 24, alignItems: 'center' }}>
        <ShutterIcon />
        <span style={{ color: COLORS.accent }}>AF-C</span>
        <span style={{ opacity: 0.8 }}>RAW</span>
        <span style={{ opacity: blink ? 0.9 : 0.4 }}>● HI-SPEED</span>
      </div>
      <div style={{ ...mono, position: 'absolute', right: 28, top: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        {burst.map((on, i) => (
          <div key={i} style={{ width: 14, height: 26, background: on ? COLORS.accent : 'rgba(246,247,242,0.25)' }} />
        ))}
        <span style={{ marginLeft: 8 }}>{String(counter).padStart(3, '0')}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, background: 'linear-gradient(0deg, rgba(0,0,0,0.8), rgba(0,0,0,0))' }} />
      <div style={{ ...mono, position: 'absolute', left: 28, bottom: 18, display: 'flex', gap: 30 }}>
        <span>1/4000</span>
        <span>F2.8</span>
        <span>ISO 3200</span>
      </div>
      {/* escala de exposição */}
      <div style={{ position: 'absolute', right: 28, bottom: 26, width: 230, height: 20 }}>
        {new Array(9).fill(0).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: i * 28, bottom: 0, width: 3, height: i % 4 === 0 ? 18 : 10, background: 'rgba(246,247,242,0.7)' }} />
        ))}
        <div style={{ position: 'absolute', left: 4 * 28 - 6, top: -12, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `9px solid ${COLORS.accent}` }} />
      </div>
    </>
  );
};

const ShutterIcon: React.FC = () => (
  <svg width={30} height={30} viewBox="-15 -15 30 30">
    <circle r={13} fill="none" stroke={COLORS.white} strokeWidth={2} />
    {[0, 60, 120, 180, 240, 300].map((a) => (
      <line key={a} x1={0} y1={-13} x2={7} y2={-2} stroke={COLORS.white} strokeWidth={1.8} transform={`rotate(${a})`} />
    ))}
  </svg>
);

const FrameMarks: React.FC = () => {
  const c = 34;
  const w = 4;
  const pad = 18;
  const corners = [
    { left: VF.x - pad, top: VF.y - pad, bt: true, bl: true },
    { left: VF.x + VF.width + pad - c, top: VF.y - pad, bt: true, br: true },
    { left: VF.x - pad, top: VF.y + VF.height + pad - c, bb: true, bl: true },
    { left: VF.x + VF.width + pad - c, top: VF.y + VF.height + pad - c, bb: true, br: true },
  ];
  return (
    <>
      {corners.map((k, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: k.left,
            top: k.top,
            width: c,
            height: c,
            borderStyle: 'solid',
            borderColor: COLORS.white,
            borderTopWidth: k.bt ? w : 0,
            borderBottomWidth: k.bb ? w : 0,
            borderLeftWidth: k.bl ? w : 0,
            borderRightWidth: k.br ? w : 0,
          }}
        />
      ))}
    </>
  );
};

const ContactStrip: React.FC<{ frame: number; fotos: Media['fotos']; enter: number }> = ({ frame, fotos, enter }) => {
  const total = KINDS.length * THUMB.w + (KINDS.length - 1) * THUMB.gap;
  const x0 = (1080 - total) / 2;
  const target = (i: number) => ({ x: x0 + i * (THUMB.w + THUMB.gap), y: THUMB.y });
  const k = THUMB.w / VIEW.width;
  return (
    <>
      {KINDS.map((kind, i) => {
        const t = target(i);
        return (
          <div
            key={`slot-${kind}`}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              width: THUMB.w,
              height: THUMB.h,
              border: '2px solid rgba(246,247,242,0.22)',
              opacity: enter,
            }}
          >
            <span style={{ position: 'absolute', left: 8, top: 6, fontFamily: FONTS.mono, fontSize: 18, color: 'rgba(246,247,242,0.45)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        );
      })}
      {KINDS.map((kind, i) => {
        const s = SHUTTERS[i];
        if (frame < s + 2) return null;
        const p = tween(frame, [s + 2, s + 14], [0, 1], ease.outExpo);
        const t = target(i);
        const x = VF.x + (t.x - VF.x) * p;
        const y = VF.y + (t.y - VF.y) * p;
        const scale = 1 + (k - 1) * p;
        const border = 16; // moldura branca de "cópia"
        return (
          <div
            key={`thumb-${kind}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: VIEW.width,
              height: VIEW.height,
              transform: `scale(${scale}) rotate(${(1 - p) * -3}deg)`,
              transformOrigin: '0 0',
              boxShadow: `0 0 0 ${border}px ${COLORS.white}, 0 30px 80px rgba(0,0,0,0.6)`,
              overflow: 'hidden',
              opacity: tween(frame, [s + 2, s + 4], [0, 1]),
            }}
          >
            <CaptureView kind={kind} frame={CAPTURE_SHUTTER} photo={fotos[kind]} />
          </div>
        );
      })}
    </>
  );
};
