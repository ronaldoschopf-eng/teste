import React from 'react';
import { Composition } from 'remotion';
import { DEFAULT_PROPS, VIDEO } from './config';
import { loadFonts } from './fonts';
import { VoleiPromo } from './VoleiPromo';

loadFonts();

export const RemotionRoot: React.FC = () => (
  <Composition
    id={VIDEO.id}
    component={VoleiPromo}
    durationInFrames={VIDEO.durationInFrames}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
    defaultProps={DEFAULT_PROPS}
  />
);
