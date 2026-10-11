// Texto cinético: cada linha sobe de dentro de uma máscara, com pequena
// escala e desaceleração. As linhas entram em cascata (stagger).
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, punch, tween } from '../anim/motion';
import { COLORS } from '../config';
import { FONTS } from '../fonts';

export type KineticLine = {
  text: string;
  size: number;
  color?: string;
  font?: string;
  weight?: number;
  letterSpacing?: string;
  /** Faixa de destaque atrás da linha (cor de fundo). */
  highlight?: string;
};

type Props = {
  lines: KineticLine[];
  /** Quadro em que a primeira linha começa a entrar. */
  start: number;
  stagger?: number;
  /** Duração da subida de cada linha. */
  duration?: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
  /** Direção de entrada: 1 = de baixo para cima, -1 = de cima para baixo. */
  direction?: 1 | -1;
  style?: React.CSSProperties;
  /** Quadro opcional em que o bloco sai (sobe e some). */
  exitAt?: number;
};

export const KineticText: React.FC<Props> = ({
  lines,
  start,
  stagger = 4,
  duration = 14,
  align = 'left',
  lineHeight = 0.92,
  direction = 1,
  style,
  exitAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', ...style }}>
      {lines.map((line, i) => {
        const s = start + i * stagger;
        const p = tween(frame, [s, s + duration], [0, 1], ease.outExpo);
        const pop = punch(frame, fps, s, 220, 14, 0.6);
        const scale = 1.12 - 0.12 * pop;
        const exitP = exitAt === undefined ? 0 : tween(frame, [exitAt + i * 2, exitAt + i * 2 + 10], [0, 1], ease.inCubic);
        const y = (1 - p) * 105 * direction - exitP * 110;
        // Leve inclinação enquanto a linha está em alta velocidade.
        const skew = (1 - p) * -8 * direction;
        const hl = line.highlight ? tween(frame, [s + 2, s + duration], [0, 1], ease.outExpo) : 0;
        return (
          /* Folga interna para acentos (Ã, Ó) não serem cortados pela máscara;
             a margem negativa mantém o entrelinhamento justo. */
          <div
            key={i}
            style={{
              overflow: 'hidden',
              position: 'relative',
              lineHeight,
              paddingTop: line.size * 0.16,
              marginTop: i === 0 ? 0 : -line.size * 0.12,
              paddingBottom: line.size * 0.04,
            }}
          >
            {line.highlight ? (
              <div
                style={{
                  position: 'absolute',
                  left: -line.size * 0.08,
                  right: -line.size * 0.08,
                  top: line.size * 0.2,
                  bottom: line.size * 0.04,
                  background: line.highlight,
                  transform: `scaleX(${hl})`,
                  transformOrigin: align === 'right' ? 'right' : 'left',
                }}
              />
            ) : null}
            <div
              style={{
                position: 'relative',
                fontFamily: line.font ?? FONTS.display,
                fontWeight: line.weight ?? 400,
                fontSize: line.size,
                color: line.color ?? COLORS.white,
                letterSpacing: line.letterSpacing ?? '0.005em',
                // o espaçamento entra depois da última letra; compensa no centro
                paddingLeft: align === 'center' ? (line.letterSpacing ?? '0') : 0,
                whiteSpace: 'nowrap',
                transform: `translateY(${y}%) scale(${scale}) skewY(${skew}deg)`,
                transformOrigin: align === 'center' ? '50% 100%' : align === 'right' ? '100% 100%' : '0% 100%',
                opacity: Math.min(1, p * 3) * (1 - exitP),
              }}
            >
              {line.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
