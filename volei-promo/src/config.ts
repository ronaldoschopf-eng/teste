/* ==========================================================================
   CONFIGURAÇÃO CENTRAL — tudo o que costuma mudar entre campanhas fica aqui.
   --------------------------------------------------------------------------
   • VIDEO / SCENES: formato, duração e início de cada cena (em quadros, 30 fps).
   • SYNC: pontos de sincronização com a trilha. Mude um número e o impacto
     visual correspondente (flash, entrada do 20%, obturador…) se move junto.
   • COLORS / EFFECTS / SAFE: direção de arte, intensidade dos efeitos e
     áreas seguras do Instagram.
   • DEFAULT_PROPS: textos, marca e mídias. Também podem ser trocados sem
     editar código, via `--props` na renderização (ver README).
   ========================================================================== */

export const VIDEO = {
  id: 'VoleiPromo',
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 450, // 15 s
} as const;

/** Início e duração de cada cena (quadros absolutos). */
export const SCENES = {
  impacto: { from: 0, duration: 90 }, //    0–3 s
  fotografia: { from: 90, duration: 90 }, // 3–6 s
  oferta: { from: 180, duration: 120 }, //   6–10 s
  cta: { from: 300, duration: 150 }, //      10–15 s
} as const;

/**
 * Pontos de sincronização (quadros absolutos). Ajuste para casar com a batida
 * da trilha: cada efeito visual lê o seu ponto daqui.
 */
export const SYNC = {
  arenaFlashes: [3, 7, 10, 15], // disparos da arquibancada na abertura
  ballImpact: 34, //              mão encontra a bola
  freeze: 36, //                  congelamento + flash do disparo
  headline: 44, //                "AMANHÃ, CADA PONTO VIRA HISTÓRIA."
  transition1: 90, //             flash → visor
  shutters: [104, 130, 156], //   ataque, bloqueio, comemoração
  transition2: 180, //            flash → oferta
  bassDrop: 186, //               impacto grave: entra o 20%
  offHit: 200, //                 "OFF" bate na tela
  offerFlashes: [226, 244, 262, 280], // flashes de fundo na oferta
  transition3: 300, //            flash → chamada
  ctaHit: 306, //                 impacto da chamada para ação
  finalFlash: 426, //             último disparo
  shutterClose: 442, //           cortina do obturador fecha (fim limpo)
} as const;

export const COLORS = {
  black: '#050506',
  graphite: '#16181B',
  graphite2: '#24272B',
  steel: '#3A3F45',
  grey: '#8D9399',
  white: '#F6F7F2',
  accent: '#D4FF1E', // amarelo-limão
  accentDeep: '#9BC400',
} as const;

export const EFFECTS = {
  grain: 0.07, //          opacidade do grão de filme (0 desliga)
  vignette: 0.75, //       escurecimento das bordas
  flashPeak: 1, //         intensidade máxima dos flashes de transição
  shake: 18, //            amplitude (px) do tremor no impacto do 20%
  particles: 46, //        quantidade de partículas no ar
  speedLines: 26, //       quantidade de linhas de velocidade
} as const;

/**
 * Áreas seguras para Stories / Reels (1080 × 1920). Textos importantes ficam
 * entre `top` e `bottom`, e a pelo menos `side` px das bordas.
 * Na cena final, `stickerZone` fica livre para o sticker de link do Instagram.
 */
export const SAFE = {
  top: 260,
  bottom: 1600,
  side: 90,
  stickerZone: { x: 230, y: 1130, width: 620, height: 190 },
} as const;

export type Copy = {
  /** Cena 01 — uma linha por item. */
  impacto: string[];
  /** Cena 02 — uma linha por item. */
  fotografia: string[];
  /** Cena 03 */
  ofertaChamada: string;
  ofertaNumero: string;
  ofertaSufixo: string;
  ofertaComplemento: string[];
  /** Cena 04 — a última linha recebe a cor de destaque. */
  cta: string[];
  ctaApoio: string;
};

export type Brand = {
  /** Nome do fotógrafo (assinatura da tela final). */
  fotografo: string;
  /** Linha abaixo do nome. Deixe vazio para ocultar. */
  descricao: string;
  /** URL ou @perfil exibido na tela final. Deixe vazio para ocultar. */
  link: string;
  /** Arquivo em public/ (ex.: "marca/logo.png"). null = sem logotipo. */
  logo: string | null;
};

export type Media = {
  /**
   * Fotos reais (arquivos em public/, ex.: "fotos/ataque.jpg"). Quando uma
   * foto é informada, ela substitui a silhueta gráfica do disparo
   * correspondente na Cena 02. null = composição gráfica.
   */
  fotos: { ataque: string | null; bloqueio: string | null; comemoracao: string | null };
  /** Trilha e efeitos sonoros (arquivos em public/). null = sem áudio. */
  audio: {
    trilha: string | null;
    volumeTrilha: number;
    obturador: string | null; // toca em SYNC.freeze, SYNC.shutters e SYNC.finalFlash
    whoosh: string | null; //    toca nas transições
    impacto: string | null; //   toca em SYNC.bassDrop e SYNC.ctaHit
  };
};

export type PromoProps = {
  copy: Copy;
  brand: Brand;
  media: Media;
  /** Mostra as áreas seguras do Instagram por cima do vídeo (só para revisão). */
  mostrarAreasSeguras: boolean;
};

export const DEFAULT_PROPS: PromoProps = {
  copy: {
    impacto: ['AMANHÃ,', 'CADA PONTO', 'VIRA HISTÓRIA.'],
    fotografia: ['NÃO DEIXE OS', 'MELHORES MOMENTOS', 'PASSAREM.'],
    ofertaChamada: 'GARANTA',
    ofertaNumero: '20%',
    ofertaSufixo: 'OFF',
    ofertaComplemento: ['NOS SEUS REGISTROS', 'DE AMANHÃ.'],
    cta: ['ACESSE O LINK', 'E GARANTA SEUS', '20% OFF!'],
    ctaApoio: 'Seus melhores momentos merecem ser lembrados.',
  },
  brand: {
    fotografo: 'RONALDO SCHOPF',
    descricao: 'FOTOGRAFIA ESPORTIVA',
    link: 'ronaldo-schopf.fotto.com.br',
    logo: null,
  },
  media: {
    fotos: { ataque: null, bloqueio: null, comemoracao: null },
    audio: { trilha: null, volumeTrilha: 0.9, obturador: null, whoosh: null, impacto: null },
  },
  mostrarAreasSeguras: false,
};

/** Converte um ponto absoluto de SYNC em quadro local de uma cena. */
export const local = (absFrame: number, scene: keyof typeof SCENES) => absFrame - SCENES[scene].from;
