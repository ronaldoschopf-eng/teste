import React from 'react';
import {COLORS} from '../config';

// Ícone provisório do logo: bola de vôlei.
export const LogoIcon: React.FC<{size?: number}> = ({size = 96}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill={COLORS.pink} />
    <circle cx="50" cy="50" r="30" fill="#FFFFFF" />
    <g fill="none" stroke={COLORS.deep} strokeWidth="4" strokeLinecap="round">
      <circle cx="50" cy="50" r="30" />
      <path d="M22 42 C 36 44 50 34 58 22" />
      <path d="M34 76 C 38 60 52 52 78 52" />
      <path d="M56 21 C 48 36 50 54 64 74" />
    </g>
  </svg>
);
