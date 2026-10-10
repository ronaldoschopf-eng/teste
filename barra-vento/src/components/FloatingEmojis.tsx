import React from 'react';
import {random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {TEXT} from '../config';
import {FONT_FAMILY} from '../fonts';

// Posições nas bordas, longe da linha de texto (y ≈ 640) e da área de UI.
const SPOTS = [
  {x: 130, y: 380, size: 120},
  {x: 940, y: 330, size: 104},
  {x: 120, y: 1150, size: 110},
  {x: 960, y: 1020, size: 128},
  {x: 900, y: 1470, size: 100},
  {x: 170, y: 1500, size: 96},
];

export const FloatingEmojis: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <>
      {SPOTS.map((s, i) => {
        const emoji = TEXT.floatingEmojis[i % TEXT.floatingEmojis.length];
        const p = spring({frame: frame - start - i * 5, fps, config: {damping: 10}});
        const t = frame / 60;
        const ph = random(`emoji-${i}`) * Math.PI * 2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.x - s.size / 2,
              top: s.y - s.size / 2 + Math.sin(t * 1.8 + ph) * 18,
              fontSize: s.size,
              lineHeight: 1,
              fontFamily: FONT_FAMILY,
              opacity: Math.min(1, p * 1.5),
              transform: `perspective(800px) rotateY(${Math.sin(t * 1.1 + ph) * 25}deg) rotate(${Math.sin(t * 1.4 + ph) * 12}deg) scale(${p})`,
              filter: 'drop-shadow(0 16px 20px rgba(11, 61, 30, 0.22))',
            }}
          >
            {emoji}
          </div>
        );
      })}
    </>
  );
};
