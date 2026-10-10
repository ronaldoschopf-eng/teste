import React from 'react';
import {useCurrentFrame} from 'remotion';

// Renderiza os filhos só no intervalo [from, to). Diferente de <Sequence>,
// não desloca o frame: os tempos do config.ts continuam absolutos.
export const Show: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  return frame >= from && frame < to ? <>{children}</> : null;
};
