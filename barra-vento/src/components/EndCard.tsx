import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, SAFE, TEXT, TIMING} from '../config';
import {LOGO_SRC} from '../assets';
import {FONT_FAMILY} from '../fonts';
import {LogoIcon} from './LogoIcon';
import {BlobBackground} from './BlobBackground';
import {dotPattern} from './Halftone';
import {PhotoPlaceholder} from './PhotoPlaceholder';

const useEnter = (delay: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - TIMING.endCardIn - delay, fps, config: {damping: 14, stiffness: 170}});
  return {
    p,
    style: {
      opacity: interpolate(p, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'}),
      transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + 0.08 * p})`,
      filter: `blur(${Math.max(0, (1 - p) * 8)}px)`,
    } as React.CSSProperties,
  };
};

const COLLAGE = [
  {dx: -255, dy: 30, rot: -9, delay: 10},
  {dx: 255, dy: 30, rot: 9, delay: 14},
  {dx: 0, dy: -20, rot: 2, delay: 6},
];

// Card final: logo, título, colagem de 3 fotos, botão e rodapé.
export const EndCard: React.FC<{photos: (string | null)[]}> = ({photos}) => {
  const frame = useCurrentFrame();
  const logo = useEnter(0);
  const tag = useEnter(2);
  const title = useEnter(5);
  const button = useEnter(18);
  const footer = useEnter(24);
  const pulse = Math.sin((frame - TIMING.endCardIn) / 14);
  const ring = ((frame - TIMING.endCardIn - 30) % 70) / 70;

  return (
    <AbsoluteFill style={{fontFamily: FONT_FAMILY}}>
      <BlobBackground variant="light" seed="end" intensity={0.55} />

      {/* Logo */}
      <div style={{position: 'absolute', top: SAFE.top + 40, width: '100%', display: 'flex', justifyContent: 'center', ...logo.style}}>
        {LOGO_SRC ? (
          <Img src={LOGO_SRC} style={{height: 130, objectFit: 'contain'}} />
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
            <LogoIcon size={92} />
            <span style={{fontSize: 42, fontWeight: 800, color: COLORS.deep, letterSpacing: -0.5}}>{TEXT.endCard.logoText}</span>
          </div>
        )}
      </div>

      {/* Etiqueta */}
      <div style={{position: 'absolute', top: 392, width: '100%', display: 'flex', justifyContent: 'center', ...tag.style}}>
        <span
          style={{
            padding: '12px 28px',
            borderRadius: 40,
            background: COLORS.pink,
            color: COLORS.deep,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          {TEXT.endCard.tag}
        </span>
      </div>

      {/* Título */}
      <div
        style={{
          position: 'absolute',
          top: 480,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontSize: 80,
          lineHeight: 1.08,
          fontWeight: 800,
          letterSpacing: -2,
          color: COLORS.ink,
          ...title.style,
        }}
      >
        {TEXT.endCard.title}
      </div>

      {/* Colagem */}
      {COLLAGE.map((c, i) => (
        <CollagePhoto key={i} src={photos[i] ?? null} index={i} {...c} />
      ))}

      {/* Botão */}
      <div style={{position: 'absolute', top: 1260, width: '100%', display: 'flex', justifyContent: 'center', ...button.style}}>
        <div style={{position: 'relative'}}>
          {frame > TIMING.endCardIn + 30 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 80,
                border: `4px solid ${COLORS.pink}`,
                transform: `scale(${1 + ring * 0.25}, ${1 + ring * 0.6})`,
                opacity: (1 - ring) * 0.9,
              }}
            />
          ) : null}
          <div
            style={{
              padding: '36px 92px',
              borderRadius: 80,
              background: COLORS.deep,
              color: COLORS.white,
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -0.5,
              boxShadow: '0 24px 50px rgba(90, 11, 51, 0.35)',
              transform: `scale(${1 + pulse * 0.025})`,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <span style={{width: 18, height: 18, borderRadius: 9, background: COLORS.pink}} />
            {TEXT.endCard.button}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          position: 'absolute',
          top: 1452,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontSize: 34,
          fontWeight: 600,
          color: COLORS.gray,
          ...footer.style,
        }}
      >
        {TEXT.endCard.footer}
      </div>
    </AbsoluteFill>
  );
};

const CollagePhoto: React.FC<{src: string | null; index: number; dx: number; dy: number; rot: number; delay: number}> = ({
  src,
  index,
  dx,
  dy,
  rot,
  delay,
}) => {
  const {p} = useEnter(delay);
  const frame = useCurrentFrame();
  const w = 310;
  const h = 388;
  const float = Math.sin((frame + index * 40) / 50) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 + dx - w / 2,
        top: 960 + dy - h / 2 + float,
        width: w,
        height: h,
        borderRadius: 24,
        border: '6px solid #FFFFFF',
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 30px 60px rgba(90, 11, 51, 0.28)',
        opacity: Math.min(1, p * 2),
        transform: `perspective(1400px) translateY(${(1 - p) * 220}px) rotateX(${(1 - p) * 30}deg) rotate(${rot * p}deg) scale(${0.7 + 0.3 * p})`,
      }}
    >
      {src ? <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <PhotoPlaceholder index={index + 3} />}
      {/* Textura de meio-tom e reflexo, como foto impressa */}
      <div style={{position: 'absolute', inset: 0, ...dotPattern('rgba(90, 11, 51, 0.35)', 8, 1.6), mixBlendMode: 'multiply'}} />
    </div>
  );
};
