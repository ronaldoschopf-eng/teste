// Conteúdo de um "disparo" na Cena 02: ataque, bloqueio ou comemoração.
// Se houver foto real configurada, ela é a protagonista; senão, uma
// composição gráfica com silhuetas (sem fingir ser foto do evento).
import React from 'react';
import { Img, staticFile } from 'remotion';
import { ease, tween } from '../anim/motion';
import { Athlete, POSES, poseAt, type Pose } from './Athlete';
import { Ball } from './Ball';
import { COLORS } from '../config';

export type CaptureKind = 'ataque' | 'bloqueio' | 'comemoracao';

export const VIEW = { width: 920, height: 780 };

/** Momento do disparo dentro de cada captura (quadros locais da captura). */
export const CAPTURE_SHUTTER = 14;

type Props = {
  kind: CaptureKind;
  /** Quadro local da captura (0 = início). Congela a partir do disparo. */
  frame: number;
  photo: string | null;
};

const Backdrop: React.FC<{ tone?: number; net?: boolean }> = ({ tone = 1, net = true }) => (
  <svg width={VIEW.width} height={VIEW.height} style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <radialGradient id="cv-glow" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#9BA1A0" stopOpacity={0.7 * tone} />
        <stop offset="45%" stopColor="#2A2D30" stopOpacity={0.9} />
        <stop offset="100%" stopColor={COLORS.black} />
      </radialGradient>
      <pattern id="cv-mesh" width={16} height={16} patternUnits="userSpaceOnUse">
        <path d="M 16 0 L 0 0 0 16" fill="none" stroke={COLORS.white} strokeWidth={1.2} />
      </pattern>
    </defs>
    <rect width={VIEW.width} height={VIEW.height} fill="url(#cv-glow)" />
    {/* piso */}
    <rect y={600} width={VIEW.width} height={180} fill="#0D0E10" />
    {[-400, 0, 400, 800, 1200].map((x, i) => (
      <line key={i} x1={460 + (x - 460) * 0.25} y1={600} x2={x} y2={780} stroke={COLORS.white} strokeOpacity={0.18} strokeWidth={2} />
    ))}
    <line x1={0} y1={660} x2={VIEW.width} y2={660} stroke={COLORS.white} strokeOpacity={0.25} strokeWidth={3} />
    {net ? (
      <g>
        <rect y={420} width={VIEW.width} height={150} fill="url(#cv-mesh)" opacity={0.28} />
        <rect y={410} width={VIEW.width} height={12} fill={COLORS.white} opacity={0.9} />
        <rect x={40} y={300} width={8} height={300} fill={COLORS.white} opacity={0.35} />
      </g>
    ) : null}
  </svg>
);

const scene = (kind: CaptureKind, f: number) => {
  // Cada composição retorna atletas e bola para o quadro f.
  if (kind === 'ataque') {
    const track: [number, Pose][] = [[0, POSES.rise], [7, POSES.cocked], [CAPTURE_SHUTTER, POSES.contact]];
    const y = tween(f, [0, CAPTURE_SHUTTER], [560, 470], ease.outCubic);
    const pose = poseAt(f, track);
    const hand = { x: 430 + pose.fHand[0] * 0.78, y: y + pose.fHand[1] * 0.78 };
    const bp = tween(f, [0, CAPTURE_SHUTTER], [0, 1], (x) => x);
    const ball = { x: 900 - (900 - hand.x - 14) * bp, y: 40 + (hand.y - 34 - 40) * bp };
    return { athletes: [{ pose, x: 430, y, scale: 0.78, flip: false }], ball, target: { x: ball.x, y: ball.y + 30 } };
  }
  if (kind === 'bloqueio') {
    const rise = tween(f, [0, CAPTURE_SHUTTER], [0, 1], ease.outCubic);
    const pose = poseAt(f, [[0, POSES.stand], [CAPTURE_SHUTTER - 2, POSES.block]]);
    const y1 = 560 - rise * 110;
    const bp = tween(f, [0, CAPTURE_SHUTTER], [0, 1], (x) => x);
    const ball = { x: 980 - 470 * bp, y: 300 - 150 * bp };
    return {
      athletes: [
        { pose, x: 360, y: y1 + 16, scale: 0.72, flip: true },
        { pose, x: 520, y: y1, scale: 0.78, flip: false },
      ],
      ball,
      target: { x: 470, y: y1 - 330 },
    };
  }
  const pose = poseAt(f, [[0, POSES.stand], [CAPTURE_SHUTTER - 1, POSES.celebrate]]);
  const y = tween(f, [0, CAPTURE_SHUTTER], [500, 470], ease.outCubic);
  const mate = poseAt(f, [[2, POSES.stand], [CAPTURE_SHUTTER + 2, POSES.block]]);
  return {
    athletes: [
      { pose: mate, x: 660, y: 500, scale: 0.6, flip: true, dim: true },
      { pose, x: 420, y, scale: 0.86, flip: false },
    ],
    ball: null,
    target: { x: 450, y: y - 280 },
  };
};

/** Posição do alvo de foco (para os pontos de AF) — mesma lógica da cena. */
export const captureTarget = (kind: CaptureKind, frame: number) => scene(kind, Math.min(frame, CAPTURE_SHUTTER)).target;

export const CaptureView: React.FC<Props> = ({ kind, frame, photo }) => {
  const f = Math.min(frame, CAPTURE_SHUTTER);
  if (photo) {
    // Foto real: leve aproximação até o disparo, depois congelada.
    const z = tween(f, [0, CAPTURE_SHUTTER], [1.12, 1.02], ease.outCubic);
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: COLORS.black }}>
        <Img src={staticFile(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})` }} />
      </div>
    );
  }
  const s = scene(kind, f);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: COLORS.black }}>
      <Backdrop tone={kind === 'comemoracao' ? 1.3 : 1} net={kind !== 'comemoracao'} />
      {s.athletes.map((a, i) => (
        <Athlete
          key={i}
          pose={a.pose}
          x={a.x}
          y={a.y}
          scale={a.scale}
          flip={a.flip}
          rim={'dim' in a && a.dim ? 0.35 : 0.85}
          fill={'dim' in a && a.dim ? COLORS.graphite : COLORS.black}
        />
      ))}
      {s.ball ? <Ball x={s.ball.x} y={s.ball.y} r={30} rotation={f * 30} glow={0.5} /> : null}
    </div>
  );
};
