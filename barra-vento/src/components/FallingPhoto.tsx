import React from 'react';
import {Easing, Img, interpolate, random, useCurrentFrame} from 'remotion';
import {PHOTOS, TIMING, VIDEO} from '../config';
import {dotPattern} from './Halftone';
import {PhotoPlaceholder} from './PhotoPlaceholder';

const GRID_SIZE = PHOTOS.grid.cols * PHOTOS.grid.rows;
const MARGIN = 420; // quanto o card fica fora da tela antes de entrar
const RANGE = VIDEO.height + MARGIN * 2;

// Camada de profundidade: cards que vão para o grid se distribuem nas 3 camadas;
// os excedentes ficam no fundo e somem durante o agrupamento.
export const layerOf = (i: number) => (i < GRID_SIZE ? [2, 1, 0][i % 3] : 0);

const rnd = (i: number, key: string) => random(`${PHOTOS.seed}-${i}-${key}`);

// Posição de queda (sem agrupamento) num frame.
const fallAt = (i: number, frame: number, wrap: boolean) => {
  const layer = PHOTOS.layers[layerOf(i)];
  const speed = layer.speed * (0.85 + rnd(i, 'speed') * 0.3);
  // Faixas horizontais embaralhadas para espalhar bem os cards.
  const lanes = 5;
  const lane = (i * 2 + Math.floor(rnd(i, 'lane') * 2)) % lanes;
  const baseX = 90 + (lane + 0.5) * ((VIDEO.width - 180) / lanes) + (rnd(i, 'x') - 0.5) * 120;
  // Distribuição inicial escalonada: quando a onda revela a cena, a chuva já
  // está em andamento e cobre a tela toda; depois os cards voltam pelo topo.
  const slot = ((i * 7) % PHOTOS.count) / PHOTOS.count;
  const initial = slot * (VIDEO.height + MARGIN) - MARGIN * 0.5 + (rnd(i, 'delay') - 0.5) * 160;
  const raw = (frame - TIMING.photoRainStart) * speed + initial;
  const y = wrap ? (((raw % RANGE) + RANGE) % RANGE) - MARGIN : raw - MARGIN;
  const t = frame / 60;
  const x = baseX + Math.sin(t * 1.3 + rnd(i, 'sway') * 6) * 40;
  return {
    x,
    y,
    rotX: Math.sin(t * 1.6 + rnd(i, 'rx') * 6) * 28,
    rotY: Math.cos(t * 1.2 + rnd(i, 'ry') * 6) * 34,
    rotZ: (rnd(i, 'rz') - 0.5) * 40 + t * (rnd(i, 'spin') - 0.5) * 30,
    scale: layer.scale,
    blur: layer.blur,
    opacity: layer.opacity,
  };
};

const gridTarget = (i: number) => {
  const {cols, rows, cellW, cellH, gap, centerY} = PHOTOS.grid;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const totalW = cols * cellW + (cols - 1) * gap;
  const totalH = rows * cellH + (rows - 1) * gap;
  return {
    x: VIDEO.width / 2 - totalW / 2 + col * (cellW + gap) + cellW / 2,
    y: centerY - totalH / 2 + row * (cellH + gap) + cellH / 2,
    rotZ: (rnd(i, 'grid') - 0.5) * 6,
    scale: cellW / PHOTOS.cardWidth,
  };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Props = {index: number; src: string | null};

// Card de foto caindo em pseudo-3D; entre `gather.from` e `gather.to` ele
// interpola até sua célula no grid (cena 4).
export const FallingPhoto: React.FC<Props> = ({index, src}) => {
  const frame = useCurrentFrame();
  const g = interpolate(frame, [TIMING.gather.from, TIMING.gather.to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });

  let s = fallAt(index, frame, true);
  if (g > 0) {
    // Sem "wrap" durante o agrupamento, para a trajetória não pular.
    const at = fallAt(index, TIMING.gather.from, true);
    const later = fallAt(index, frame, false);
    const before = fallAt(index, TIMING.gather.from, false);
    s = {...later, y: at.y + (later.y - before.y)};
  }

  const inGrid = index < GRID_SIZE;
  let x = s.x;
  let y = s.y;
  let rotX = s.rotX;
  let rotY = s.rotY;
  let rotZ = s.rotZ;
  let scale = s.scale;
  let blur = s.blur;
  let opacity = s.opacity;
  if (g > 0) {
    if (inGrid) {
      const t = gridTarget(index);
      x = lerp(x, t.x, g);
      y = lerp(y, t.y, g);
      rotX = lerp(rotX, 0, g);
      rotY = lerp(rotY, 0, g);
      rotZ = lerp(rotZ, t.rotZ, g);
      scale = lerp(scale, t.scale, g);
      blur = lerp(blur, 0, g);
      opacity = lerp(opacity, 1, g);
    } else {
      opacity = opacity * (1 - g);
    }
  }
  if (opacity <= 0.001) return null;

  const {cardWidth: w, cardHeight: h, radius, border} = PHOTOS;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `perspective(1600px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
        opacity,
      }}
    >
      {/* Sombra em pontos (pop art) */}
      <div style={{position: 'absolute', inset: 0, borderRadius: radius, transform: 'translate(18px, 22px)', ...dotPattern('rgba(42, 4, 24, 0.55)', 12, 3.4)}} />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: radius,
          border: `${border}px solid #FFFFFF`,
          overflow: 'hidden',
          background: '#FFFFFF',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35), 0 8px 18px rgba(0, 0, 0, 0.25)',
        }}
      >
        {src ? (
          <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius - border}} />
        ) : (
          <PhotoPlaceholder index={index} />
        )}
        {/* Textura de meio-tom e reflexo, como foto impressa */}
        <div style={{position: 'absolute', inset: 0, ...dotPattern('rgba(90, 11, 51, 0.35)', 8, 1.6), mixBlendMode: 'multiply'}} />
      </div>
    </div>
  );
};
