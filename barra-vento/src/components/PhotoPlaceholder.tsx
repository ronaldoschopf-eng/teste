import React from 'react';
import {COLORS} from '../config';

const GRADIENTS = [
  [COLORS.green, COLORS.lime],
  [COLORS.darkGreen, COLORS.yellow],
  [COLORS.lime, COLORS.yellow],
  [COLORS.green, COLORS.yellow],
  [COLORS.darkGreen, COLORS.lime],
];

// Silhuetas simples de capoeiristas (ginga, chute alto, aú).
const POSES = [
  // ginga
  'M100 52 a16 16 0 1 1 0.1 0 Z M92 76 L80 128 L54 170 L64 176 L92 136 L104 132 L132 176 L144 170 L118 126 L110 78 Z M86 84 L54 110 L60 118 L92 98 Z M112 84 L146 70 L150 80 L116 98 Z',
  // chute (meia-lua)
  'M74 60 a16 16 0 1 1 0.1 0 Z M70 84 L82 132 L70 178 L82 180 L98 134 L104 120 L160 70 L152 60 L100 100 L86 80 Z M68 90 L40 120 L48 126 L78 104 Z',
  // aú (estrela)
  'M100 150 a16 16 0 1 1 0.1 0 Z M92 128 L56 104 L28 40 L40 36 L66 92 L100 110 L134 92 L160 36 L172 40 L144 104 L108 128 Z M88 132 L70 150 L76 158 L96 140 Z M112 132 L130 150 L124 158 L104 140 Z',
];

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
      </defs>
      <rect width="200" height="250" fill={`url(#${id})`} />
      <circle cx={index % 2 ? 160 : 44} cy="46" r="26" fill="#FFFFFF" opacity="0.28" />
      <ellipse cx="100" cy="226" rx="90" ry="14" fill="#000" opacity="0.12" />
      <g transform="translate(0 30)" fill={COLORS.darkGreen} opacity="0.85">
        <path d={pose} />
      </g>
    </svg>
  );
};
