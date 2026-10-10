import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TEXT, TIMING} from '../config';
import {FONT_FAMILY} from '../fonts';

const AppIcon: React.FC = () => (
  <svg width={96} height={96} viewBox="0 0 96 96">
    <defs>
      <linearGradient id="app-icon" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={COLORS.orange} />
        <stop offset="1" stopColor={COLORS.pink} />
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="22" fill="url(#app-icon)" />
    {/* câmera simples */}
    <rect x="20" y="32" width="56" height="40" rx="9" fill="#FFFFFF" />
    <rect x="36" y="25" width="24" height="10" rx="4" fill="#FFFFFF" />
    <circle cx="48" cy="52" r="12" fill={COLORS.pink} />
    <circle cx="48" cy="52" r="6.5" fill={COLORS.orangeSoft} />
  </svg>
);

type Props = {title: string; body: string; enter: number; y: number; tilt?: number};

// Notificação estilo iMessage: cartão claro com ícone rosa e laranja.
export const Notification: React.FC<Props> = ({title, body, enter, y, tilt = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = spring({frame: frame - enter, fps, config: {damping: 14, stiffness: 160}});
  const outP = spring({frame: frame - (enter + TIMING.notificationHold), fps, config: {damping: 200}, durationInFrames: 20});
  if (frame < enter) return null;
  const opacity = interpolate(inP, [0, 0.5], [0, 1], {extrapolateRight: 'clamp'}) * (1 - outP);
  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        top: y,
        width: 940,
        padding: '28px 32px',
        borderRadius: 42,
        background: COLORS.notificationBg,
        boxShadow: '0 30px 70px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        fontFamily: FONT_FAMILY,
        opacity,
        transform: `perspective(1400px) translateY(${(1 - inP) * -90 - outP * 60}px) rotateX(${(1 - inP) * 35}deg) rotateZ(${tilt * inP}deg) scale(${0.88 + 0.12 * inP - outP * 0.06})`,
        filter: `blur(${Math.max(0, (1 - inP) * 8 + outP * 6)}px)`,
      }}
    >
      <AppIcon />
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <span style={{fontSize: 40, fontWeight: 700, color: COLORS.ink}}>{title}</span>
          <span style={{fontSize: 30, fontWeight: 500, color: COLORS.gray}}>{TEXT.notificationTime}</span>
        </div>
        <div style={{fontSize: 38, fontWeight: 500, color: '#5A3A48', marginTop: 4}}>{body}</div>
      </div>
    </div>
  );
};
