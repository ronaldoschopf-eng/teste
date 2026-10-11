// Indicador de foco: grade de pontos de AF de uma câmera profissional.
// Os pontos próximos ao alvo acendem e acompanham o movimento do assunto.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS } from '../config';

type Props = {
  width: number;
  height: number;
  cols?: number;
  rows?: number;
  /** Posição do alvo (px dentro da área) em função do quadro. */
  target: (frame: number) => { x: number; y: number };
  /** Raio (px) de pontos ativos ao redor do alvo. */
  radius?: number;
  /** Quando true, os pontos ativos ficam na cor de destaque (foco travado). */
  locked?: (frame: number) => boolean;
  opacity?: number;
};

export const FocusIndicator: React.FC<Props> = ({ width, height, cols = 11, rows = 7, target, radius = 150, locked, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const t = target(frame);
  const isLocked = locked ? locked(frame) : false;
  const cw = width / (cols + 1);
  const rh = height / (rows + 1);
  const pts: React.ReactNode[] = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const px = c * cw;
      const py = r * rh;
      const d = Math.hypot(px - t.x, py - t.y);
      const active = d < radius;
      const s = active ? 26 : 14;
      pts.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: px - s / 2,
            top: py - s / 2,
            width: s,
            height: s,
            border: `${active ? 3 : 2}px solid ${active ? (isLocked ? COLORS.accent : COLORS.white) : 'rgba(246,247,242,0.22)'}`,
            background: active && isLocked ? 'rgba(212,255,30,0.18)' : 'transparent',
          }}
        />,
      );
    }
  }
  return <div style={{ position: 'absolute', inset: 0, opacity, pointerEvents: 'none' }}>{pts}</div>;
};
