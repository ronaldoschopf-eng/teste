// Peças do encerramento: seta animada apontando para a área do sticker de
// link (sem simular botão), molduras dessa área e assinatura do fotógrafo.
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { ease, tween } from '../anim/motion';
import { COLORS, SAFE, type Brand } from '../config';
import { FONTS } from '../fonts';

/** Seta vertical que se desenha e depois "quica" suavemente para baixo. */
export const LinkArrow: React.FC<{ x: number; y: number; length: number; start: number }> = ({ x, y, length, start }) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  const draw = tween(frame, [start, start + 14], [0, 1], ease.outExpo);
  // Movimento contínuo e determinístico (função do quadro).
  const bob = Math.sin((frame - start) / 6) * 10 * tween(frame, [start + 10, start + 20], [0, 1]);
  const head = 34;
  return (
    <svg width={120} height={length + 40} style={{ position: 'absolute', left: x - 60, top: y + bob, overflow: 'visible' }}>
      <line x1={60} y1={0} x2={60} y2={length * draw} stroke={COLORS.accent} strokeWidth={8} strokeLinecap="round" />
      <polyline
        points={`${60 - head},${length * draw - head} 60,${length * draw} ${60 + head},${length * draw - head}`}
        fill="none"
        stroke={COLORS.accent}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={draw > 0.4 ? 1 : 0}
      />
    </svg>
  );
};

/**
 * Molduras de canto em torno da área livre do sticker de link (estilo
 * autofoco). A área fica vazia de propósito: o sticker nativo vai aqui.
 */
export const StickerZone: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  const z = SAFE.stickerZone;
  const p = tween(frame, [start, start + 12], [0, 1], ease.outExpo);
  const breathe = 1 + Math.sin((frame - start) / 9) * 0.012;
  const scale = (1.25 - 0.25 * p) * breathe;
  const c = 44;
  const w = 5;
  const corner = (pos: React.CSSProperties, b: Partial<Record<'t' | 'b' | 'l' | 'r', boolean>>): React.CSSProperties => ({
    position: 'absolute',
    width: c,
    height: c,
    borderStyle: 'solid',
    borderColor: COLORS.white,
    borderTopWidth: b.t ? w : 0,
    borderBottomWidth: b.b ? w : 0,
    borderLeftWidth: b.l ? w : 0,
    borderRightWidth: b.r ? w : 0,
    ...pos,
  });
  return (
    <div style={{ position: 'absolute', left: z.x, top: z.y, width: z.width, height: z.height, transform: `scale(${scale})`, opacity: p * 0.85 }}>
      <div style={corner({ left: 0, top: 0 }, { t: true, l: true })} />
      <div style={corner({ right: 0, top: 0 }, { t: true, r: true })} />
      <div style={corner({ left: 0, bottom: 0 }, { b: true, l: true })} />
      <div style={corner({ right: 0, bottom: 0 }, { b: true, r: true })} />
    </div>
  );
};

/** Assinatura: logotipo opcional, nome do fotógrafo, descrição e link. */
export const Signature: React.FC<{ brand: Brand; start: number; y: number }> = ({ brand, start, y }) => {
  const frame = useCurrentFrame();
  if (frame < start) return null;
  const p = (d: number) => tween(frame, [start + d, start + d + 14], [0, 1], ease.outExpo);
  const rule = p(0);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: p(2), transform: `translateY(${(1 - p(2)) * 24}px)` }}>
        {brand.logo ? <Img src={staticFile(brand.logo)} style={{ height: 72, width: 'auto', objectFit: 'contain' }} /> : null}
        <div style={{ height: 3, width: 70 * rule, background: COLORS.accent }} />
        <div style={{ fontFamily: FONTS.condensed, fontWeight: 700, fontSize: 46, letterSpacing: '0.2em', color: COLORS.white, paddingLeft: '0.2em' }}>
          {brand.fotografo}
        </div>
        <div style={{ height: 3, width: 70 * rule, background: COLORS.accent }} />
      </div>
      {brand.descricao ? (
        <div style={{ fontFamily: FONTS.condensed, fontWeight: 500, fontSize: 30, letterSpacing: '0.42em', paddingLeft: '0.42em', color: COLORS.grey, opacity: p(5) }}>
          {brand.descricao}
        </div>
      ) : null}
      {brand.link ? (
        <div style={{ fontFamily: FONTS.mono, fontWeight: 500, fontSize: 30, color: COLORS.white, opacity: p(8) * 0.9, marginTop: 4 }}>{brand.link}</div>
      ) : null}
    </div>
  );
};
