import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, PHOTOS, TEXT, TIMING, TYPO} from '../config';
import {BlobBackground} from '../components/BlobBackground';
import {KineticLine, LineItem} from '../components/KineticLine';
import {Notification} from '../components/Notification';
import {PhotoLayers} from './PhotoLayers';

const NOTIF_Y = [1010, 1200, 1390];
const NOTIF_TILT = [-2, 1.5, -1];

// Cena 3 (fundo escuro): chuva de fotos, notificações e "estão te esperando,".
// Até o início do zoom-out (cena 4) as fotos ficam aqui; depois passam para
// a camada <Collage/>, acima da revelação clara.
export const Scene3Rain: React.FC<{photos: string[]}> = ({photos}) => {
  const frame = useCurrentFrame();
  const items = useMemo<LineItem[]>(
    () =>
      TEXT.scene3Words.map((text, i) => ({
        kind: 'word' as const,
        text,
        enter: TIMING.scene3WordStart + i * TIMING.scene3WordInterval,
        color: COLORS.white,
        glow: text === TEXT.scene3Glow,
      })),
    [],
  );
  const textExit = interpolate(frame, [TIMING.gather.from - 14, TIMING.gather.from + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const photosHere = frame < TIMING.zoomOut.from;

  return (
    <AbsoluteFill>
      <BlobBackground variant="dark" seed="s3" />
      {photosHere ? <PhotoLayers photos={photos} layers={[0, 1, 2]} /> : null}
      {/* Notificações entre as fotos e o texto (acima dos cards, para leitura) */}
      {TEXT.notifications.map((n, i) => (
        <Notification key={i} title={n.title} body={n.body} enter={TIMING.notifications[i]} y={NOTIF_Y[i]} tilt={NOTIF_TILT[i]} />
      ))}
      {/* Sombra suave atrás do texto para leitura sobre as fotos */}
      <div
        style={{
          position: 'absolute',
          left: -100,
          right: -100,
          top: TYPO.lineY - 260,
          height: 520,
          background: 'radial-gradient(ellipse at center, rgba(4, 25, 12, 0.72) 0%, rgba(4, 25, 12, 0) 68%)',
          opacity: interpolate(frame, [TIMING.scene3WordStart - 10, TIMING.scene3WordStart + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (1 - textExit),
        }}
      />
      <AbsoluteFill style={{opacity: 1 - textExit, transform: `translateY(${-textExit * 120}px)`, filter: `blur(${textExit * 10}px)`}}>
        <KineticLine items={items} fontSize={TYPO.scene3Size} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Cena 4 (parte final): o grid de fotos faz zoom-out por cima da revelação clara.
export const Collage: React.FC<{photos: string[]}> = ({photos}) => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [TIMING.zoomOut.from, TIMING.zoomOut.to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.6, 0, 0.4, 1),
  });
  const fade = interpolate(frame, [TIMING.zoomOut.to - 14, TIMING.zoomOut.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `540px ${PHOTOS.grid.centerY}px`,
        transform: `scale(${1 - z * 0.84}) rotate(${z * -8}deg)`,
        opacity: fade,
      }}
    >
      <PhotoLayers photos={photos} layers={[0, 1, 2]} />
    </AbsoluteFill>
  );
};
