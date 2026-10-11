import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {PHOTOS, TEXT, TEXT_GROUPS, TIMING} from '../config';
import {BlobBackground} from '../components/BlobBackground';
import {TextGroup} from '../components/TextGroup';
import {Notification} from '../components/Notification';
import {PhotoLayers} from './PhotoLayers';

const NOTIF_Y = [1000, 1190, 1380];
const NOTIF_TILT = [-2, 1.5, -1];

// Cena 3 (fundo escuro): chuva de fotos e notificações, com
// "ocorre o Torneio - [Kizuna & / Vai que Dá & / Diretoria.]" e
// "Cobertura fotográfica de cada ponto!". Até o início do zoom-out (cena 4) as
// fotos ficam aqui; depois passam para a camada <Collage/>.
export const Scene3Rain: React.FC<{photos: string[]}> = ({photos}) => {
  const frame = useCurrentFrame();
  const {torneio, cobertura} = TEXT_GROUPS;
  const shade =
    interpolate(frame, [torneio.lines[0].start - 16, torneio.lines[0].start + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
    interpolate(frame, [cobertura.exit, cobertura.exit + TIMING.groupExit], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const photosHere = frame < TIMING.zoomOut.from;

  return (
    <AbsoluteFill>
      <BlobBackground variant="dark" seed="s3" />
      {photosHere ? <PhotoLayers photos={photos} layers={[0, 1, 2]} /> : null}
      {/* Notificações por cima dos cards, para leitura */}
      {TEXT.notifications.map((n, i) => (
        <Notification key={i} title={n.title} body={n.body} enter={TIMING.notifications[i]} y={NOTIF_Y[i]} tilt={NOTIF_TILT[i]} />
      ))}
      {/* Sombra suave atrás do texto para leitura sobre as fotos */}
      <div
        style={{
          position: 'absolute',
          left: -140,
          right: -140,
          top: (torneio.lines[0].y + torneio.lines[1].y) / 2 - 360,
          height: 720,
          background: 'radial-gradient(ellipse at center, rgba(42, 4, 24, 0.78) 0%, rgba(42, 4, 24, 0) 66%)',
          opacity: shade,
        }}
      />
      <TextGroup group={torneio} theme="dark" />
      <TextGroup group={cobertura} theme="dark" />
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
