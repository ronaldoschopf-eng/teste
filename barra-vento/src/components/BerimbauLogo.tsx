import React from 'react';
import {COLORS} from '../config';

// Ícone simples de berimbau: verga (arco), arame, cabaça e baqueta.
export const BerimbauIcon: React.FC<{size?: number}> = ({size = 96}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill={COLORS.darkGreen} />
    <path d="M38 14 C 70 34 70 66 38 86" fill="none" stroke={COLORS.lime} strokeWidth="6" strokeLinecap="round" />
    <line x1="38" y1="14" x2="38" y2="86" stroke="#FFFFFF" strokeWidth="2.5" />
    <circle cx="44" cy="70" r="11" fill={COLORS.yellow} />
    <line x1="34" y1="62" x2="44" y2="62" stroke={COLORS.darkGreen} strokeWidth="3" />
    <line x1="22" y1="30" x2="34" y2="46" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
