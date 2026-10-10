import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {HALFTONE, VIDEO} from '../config';

type Props = {
  // Camada de densidade em tons de preto: quanto mais escuro, maior o ponto.
  children: React.ReactNode;
  // Cor (ou gradiente CSS) dos pontos.
  ink: string;
  // 'light' = pontos coloridos sobre fundo claro; 'dark' = pontos luminosos
  // sobre fundo escuro.
  mode: 'light' | 'dark';
  pitch?: number; // distância entre pontos (px)
  angle?: number; // inclinação da retícula (graus)
  opacity?: number;
};

// Retícula de meio-tom de verdade: a densidade passa por uma grade de pontos
// (radial-gradient) e um limiar de contraste, então o tamanho de cada ponto
// acompanha a intensidade, como na impressão.
export const Halftone: React.FC<Props> = ({children, ink, mode, pitch = HALFTONE.pitch, angle = HALFTONE.angle, opacity = 1}) => {
  const frame = useCurrentFrame();
  const drift = (frame * HALFTONE.drift) % pitch;
  const side = Math.ceil(Math.hypot(VIDEO.width, VIDEO.height)) + pitch * 2;

  return (
    <AbsoluteFill style={{isolation: 'isolate', mixBlendMode: mode === 'light' ? 'multiply' : 'screen', opacity}}>
      <AbsoluteFill style={{background: '#FFFFFF', filter: `contrast(${HALFTONE.contrast})${mode === 'dark' ? ' invert(1)' : ''}`}}>
        {children}
        <div
          style={{
            position: 'absolute',
            left: (VIDEO.width - side) / 2,
            top: (VIDEO.height - side) / 2,
            width: side,
            height: side,
            transform: `rotate(${angle}deg)`,
            backgroundImage: `radial-gradient(circle at 50% 50%, #000 0px, #FFF ${pitch * 0.72}px)`,
            backgroundSize: `${pitch}px ${pitch}px`,
            backgroundPosition: `${drift}px ${drift}px`,
            mixBlendMode: 'screen',
          }}
        />
      </AbsoluteFill>
      {/* Pinta os pontos: 'lighten' troca o preto pela cor; 'multiply' pinta o branco. */}
      <AbsoluteFill style={{background: ink, mixBlendMode: mode === 'light' ? 'lighten' : 'multiply'}} />
    </AbsoluteFill>
  );
};

// Textura de retícula fina sobre o quadro inteiro (inclui texto e fotos).
export const ScreenTone: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      backgroundImage: `radial-gradient(circle, rgba(42, 7, 23, 0.9) 0px, rgba(42, 7, 23, 0.9) 1.3px, transparent 1.9px)`,
      backgroundSize: `${HALFTONE.tonePitch}px ${HALFTONE.tonePitch}px`,
      mixBlendMode: 'soft-light',
      opacity: HALFTONE.toneOpacity,
    }}
  />
);

// Padrão de pontos para sombras "pop art" (offset atrás de boxes e cards).
export const dotPattern = (color: string, pitch = 12, r = 3.2) => ({
  backgroundImage: `radial-gradient(circle, ${color} 0px, ${color} ${r}px, transparent ${r + 0.8}px)`,
  backgroundSize: `${pitch}px ${pitch}px`,
});
