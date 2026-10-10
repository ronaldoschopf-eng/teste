import React from 'react';
import {COLORS} from '../config';

const GRADIENTS = [
  [COLORS.pink, COLORS.orange],
  [COLORS.deep, COLORS.pink],
  [COLORS.orange, COLORS.orangeSoft],
  [COLORS.pinkSoft, COLORS.orange],
  [COLORS.pink, COLORS.pinkSoft],
];

type Pose = {
  head: [number, number];
  limbs: string[]; // polilinhas "x,y x,y ..." (tronco, braços, pernas)
  ball: [number, number];
  net?: number; // x da rede (vista lateral)
};

// Jogadas de vôlei em silhueta (viewBox 200 × 250, chão em y ≈ 228).
const POSES: Pose[] = [
  // cortada: salto, braço de ataque no alto, bola acima da mão
  {
    head: [92, 70],
    limbs: ['94,84 86,140', '97,94 116,72 130,50', '91,94 74,104 66,122', '86,140 102,168 90,196', '86,140 76,170 68,198'],
    ball: [142, 36],
    net: 172,
  },
  // bloqueio: braços esticados para cima, junto à rede
  {
    head: [88, 80],
    limbs: ['88,94 88,150', '85,100 80,62 78,30', '91,100 98,62 102,30', '88,150 82,190 80,226', '88,150 96,190 98,226'],
    ball: [118, 24],
    net: 128,
  },
  // levantamento: mãos acima da testa, bola logo acima
  {
    head: [100, 82],
    limbs: ['100,96 100,152', '96,102 82,86 90,64', '104,102 118,86 110,64', '100,152 88,188 90,226', '100,152 112,188 114,226'],
    ball: [100, 46],
  },
  // manchete (defesa): base baixa, braços unidos à frente
  {
    head: [80, 110],
    limbs: ['88,124 70,168', '88,126 132,152', '86,132 130,158', '70,168 96,196 92,228', '70,168 56,200 42,228'],
    ball: [146, 140],
  },
  // saque: bola lançada, braço armado atrás da cabeça
  {
    head: [100, 78],
    limbs: ['100,92 96,150', '102,98 82,76 94,56', '100,98 122,78 132,60', '96,150 108,190 112,226', '96,150 84,192 76,226'],
    ball: [126, 30],
  },
];

const Ball: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r="14" fill="#FFFFFF" stroke={COLORS.deep} strokeWidth="3" />
    <path d="M-13 -4 C -4 -2 4 -8 8 -11 M-6 12 C -4 2 4 -2 13 0 M2 -14 C -2 -4 0 6 6 12" fill="none" stroke={COLORS.deep} strokeWidth="2.5" />
  </g>
);

export const PhotoPlaceholder: React.FC<{index: number}> = ({index}) => {
  const [a, b] = GRADIENTS[index % GRADIENTS.length];
  const pose = POSES[index % POSES.length];
  const id = `ph-${index}`;
  return (
    <svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" style={{width: '100%', height: '100%', display: 'block'}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2={index % 2 ? 1 : 0.3} y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <pattern id={`${id}-net`} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0 L8 8 M8 0 L0 8" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.7" />
        </pattern>
      </defs>
      <rect width="200" height="250" fill={`url(#${id})`} />
      {/* quadra */}
      <rect y="228" width="200" height="22" fill={COLORS.deep} opacity="0.18" />
      <line x1="0" y1="228" x2="200" y2="228" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
      {pose.net ? (
        <g>
          <rect x={pose.net - 1.5} y="96" width="3" height="132" fill={COLORS.deep} opacity="0.6" />
          <rect x={pose.net - 7} y="104" width="14" height="70" fill={`url(#${id}-net)`} />
          <rect x={pose.net - 8} y="100" width="16" height="6" fill="#FFFFFF" opacity="0.9" />
        </g>
      ) : null}
      <ellipse cx="96" cy="230" rx="44" ry="6" fill="#000" opacity="0.12" />
      <g stroke={COLORS.deep} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
        {pose.limbs.map((l, i) => (
          <polyline key={i} points={l} />
        ))}
      </g>
      <circle cx={pose.head[0]} cy={pose.head[1]} r="13" fill={COLORS.deep} opacity="0.9" />
      <Ball x={pose.ball[0]} y={pose.ball[1]} />
    </svg>
  );
};
