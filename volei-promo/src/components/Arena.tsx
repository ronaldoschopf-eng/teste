// Ambiente de arena: fundo profundo, fachos de luz do teto, névoa e o piso
// da quadra em perspectiva (linhas de quadra e rede).
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../config';

type Props = {
  /** 0–1: intensidade das luzes. */
  lights?: number;
  /** Deslocamento do piso (px) para dar sensação de movimento. */
  floorShift?: number;
  /** Mostra a rede. */
  net?: boolean;
  /** Altura (px) do horizonte. */
  horizon?: number;
  /** Cor do brilho principal atrás do atleta. */
  glow?: string;
  glowY?: number;
};

export const Spotlights: React.FC<{ intensity: number; glowY?: number; glow?: string }> = ({ intensity, glowY = 34, glow = 'rgba(232,236,226,0.55)' }) => (
  <AbsoluteFill style={{ opacity: intensity, pointerEvents: 'none' }}>
    {/* brilho central atrás do atleta */}
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 62% 30% at 50% ${glowY}%, ${glow} 0%, rgba(160,168,160,0.16) 45%, rgba(0,0,0,0) 75%)` }} />
    {/* fachos cônicos do teto */}
    {[-26, -9, 9, 26].map((a, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 540 - 180,
          top: -120,
          width: 360,
          height: 1700,
          transformOrigin: '50% 0%',
          transform: `rotate(${a}deg)`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 55%, rgba(255,255,255,0) 100%)',
          clipPath: 'polygon(44% 0, 56% 0, 100% 100%, 0 100%)',
          filter: 'blur(14px)',
        }}
      />
    ))}
  </AbsoluteFill>
);

export const CourtFloor: React.FC<{ horizon: number; shift?: number; opacity?: number; net?: boolean }> = ({ horizon, shift = 0, opacity = 1, net = false }) => {
  const W = 1080;
  const H = 1920;
  const vp = { x: 540, y: horizon - 420 };
  // Linhas laterais convergindo para o ponto de fuga.
  const rails = [-1500, -760, -120, 120, 760, 1500];
  // Linhas transversais em profundidade (espaçamento geométrico).
  const cross = new Array(9).fill(0).map((_, i) => {
    const t = ((i + (shift / 140)) % 9 + 9) % 9 / 9;
    return horizon + Math.pow(t, 2.2) * (H - horizon + 200);
  });
  return (
    <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.black} stopOpacity={0} />
          <stop offset="18%" stopColor="#0B0C0D" stopOpacity={1} />
          <stop offset="100%" stopColor="#141619" stopOpacity={1} />
        </linearGradient>
        <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.white} stopOpacity={0} />
          <stop offset="100%" stopColor={COLORS.white} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <rect x={0} y={horizon} width={W} height={H - horizon} fill="url(#floor)" />
      <g stroke="url(#lineFade)" strokeWidth={3}>
        {rails.map((bx, i) => {
          // reta do ponto de fuga até a base, cortada no horizonte
          const t = (horizon - vp.y) / (H + 200 - vp.y);
          const x0 = vp.x + (bx + 540 - vp.x) * t;
          return <line key={i} x1={x0} y1={horizon} x2={bx + 540} y2={H + 200} />;
        })}
        {cross.map((y, i) => (
          <line key={`c${i}`} x1={0} y1={y} x2={W} y2={y} strokeOpacity={0.55 * Math.min(1, (y - horizon) / 300)} />
        ))}
      </g>
      {net ? (
        <g>
          <rect x={-20} y={horizon - 190} width={W + 40} height={14} fill={COLORS.white} opacity={0.85} />
          <rect x={-20} y={horizon - 176} width={W + 40} height={120} fill="url(#netMesh)" opacity={0.35} />
          <defs>
            <pattern id="netMesh" width={18} height={18} patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke={COLORS.white} strokeWidth={1.4} />
            </pattern>
          </defs>
        </g>
      ) : null}
    </svg>
  );
};

export const Arena: React.FC<Props> = ({ lights = 1, floorShift = 0, net = false, horizon = 1380, glow, glowY }) => (
  <AbsoluteFill style={{ background: COLORS.black }}>
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #0A0B0C 0%, ${COLORS.black} 60%)` }} />
    <Spotlights intensity={lights} glow={glow} glowY={glowY} />
    <CourtFloor horizon={horizon} shift={floorShift} net={net} />
  </AbsoluteFill>
);
