// Tudo o que costuma ser ajustado fica aqui.
// Tempos em frames (30 fps): 30 frames = 1 segundo.

export const CONFIG = {
	// Formato: igual ao vídeo de referência em fps e duração (481 frames ≈ 16,03 s)
	width: 1080,
	height: 1920,
	fps: 30,
	durationInFrames: 481,

	backgroundColor: '#000000',

	// Textos fixos nos cantos (não giram com a grade)
	texts: {
		topLeft: 'SÁBADO',
		topCenter: 'INSPIRAÇÃO CURADA',
		topRight: 'PARA VOCÊ',
		bottomLeft: 'BELEZA PARA TODOS',
		bottomCenter: 'INSPIRANDO VOCÊ A INSPIRAR',
		bottomRight: 'SALVO°',
	},
	textStyle: {
		fontSize: 19,
		color: 'rgba(255,255,255,0.92)',
		letterSpacing: '0.04em',
		// Safe area de stories: nada nos 240 px do topo e da base
		safeArea: 240,
		extraOffset: 14, // distância extra além da safe area
		sideMargin: 40,
	},

	// Fotos em /public/fotos. "destaques" ficam no centro da tela onde o zoom termina.
	photos: ['foto-1.jpg', 'foto-2.jpg', 'foto-3.jpg', 'foto-4.jpg', 'foto-5.jpg'],
	featured: ['foto-2.jpg', 'foto-3.jpg', 'foto-5.jpg', 'foto-1.jpg'],
	seed: 7,

	// Grade masonry (unidades da "parede", antes do zoom)
	grid: {
		columns: 22, // colunas geradas (a parede é bem maior que a tela)
		cardWidth: 400,
		gap: 26,
		radius: 30,
		minAspect: 1.22, // altura / largura dos cards
		maxAspect: 1.58,
		top: -5200,
		bottom: 7600,
	},

	// Inclinação 3D da parede
	angle: {
		lean: 6, // giro no plano (graus): colunas inclinadas para a direita
		tiltY: -15, // perspectiva: lado direito mais perto da câmera
		tiltX: 5,
		perspective: 1500,
		// Entrada: a parede começa "de lado" e gira até ficar de frente
		introTiltY: -55,
		introStart: 6,
		introEnd: 100,
	},

	// Câmera: deriva contínua + dois "saltos" rápidos (como na referência)
	camera: {
		start: {x: 0, y: 0},
		drift: {x: 0.35, y: 1.6}, // unidades por frame (velocidade da rolagem lenta)
		jumps: [
			{from: 198, to: 252, dx: 260, dy: 1350, dZoom: 0.18},
			{from: 334, to: 372, dx: 180, dy: 1100, dZoom: 0.25},
		],
		zoomStart: 0.66,
		zoomEnd: 1.05, // zoom lento acumulado no vídeo todo (sem contar os saltos)
	},

	// Entrada: a área visível da parede abre do centro para as bordas
	// (meia-largura em fração da tela, por frame)
	reveal: {
		frames: [14, 30, 45, 60, 80],
		halfWidth: [0.02, 0.15, 0.26, 0.38, 0.62],
		softness: 0.1,
	},

	fade: {
		inStart: 8,
		inEnd: 80,
		outStart: 400,
		outEnd: 468,
	},
} as const;
