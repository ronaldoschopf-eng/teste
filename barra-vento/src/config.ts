// =============================================================================
// Configuração central do vídeo: tempos, textos, cores e ajustes de layout.
// Tudo o que costuma mudar entre versões está aqui. Os tempos estão em FRAMES
// (60 fps → 60 frames = 1 segundo).
// =============================================================================

export const VIDEO = {
  id: 'BarraVento',
  width: 1080,
  height: 1920,
  fps: 60,
  durationInFrames: 900, // 15 s
};

// Área segura: a UI do Instagram/TikTok cobre o topo e a base.
export const SAFE = {
  top: 200,
  bottom: 300,
  side: 80,
};

export const COLORS = {
  darkGreen: '#0B3D1E',
  green: '#1F7A3A',
  lime: '#B6F23A',
  yellow: '#FFD400',
  white: '#FFFFFF',
  nearBlack: '#111111',
  gray: '#7A8079',
  notificationBg: 'rgba(242, 243, 245, 0.94)',
};

// Frase completa (referência). Os trechos abaixo, lidos em ordem, formam
// exatamente esta frase — não altere um sem o outro.
export const FULL_TEXT =
  'Suas fotos do 4º Festival Barra Vento de Capoeira estão te esperando, clique no link da bio';

export const TEXT = {
  scene1Words: ['Suas', 'fotos', 'do'],
  // Conteúdos que se alternam dentro do highlight box da cena 1.
  scene1Box: ['4º Festival', 'Barra Vento', 'de Capoeira'],
  scene3Words: ['estão', 'te', 'esperando,'],
  // Palavra que recebe o brilho amarelo pulsante.
  scene3Glow: 'esperando,',
  scene5Words: ['clique', 'no'],
  scene5Box: 'link da bio',

  notifications: [
    {title: '📸 Fotos do Festival', body: 'Sua foto está pronta!'},
    {title: '📸 Fotos do Festival', body: 'Você apareceu na roda!'},
    {title: '📸 Fotos do Festival', body: 'Baixe agora 👀'},
  ],
  notificationTime: 'agora',

  floatingEmojis: ['🔥', '😍', '📸', '🤸'],

  endCard: {
    logoText: 'Barra Vento Capoeira',
    title: 'Suas fotos estão prontas 📸',
    button: 'Link na bio',
    footer: '4º Festival Barra Vento de Capoeira',
  },
};

export const TYPO = {
  // Tamanho da fonte das palavras cinéticas.
  kineticSize: 116,
  kineticWeight: 700,
  letterSpacing: -2, // px
  wordGap: 30, // px entre palavras
  boxPaddingX: 34, // padding horizontal do highlight box
  boxPaddingY: 10,
  // Fonte menor na cena 3 para "estão te esperando," caber sem cortar.
  scene3Size: 100,
  scene5Size: 90,
  // Linha do texto (centro vertical), no terço superior/central.
  lineY: 640,
};

export const TIMING = {
  // ---------------------------------------------------------------- Cena 1
  scene1: {from: 0, to: 150},
  scene1WordStart: 12, // primeira palavra
  wordInterval: 7, // frames entre palavras (regra geral: 6–8)
  // Trocas do conteúdo do box (wipe vertical), em frames absolutos.
  scene1BoxSwaps: [78, 112],
  boxSwapDuration: 14,
  scribbleDraw: 22, // duração do rabisco (stroke-dashoffset)

  // ---------------------------------------------------------------- Cena 2
  wave: {from: 150, to: 182},

  // ---------------------------------------------------------------- Cena 3
  scene3: {from: 166, to: 470},
  photoRainStart: 170,
  scene3WordStart: 200,
  scene3WordInterval: 10,
  notifications: [236, 296, 352], // entrada de cada notificação
  notificationHold: 84,

  // ---------------------------------------------------------------- Cena 4
  gather: {from: 420, to: 452}, // fotos indo para o grid
  zoomOut: {from: 452, to: 492},

  // ---------------------------------------------------------------- Cena 5
  scene5: {from: 462, to: 680},
  lightReveal: {from: 462, to: 494}, // círculo claro abrindo do centro
  scene5WordStart: 500,
  cursorEnter: 560,
  click: 604, // frame do clique

  // ---------------------------------------------------------------- Cena 6
  endCard: {from: 652, to: 900},
  endCardIn: 660,

  // ---------------------------------------------------------------- Áudio
  musicFadeIn: 30,
  musicFadeOut: 60,
  musicVolume: 0.8,
};

export const PHOTOS = {
  // Quantidade de cards na chuva (12–16). Se houver menos fotos reais,
  // elas são repetidas.
  count: 16,
  seed: 'barra-vento-2026',
  cardWidth: 400,
  cardHeight: 500,
  radius: 24,
  border: 6,
  // 3 camadas de profundidade (0 = fundo, 2 = frente).
  layers: [
    {scale: 0.52, speed: 4.2, blur: 7, opacity: 0.75},
    {scale: 0.76, speed: 6.4, blur: 2.5, opacity: 0.92},
    {scale: 1.0, speed: 9.5, blur: 0, opacity: 1},
  ],
  // Grid da cena 4 (cols x rows) e tamanho de cada célula.
  grid: {cols: 3, rows: 4, cellW: 270, cellH: 330, gap: 22, centerY: 930},
};

export const BACKGROUND = {
  blur: 160, // blur efetivo dos blobs (px)
  grainOpacity: 0.07,
};

export const MOTION_BLUR = {
  samples: 5,
  shutterAngle: 150,
};
