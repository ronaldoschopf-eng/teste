import React from 'react';
import {Composition} from 'remotion';
import {BarraVento} from './BarraVento';
import {VIDEO} from './config';

export const RemotionRoot: React.FC = () => (
  <Composition
    id={VIDEO.id}
    component={BarraVento}
    width={VIDEO.width}
    height={VIDEO.height}
    fps={VIDEO.fps}
    durationInFrames={VIDEO.durationInFrames}
  />
);
