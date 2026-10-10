import React from 'react';
import {Composition} from 'remotion';
import {Stories} from './Stories';
import {CONFIG} from './config';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="Stories"
		component={Stories}
		durationInFrames={CONFIG.durationInFrames}
		fps={CONFIG.fps}
		width={CONFIG.width}
		height={CONFIG.height}
	/>
);
