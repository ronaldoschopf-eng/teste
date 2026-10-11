// Moldura de autofoco: quatro cantos que convergem sobre o alvo, hesitam
// (busca de foco) e travam — momento em que mudam para a cor de destaque.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, punch, tween } from '../anim/motion';
import { COLORS } from '../config';

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Quadro em que a moldura aparece. */
  start: number;
  /** Quadro em que o foco trava. */
  lockAt: number;
  corner?: number;
  stroke?: number;
  /** Mostra a cruz central. */
  cross?: boolean;
  /** Cor depois de travar. */
  lockColor?: string;
  /** Quadro em que a moldura some (opcional). */
  endAt?: number;
};

export const AutofocusFrame: React.FC<Props> = ({
  x,
  y,
  width,
  height,
  start,
  lockAt,
  corner = 46,
  stroke = 5,
  cross = true,
  lockColor = COLORS.accent,
  endAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;

  const enter = tween(frame, [start, lockAt], [0, 1], ease.outExpo);
  // Busca de foco: a moldura "respira" antes de travar.
  const hunt = frame < lockAt ? Math.sin((frame - start) * 1.3) * 0.05 * (1 - enter) : 0;
  const lock = punch(frame, fps, lockAt, 400, 16, 0.5);
  const scale = 1.55 - 0.55 * enter + hunt - (frame >= lockAt ? (1 - lock) * -0.06 : 0);
  const locked = frame >= lockAt;
  const color = locked ? lockColor : COLORS.white;
  const out = endAt === undefined ? 1 : tween(frame, [endAt, endAt + 6], [1, 0]);
  const opacity = Math.min(1, (frame - start) / 3) * out * (locked ? 1 : 0.75);
  const c = corner;

  const cornerStyle = (pos: React.CSSProperties, borders: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: c,
    height: c,
    borderColor: color,
    borderStyle: 'solid',
    borderWidth: 0,
    ...pos,
    ...borders,
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transform: `scale(${scale})`,
        opacity,
        pointerEvents: 'none',
        filter: locked ? `drop-shadow(0 0 10px ${lockColor})` : undefined,
      }}
    >
      <div style={cornerStyle({ left: 0, top: 0 }, { borderTopWidth: stroke, borderLeftWidth: stroke })} />
      <div style={cornerStyle({ right: 0, top: 0 }, { borderTopWidth: stroke, borderRightWidth: stroke })} />
      <div style={cornerStyle({ left: 0, bottom: 0 }, { borderBottomWidth: stroke, borderLeftWidth: stroke })} />
      <div style={cornerStyle({ right: 0, bottom: 0 }, { borderBottomWidth: stroke, borderRightWidth: stroke })} />
      {cross ? (
        <>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 34, height: stroke - 1, marginLeft: -17, marginTop: -(stroke - 1) / 2, background: color }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', height: 34, width: stroke - 1, marginTop: -17, marginLeft: -(stroke - 1) / 2, background: color }} />
        </>
      ) : null}
    </div>
  );
};
