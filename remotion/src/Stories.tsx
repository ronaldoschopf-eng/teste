import React, {useMemo} from 'react';
import {
	AbsoluteFill,
	Easing,
	Img,
	interpolate,
	staticFile,
	useCurrentFrame,
} from 'remotion';
import '@fontsource/roboto-mono/400.css';
import {CONFIG} from './config';

type Card = {
	x: number;
	y: number;
	w: number;
	h: number;
	col: number;
	row: number;
	src: string;
	focusY: number;
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = Easing.inOut(Easing.cubic);

// PRNG determinístico: o layout é sempre o mesmo em todos os frames e renders
const mulberry32 = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const cameraAt = (frame: number) => {
	const {camera, durationInFrames} = CONFIG;
	let x = camera.start.x + camera.drift.x * frame;
	let y = camera.start.y + camera.drift.y * frame;
	let zoom =
		camera.zoomStart +
		((camera.zoomEnd - camera.zoomStart) * frame) / durationInFrames;
	for (const j of camera.jumps) {
		const p = interpolate(frame, [j.from, j.to], [0, 1], {...clamp, easing: smooth});
		x += j.dx * p;
		y += j.dy * p;
		zoom += j.dZoom * p;
	}
	return {x, y, zoom};
};

const buildWall = (): Card[] => {
	const {grid, photos, featured, seed} = CONFIG;
	const rand = mulberry32(seed);
	const pitch = grid.cardWidth + grid.gap;
	const cards: Card[] = [];
	const columns: Card[][] = [];

	for (let c = 0; c < grid.columns; c++) {
		const col: Card[] = [];
		const x = (c - grid.columns / 2) * pitch;
		// Colunas desencontradas, como no masonry
		let y = grid.top - rand() * grid.cardWidth * 1.4;
		let row = 0;
		while (y < grid.bottom) {
			const aspect = grid.minAspect + rand() * (grid.maxAspect - grid.minAspect);
			const h = grid.cardWidth * aspect;
			const card: Card = {x, y, w: grid.cardWidth, h, col: c, row, src: '', focusY: 25 + rand() * 15};
			col.push(card);
			cards.push(card);
			y += h + grid.gap;
			row++;
		}
		columns.push(col);
	}

	// Vizinhos: mesma coluna (acima/abaixo) e colunas ao lado que se sobrepõem na vertical
	const neighbors = (card: Card) => {
		const out: Card[] = [];
		const same = columns[card.col];
		if (same[card.row - 1]) out.push(same[card.row - 1]);
		if (same[card.row + 1]) out.push(same[card.row + 1]);
		for (const dc of [-1, 1]) {
			for (const other of columns[card.col + dc] ?? []) {
				if (other.y < card.y + card.h + grid.gap && other.y + other.h + grid.gap > card.y) out.push(other);
			}
		}
		return out;
	};

	// Destaques: cards mais próximos do ponto onde a câmera termina o último zoom
	const lastJump = CONFIG.camera.jumps[CONFIG.camera.jumps.length - 1];
	const focus = cameraAt(lastJump.to + 30);
	const byDistance = [...cards].sort(
		(a, b) =>
			Math.hypot(a.x + a.w / 2 - focus.x, a.y + a.h / 2 - focus.y) -
			Math.hypot(b.x + b.w / 2 - focus.x, b.y + b.h / 2 - focus.y),
	);
	featured.forEach((src, i) => {
		byDistance[i].src = src;
	});

	// Resto: fotos repetidas e embaralhadas, sem duas iguais lado a lado
	const shuffled = () => [...photos].sort(() => rand() - 0.5);
	let bag: string[] = [];
	for (const card of cards) {
		if (card.src) continue;
		if (bag.length === 0) bag = shuffled();
		const taken = new Set(neighbors(card).map((n) => n.src));
		let idx = bag.findIndex((s) => !taken.has(s));
		if (idx === -1) {
			const free = shuffled().find((s) => !taken.has(s));
			card.src = free ?? bag[0];
			continue;
		}
		card.src = bag.splice(idx, 1)[0];
	}
	return cards;
};

const Corner: React.FC<{text: string; align: 'left' | 'center' | 'right'}> = ({text, align}) => (
	<div style={{flex: 1, textAlign: align, whiteSpace: 'nowrap'}}>{text}</div>
);

export const Stories: React.FC = () => {
	const frame = useCurrentFrame();
	const cards = useMemo(buildWall, []);
	const {angle, fade, reveal, texts, textStyle, width, height, backgroundColor, grid} = CONFIG;

	const cam = cameraAt(frame);
	const tiltY = interpolate(frame, [angle.introStart, angle.introEnd], [angle.introTiltY, angle.tiltY], {
		...clamp,
		easing: Easing.inOut(Easing.quad),
	});
	const opacity =
		interpolate(frame, [fade.inStart, fade.inEnd], [0, 1], {...clamp, easing: Easing.in(Easing.quad)}) *
		interpolate(frame, [fade.outStart, fade.outEnd], [1, 0], clamp);

	// Entrada: faixa visível que abre do centro + lado esquerdo (mais distante) na penumbra
	const half = interpolate(frame, [...reveal.frames], [...reveal.halfWidth], clamp) * 100;
	const soft = reveal.softness * 100;
	const revealMask = `linear-gradient(90deg, transparent ${50 - half - soft}%, #000 ${50 - half}%, #000 ${50 + half}%, transparent ${50 + half + soft}%)`;
	const shadeLeft = interpolate(frame, [60, 150, 230], [0.75, 0.45, 0], clamp);

	const wallTransform = [
		`rotateY(${tiltY}deg)`,
		`rotateX(${angle.tiltX}deg)`,
		`rotateZ(${angle.lean}deg)`,
		`scale(${cam.zoom})`,
		`translate(${-cam.x}px, ${-cam.y}px)`,
	].join(' ');

	const textRow = (pos: 'top' | 'bottom') => ({
		position: 'absolute' as const,
		left: textStyle.sideMargin,
		right: textStyle.sideMargin,
		[pos]: textStyle.safeArea + textStyle.extraOffset,
		display: 'flex',
		fontFamily: '"Roboto Mono", monospace',
		fontSize: textStyle.fontSize,
		letterSpacing: textStyle.letterSpacing,
		color: textStyle.color,
		textTransform: 'uppercase' as const,
		lineHeight: 1,
	});

	return (
		<AbsoluteFill style={{backgroundColor, overflow: 'hidden'}}>
			<AbsoluteFill style={{maskImage: revealMask, WebkitMaskImage: revealMask}}>
			<div
				style={{
					position: 'absolute',
					left: width / 2,
					top: height / 2,
					perspective: angle.perspective,
					perspectiveOrigin: '0 0',
					transformStyle: 'preserve-3d',
					opacity,
				}}
			>
				<div style={{position: 'absolute', transformOrigin: '0 0', transform: wallTransform, transformStyle: 'preserve-3d'}}>
					{cards.map((c, i) => (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: c.x,
								top: c.y,
								width: c.w,
								height: c.h,
								borderRadius: grid.radius,
								overflow: 'hidden',
								backgroundColor: '#111',
							}}
						>
							<Img
								src={staticFile(`fotos/${c.src}`)}
								style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${c.focusY}%`}}
							/>
						</div>
					))}
				</div>
			</div>
			</AbsoluteFill>

			<AbsoluteFill
				style={{
					background: `linear-gradient(90deg, rgba(0,0,0,${shadeLeft}) 0%, rgba(0,0,0,${shadeLeft * 0.5}) 30%, rgba(0,0,0,0) 55%)`,
				}}
			/>

			<div style={textRow('top')}>
				<Corner text={texts.topLeft} align="left" />
				<Corner text={texts.topCenter} align="center" />
				<Corner text={texts.topRight} align="right" />
			</div>
			<div style={textRow('bottom')}>
				<Corner text={texts.bottomLeft} align="left" />
				<Corner text={texts.bottomCenter} align="center" />
				<Corner text={texts.bottomRight} align="right" />
			</div>
		</AbsoluteFill>
	);
};
