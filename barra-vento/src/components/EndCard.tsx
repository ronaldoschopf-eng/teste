import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, SAFE, TEXT, TIMING} from '../config';
import {LOGO_SRC} from '../assets';
import {FONT_FAMILY} from '../fonts';
import {BerimbauIcon} from './BerimbauLogo';
import {BlobBackground} from './BlobBackground';
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
  {dx: -265, dy: 30, rot: -9, delay: 10},
  {dx: 265, dy: 30, rot: 9, delay: 14},
  {dx: 0, dy: -20, rot: 2, delay: 6},
];

// Card final: logo, título, colagem de 3 fotos, botão e rodapé.
export const EndCard: React.FC<{photos: (string | null)[]}> = ({photos}) => {
  const frame = useCurrentFrame();
  const logo = useEnter(0);
  const title = useEnter(4);
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
            <BerimbauIcon size={92} />
            <span style={{fontSize: 42, fontWeight: 800, color: COLORS.darkGreen, letterSpacing: -0.5}}>{TEXT.endCard.logoText}</span>
          </div>
        )}
      </div>

      {/* Título */}
      <div
        style={{
          position: 'absolute',
          top: 400,
          left: 90,
          right: 90,
          textAlign: 'center',
          fontSize: 88,
          lineHeight: 1.08,
          fontWeight: 800,
          letterSpacing: -2,
          color: COLORS.nearBlack,
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
      <div style={{position: 'absolute', top: 1270, width: '100%', display: 'flex', justifyContent: 'center', ...button.style}}>
        <div style={{position: 'relative'}}>
          {frame > TIMING.endCardIn + 30 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 80,
                border: `4px solid ${COLORS.lime}`,
                transform: `scale(${1 + ring * 0.25}, ${1 + ring * 0.6})`,
                opacity: (1 - ring) * 0.9,
              }}
            />
          ) : null}
          <div
            style={{
              padding: '36px 92px',
              borderRadius: 80,
              background: COLORS.darkGreen,
              color: COLORS.white,
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -0.5,
              boxShadow: '0 24px 50px rgba(11, 61, 30, 0.35)',
              transform: `scale(${1 + pulse * 0.025})`,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <span style={{width: 18, height: 18, borderRadius: 9, background: COLORS.lime}} />
            {TEXT.endCard.button}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div
        style={{
          position: 'absolute',
          top: 1470,
          width: '100%',
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
  const w = 330;
  const h = 412;
  const float = Math.sin((frame + index * 40) / 50) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left: 540 + dx - w / 2,
        top: 930 + dy - h / 2 + float,
        width: w,
        height: h,
        borderRadius: 24,
        border: '6px solid #FFFFFF',
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 30px 60px rgba(11, 61, 30, 0.28)',
        opacity: Math.min(1, p * 2),
        transform: `perspective(1400px) translateY(${(1 - p) * 220}px) rotateX(${(1 - p) * 30}deg) rotate(${rot * p}deg) scale(${0.7 + 0.3 * p})`,
      }}
    >
      {src ? <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <PhotoPlaceholder index={index + 3} />}
    </div>
  );
};
