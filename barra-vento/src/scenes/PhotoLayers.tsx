import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {MOTION_BLUR, PHOTOS} from '../config';
import {FallingPhoto, layerOf} from '../components/FallingPhoto';

export const photoSrc = (photos: string[], i: number) => (photos.length ? photos[i % photos.length] : null);

// Uma ou mais camadas de profundidade de cards, com motion blur.
export const PhotoLayers: React.FC<{photos: string[]; layers: number[]}> = ({photos, layers}) => (
  <CameraMotionBlur samples={MOTION_BLUR.samples} shutterAngle={MOTION_BLUR.shutterAngle}>
    <AbsoluteFill>
      {layers.map((layer) =>
        Array.from({length: PHOTOS.count}, (_, i) => i)
          .filter((i) => layerOf(i) === layer)
          .map((i) => <FallingPhoto key={i} index={i} src={photoSrc(photos, i)} />),
      )}
    </AbsoluteFill>
  </CameraMotionBlur>
);
