// =============================================================================
// Configuração central do vídeo: tempos, textos, cores e ajustes de layout.
// Tudo o que costuma mudar entre versões está aqui. Os tempos estão em FRAMES
// (60 fps → 60 frames = 1 segundo).
// =============================================================================

export const VIDEO = {
  id: 'Torneio',
  width: 1080,
  height: 1920,
  fps: 60,
  durationInFrames: 1140, // 19 s
};

// Área segura: a UI do Instagram/TikTok cobre o topo e a base.
export const SAFE = {
  top: 200,
  bottom: 300,
  side: 80,
};

export const COLORS = {
  deep: '#5A0B33', // rosa-escuro (fundo escuro, barrinhas, botão)
  pink: '#FF1F7A', // rosa pink (highlight box, destaques)
  pinkSoft: '#FF8DC0',
  orange: '#FF7A1A', // laranja (rabisco, faíscas, brilho)
  orangeSoft: '#FFB070',
  white: '#FFFFFF',
  ink: '#2A0717', // texto sobre fundo claro
  gray: '#8A6B78',
  notificationBg: 'rgba(255, 244, 248, 0.95)',
};

// -----------------------------------------------------------------------------
// Texto
// -----------------------------------------------------------------------------
// Frase completa. Os blocos de TEXT_GROUPS, lidos em ordem, precisam formar
// exatamente esta frase (o vídeo avisa no console se não formarem).
export const FULL_TEXT =
  'Amanhã, a partir das 8 horas ocorre o Torneio - Kizuna & Vai que Dá & Diretoria. Cobertura fotográfica completa! Suas fotos estarão no link da bio.';

// Um token é uma palavra, uma palavra com brilho laranja ({glow}) ou um
// highlight box ({box}) cujos conteúdos se alternam com wipe vertical.
export type Token = string | {glow: string} | {box: string[]};

export type TextLine = {
  tokens: Token[];
  start: number; // frame em que entra a primeira palavra
  y: number; // centro vertical da linha
  swaps?: number[]; // frames das trocas de conteúdo do box (se houver)
};

// Bloco de linhas que aparece junto e sai junto (sobe + blur + fade).
export type TextGroup = {lines: TextLine[]; exit: number};

const Y1 = 540; // primeira linha de cada bloco
const Y2 = 750; // segunda linha

export const TEXT_GROUPS = {
  // Cena 1 (fundo claro)
  horario: {
    lines: [
      {tokens: [{box: ['Amanhã,']}], start: 14, y: Y1 - 40},
      {tokens: ['a', 'partir', 'das'], start: 60, y: Y2 - 50},
      {tokens: [{box: ['8 horas']}], start: 88, y: Y2 + 150},
    ],
    exit: 206, // sai junto com a onda
  },
  // Cena 3 (fundo escuro, chuva de fotos)
  torneio: {
    lines: [
      {tokens: ['ocorre', 'o', 'Torneio', '-'], start: 244, y: Y1},
      {tokens: [{box: ['Kizuna &', 'Vai que Dá &', 'Diretoria.']}], start: 280, y: Y2, swaps: [350, 420]},
    ],
    exit: 488,
  },
  cobertura: {
    lines: [
      {tokens: ['Cobertura', 'fotográfica'], start: 506, y: Y1},
      {tokens: [{glow: 'completa!'}], start: 522, y: Y2},
    ],
    exit: 610,
  },
  // Cena 5 (fundo claro, clique)
  link: {
    lines: [
      {tokens: ['Suas', 'fotos', 'estarão'], start: 704, y: Y1},
      {tokens: ['no', {box: ['link da bio.']}], start: 726, y: Y2},
    ],
    exit: 880, // sai junto com a entrada do card final
  },
} satisfies Record<string, TextGroup>;

export const TEXT = {
  notifications: [
    {title: '📸 Fotos do Torneio', body: 'Sua foto está pronta!'},
    {title: '📸 Fotos do Torneio', body: 'Você apareceu na quadra!'},
    {title: '📸 Fotos do Torneio', body: 'Baixe agora 👀'},
  ],
  notificationTime: 'agora',

  floatingEmojis: ['🔥', '😍', '📸', '🏐'],

  endCard: {
    logoText: 'Torneio de Vôlei',
    tag: 'AMANHÃ · A PARTIR DAS 8H',
    title: 'Cobertura fotográfica completa 📸',
    button: 'Link na bio',
    footer: 'Torneio Kizuna & Vai que Dá & Diretoria',
  },
};

export const TYPO = {
  // Tamanho máximo das palavras cinéticas; linhas longas encolhem até caber.
  kineticSize: 124,
  minSize: 80,
  kineticWeight: 700,
  letterSpacing: -2, // px
  wordGap: 30, // px entre palavras
  boxPaddingX: 34, // padding horizontal do highlight box
  boxPaddingY: 10,
  wordInterval: 7, // frames entre palavras (regra geral: 6–8)
};

export const TIMING = {
  boxSwapDuration: 14,
  scribbleDraw: 22, // duração do rabisco (stroke-dashoffset)
  groupExit: 18, // duração da saída de cada bloco de texto

  // ---------------------------------------------------------------- Cena 1
  scene1: {from: 0, to: 232},

  // ---------------------------------------------------------------- Cena 2
  wave: {from: 200, to: 232},

  // ---------------------------------------------------------------- Cena 3
  photoRainStart: 220,
  notifications: [300, 388, 470], // entrada de cada notificação
  notificationHold: 84,

  // ---------------------------------------------------------------- Cena 4
  gather: {from: 620, to: 652}, // fotos indo para o grid
  zoomOut: {from: 652, to: 692},

  // ---------------------------------------------------------------- Cena 5
  scene5: {from: 662, to: 910},
  lightReveal: {from: 662, to: 694}, // círculo claro abrindo do centro
  cursorEnter: 790,
  click: 834, // frame do clique

  // ---------------------------------------------------------------- Cena 6
  endCard: {from: 880, to: 1140},
  endCardIn: 888,

  // ---------------------------------------------------------------- Áudio
  musicFadeIn: 30,
  musicFadeOut: 60,
  musicVolume: 0.8,
};

export const PHOTOS = {
  // Quantidade de cards na chuva (12–16). Se houver menos fotos reais,
  // elas são repetidas.
  count: 16,
  seed: 'torneio-2026',
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

// Meio-tom (halftone).
export const HALFTONE = {
  pitch: 24, // distância entre pontos dos fundos (px)
  angle: 45, // inclinação da retícula
  contrast: 40, // limiar que transforma a densidade em pontos
  drift: 0.12, // deslocamento da retícula por frame (px)
  intensity: 1, // força dos pontos nos fundos (0–1)
  tonePitch: 7, // retícula fina sobre o vídeo todo
  toneOpacity: 0.35,
};

export const MOTION_BLUR = {
  samples: 5,
  shutterAngle: 150,
};
