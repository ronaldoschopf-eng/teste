/* ==========================================================================
   4º FESTIVAL BARRA VENTO — FOTOS SENDO ADICIONADAS
   --------------------------------------------------------------------------
   A animação inteira é uma função pura do tempo: render(t) recebe os
   milissegundos decorridos e posiciona cada camada. Isso mantém barra,
   porcentagem, QR Code e textos sincronizados e permite congelar qualquer
   quadro com ?t=<ms> ou exportar o vídeo quadro a quadro.

   Depois de 10 s só as faixas de cupom continuam se movendo.

   Parâmetros de URL:
     ?t=7500   congela a peça nesse instante
     ?clean    esconde os controles (gravação / exportação)
     ?nograin  desliga o grão
   Teclado: R reinicia · Espaço pausa/continua
   ========================================================================== */
(() => {
  'use strict';

  const DURATION = 10000;
  const STAGE_W = 1080;
  const STAGE_H = 1920;

  // Faixas de cupom: cada repetição de "BEMVINDO10 - cupom: " mede 338 px no
  // flyer original. Em 10 s a esteira anda exatamente 2 repetições, então o
  // último quadro coincide com o primeiro (loop sem emenda) e com a arte.
  const STRIP_UNIT = 338;
  const STRIP_SPEED = (2 * STRIP_UNIT) / DURATION;   // px/ms
  const STRIP_TOP_X = 3;      // posição do 1º "BEMVINDO10" na faixa superior
  const STRIP_BOTTOM_X = -35; // e na inferior

  // Barra: trilho interno de 773 px; o preenchimento vai de 0 a 100 %.
  const BAR_TRACK_W = 773;
  const LOAD_START = 2500;
  const LOAD_END = 6500;

  // QR Code extraído módulo a módulo do flyer original (29 × 29, versão 3,
  // branco = módulo escuro). Decodifica para https://www.fotto.com.br/ronaldo.schopf
  // Não alterar: a animação só decide a ORDEM em que estes módulos aparecem.
  const QR = [
    '11111110010001001011101111111',
    '10000010110111110110001000001',
    '10111010011100110011101011101',
    '10111010110101100101001011101',
    '10111010001010101001001011101',
    '10000010101000011110101000001',
    '11111110101010101010101111111',
    '00000000000010000010100000000',
    '11111011111011110111010101010',
    '00011101010000001111111110001',
    '11011110110111111100100000000',
    '10010100011100000001111101010',
    '00011111110100011101000001100',
    '01101101011011001001111010001',
    '00111110000001110110101101100',
    '11011001001011001011001110010',
    '01000010011010100100000101100',
    '10011100111000000111101110101',
    '10011011100110011100000100100',
    '10000000011100101001110110010',
    '10110011110100000101111110111',
    '00000000100011101110100011111',
    '11111110111001110101101011100',
    '10000010000011011010100010001',
    '10111010110010110100111110100',
    '10111010101000001011100101111',
    '10111010110110010011101111110',
    '10000010110100111000100101010',
    '11111110111100000101010111100',
  ];
  const QR_N = QR.length;
  const QR_SIZE = 264;       // px no palco
  const QR_DPR = 2;          // resolução do canvas (nitidez em telas densas)
  const QR_CELL_MS = 170;    // duração da entrada de cada módulo

  const params = new URLSearchParams(location.search);

  /* --- utilitários ------------------------------------------------------- */

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const E = {
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutSine: (p) => (1 - Math.cos(Math.PI * p)) / 2,
    // overshoot controlado (~6 %) e estabilização suave
    outBack: (p, k = 1.4) => 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2),
    bump: (p) => Math.sin(Math.PI * clamp(p)),
  };
  const mod = (v, m) => ((v % m) + m) % m;
  // pseudo-aleatório determinístico (só para ordenar módulos do QR)
  const hash = (a, b) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  /* --- referências -------------------------------------------------------- */

  const $ = {};
  document.querySelectorAll('[data-ref]').forEach((el) => { $[el.dataset.ref] = el; });
  const words = [...document.querySelectorAll('.title .w__in')];

  /* --- faixas de cupom ---------------------------------------------------- */

  const unitHTML = '<span class="strip__unit" style="width:' + STRIP_UNIT + 'px">'
    + '<span class="strip__code">BEMVINDO10</span><span class="strip__dash">-</span>'
    + '<span class="strip__label">cupom:</span></span>';
  const units = Math.ceil(STAGE_W / STRIP_UNIT) + 3;
  $.trackTop.innerHTML = unitHTML.repeat(units);
  $.trackBottom.innerHTML = unitHTML.repeat(units);

  /* --- QR Code ------------------------------------------------------------ */

  const ctx = $.qr.getContext('2d');
  const step = QR_SIZE / QR_N;
  const snap = (i) => Math.floor(i * step);        // bordas inteiras (sem frestas), como na arte
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= QR_N - 7) || (r >= QR_N - 7 && c < 7);
  const inAlign = (r, c) => Math.abs(r - 22) <= 2 && Math.abs(c - 22) <= 2;

  const cells = [];
  for (let r = 0; r < QR_N; r++) {
    for (let c = 0; c < QR_N; c++) {
      if (QR[r][c] !== '1') continue;
      cells.push({ r, c, x: snap(c), y: snap(r), w: snap(c + 1) - snap(c), h: snap(r + 1) - snap(r), delay: 0 });
    }
  }

  // 1) marcadores de posição: desenhados como um contorno (anel externo em
  //    sentido horário), depois o núcleo 3 × 3.
  const FINDERS = [[0, 0, 3000], [0, QR_N - 7, 3130], [QR_N - 7, 0, 3260]];
  const ringPos = (r, c) => {           // posição 0..1 ao longo do anel 7 × 7
    if (r === 0) return c / 24;
    if (c === 6) return (6 + r) / 24;
    if (r === 6) return (12 + (6 - c)) / 24;
    return (18 + (6 - r)) / 24;
  };
  // 2) demais módulos em pequenos grupos 2 × 2, numa varredura diagonal com
  //    leve variação determinística.
  const groups = new Map();
  cells.forEach((cell) => {
    const { r, c } = cell;
    const f = FINDERS.find(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
    if (f && inFinder(r, c)) {
      const lr = r - f[0], lc = c - f[1];
      const outer = lr === 0 || lr === 6 || lc === 0 || lc === 6;
      cell.delay = f[2] + (outer ? ringPos(lr, lc) * 300 : 360);
    } else if (inAlign(r, c)) {
      cell.delay = 3700 + (Math.max(Math.abs(r - 22), Math.abs(c - 22)) === 2 ? 0 : 120);
    } else {
      const key = (r >> 1) * 100 + (c >> 1);
      if (!groups.has(key)) groups.set(key, { order: ((r >> 1) + (c >> 1)) / 28 + hash(r >> 1, c >> 1) * 0.22, cells: [] });
      groups.get(key).cells.push(cell);
    }
  });
  const sorted = [...groups.values()].sort((a, b) => a.order - b.order);
  sorted.forEach((g, i) => {
    const d = 3850 + (i / (sorted.length - 1)) * 3150;   // 3,85 s → 7,0 s
    g.cells.forEach((cell, k) => { cell.delay = d + k * 18; });
  });

  function drawQR(t) {
    ctx.setTransform(QR_DPR, 0, 0, QR_DPR, 0, 0);
    ctx.clearRect(0, 0, QR_SIZE, QR_SIZE);
    ctx.fillStyle = '#FFFFFF';
    for (const cell of cells) {
      const p = prog(t, cell.delay, QR_CELL_MS);
      if (p <= 0) continue;
      if (p >= 1) { ctx.fillRect(cell.x, cell.y, cell.w, cell.h); continue; }
      const s = clamp(E.outBack(p, 1.8), 0, 1.25);
      const w = cell.w * s, h = cell.h * s;
      ctx.globalAlpha = clamp(p * 2.5);
      ctx.fillRect(cell.x + (cell.w - w) / 2, cell.y + (cell.h - h) / 2, w, h);
      ctx.globalAlpha = 1;
    }
  }

  /* --- grão -------------------------------------------------------------- */

  // Ladrilhos de ruído gerados com semente fixa: o grão é determinístico
  // (a exportação sai sempre igual) e troca a cada quadro de 30 fps.
  const GRAIN_TILES = 6;
  const GRAIN_SIZE = 256;
  const GRAIN_FPS = 30;
  const GRAIN_SCALE = 2;
  const gctx = $.grain.getContext('2d');
  const grainPatterns = (() => {
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const out = [];
    for (let k = 0; k < GRAIN_TILES; k++) {
      const c = document.createElement('canvas');
      c.width = c.height = GRAIN_SIZE;
      const g = c.getContext('2d');
      const img = g.createImageData(GRAIN_SIZE, GRAIN_SIZE);
      for (let i = 0; i < img.data.length; i += 4) {
        // soma de dois uniformes ≈ distribuição triangular, centrada no cinza médio
        const v = 128 + (rnd() + rnd() - 1) * 150;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      out.push(gctx.createPattern(c, 'repeat'));
    }
    return out;
  })();
  let lastGrain = -1;

  function drawGrain(t) {
    const f = Math.floor((t * GRAIN_FPS) / 1000);
    if (f === lastGrain) return;
    lastGrain = f;
    const ox = Math.floor(hash(f, 1) * GRAIN_SIZE);
    const oy = Math.floor(hash(f, 2) * GRAIN_SIZE);
    // grão de ~2 px (mais orgânico e mais leve para o codificador de vídeo)
    gctx.imageSmoothingEnabled = true;
    gctx.setTransform(GRAIN_SCALE, 0, 0, GRAIN_SCALE, -ox, -oy);
    gctx.fillStyle = grainPatterns[mod(f, GRAIN_TILES)];
    gctx.fillRect(ox / GRAIN_SCALE, oy / GRAIN_SCALE, STAGE_W / GRAIN_SCALE + 1, STAGE_H / GRAIN_SCALE + 1);
  }

  /* --- render(t) --------------------------------------------------------- */

  const px = (v) => v.toFixed(2) + 'px';
  let lastPct = -1;

  function render(t) {
    // Abertura: o flyer inteiro assenta com uma escala sutil.
    const open = E.outCubic(prog(t, 0, 1100));
    $.scene.style.transform = `scale(${lerp(1.03, 1, open)})`;

    // Faixas: esteira contínua em sentidos opostos + revelação lateral.
    const shift = mod(t * STRIP_SPEED, STRIP_UNIT);
    $.trackTop.style.transform = `translateX(${px(STRIP_TOP_X - shift)})`;
    $.trackBottom.style.transform = `translateX(${px(STRIP_BOTTOM_X - STRIP_UNIT + shift)})`;
    const wipeTop = E.outQuart(prog(t, 0, 650));
    const wipeBot = E.outQuart(prog(t, 120, 650));
    $.stripTop.style.clipPath = `inset(0 ${(1 - wipeTop) * 100}% 0 0)`;
    $.stripBottom.style.clipPath = `inset(0 0 0 ${(1 - wipeBot) * 100}%)`;

    // Título: bloco sobe e assenta; palavras saem da máscara em sequência.
    const tb = E.outCubic(prog(t, 200, 1600));
    const settle = 1 - E.inOutSine(prog(t, 2000, 6000));
    const drift = Math.sin((t / 3200) * Math.PI * 2) * 1.6 * settle * prog(t, 1600, 400);
    $.title.style.transform = `translateY(${px(lerp(26, 0, tb) + drift)}) scale(${lerp(1.04, 1, tb)})`;
    words.forEach((el, i) => {
      const bold = i === words.length - 1;
      const start = 300 + i * 115 + (bold ? 90 : 0);
      const p = prog(t, start, bold ? 720 : 620);
      const y = (1 - E.outBack(p, bold ? 1.7 : 1.3)) * 110;   // % da própria altura
      const s = bold ? lerp(1.07, 1, E.outCubic(p)) : 1;
      el.style.transform = `translateY(${y.toFixed(2)}%) scale(${s})`;
      el.style.transformOrigin = '0 100%';
    });

    // "Fotos sendo": revelação lateral com deslocamento curto.
    const lead = E.outQuart(prog(t, 1150, 650));
    $.subLead.style.clipPath = `inset(-20% ${((1 - lead) * 105).toFixed(2)}% -20% -10%)`;
    $.subLead.style.transform = `translateX(${px(lerp(-28, 0, lead))})`;

    // Marca-texto: passada rápida da esquerda para a direita, palavra junto.
    const sw = prog(t, 1650, 480);
    const bg = clamp(E.outBack(E.inOutCubic(sw), 0.9) , 0, 1.03);
    $.markBg.style.transform = `scaleX(${bg.toFixed(4)})`;
    const reveal = clamp(bg - 0.06) / 0.94;               // a palavra vem logo atrás
    $.markWord.style.clipPath = `inset(-20% ${((1 - reveal) * 104).toFixed(2)}% -20% -4%)`;
    const adjust = E.outCubic(prog(t, 2050, 380));        // pequeno ajuste final
    const accent = E.bump(prog(t, 6950, 520));            // último destaque (conclusão)
    $.markWord.style.transform = `translateX(${px(lerp(7, 0, adjust))})`;
    $.mark.style.transform = `translateX(${px(sw > 0 ? lerp(4, 0, adjust) : 0)}) scale(${1 + 0.07 * accent})`;

    // Barra: a borda se desenha e o preenchimento cresce em LARGURA real.
    const frame = E.outCubic(prog(t, 1850, 650));
    $.barFrame.style.clipPath = `inset(-4px ${((1 - frame) * 100).toFixed(2)}% -4px -4px)`;
    const load = E.inOutSine(prog(t, LOAD_START, LOAD_END - LOAD_START));
    const loadEased = 1 - Math.pow(1 - load, 1.35);       // desaceleração discreta no fim
    const w = BAR_TRACK_W * (t >= LOAD_END ? 1 : loadEased);
    $.barFill.style.width = px(w < 0.5 ? 0 : w);

    // 100 %: pulso de escala breve + eco sutil da borda.
    const pulse = E.bump(prog(t, LOAD_END, 520));
    $.bar.style.transform = `scale(${1 + 0.022 * pulse}, ${1 + 0.06 * pulse})`;
    const echo = prog(t, LOAD_END, 650);
    const d = E.outCubic(echo) * 16;
    $.barEcho.style.inset = px(-d);
    $.barEcho.style.borderRadius = px(34 + d);
    $.barEcho.style.opacity = echo > 0 && echo < 1 ? (0.55 * (1 - echo)).toFixed(3) : 0;

    // Porcentagem discreta: aparece com a barra e sai após a conclusão.
    const pct = Math.round(clamp(w / BAR_TRACK_W) * 100);
    if (pct !== lastPct) { $.pct.textContent = pct + '%'; lastPct = pct; }
    const pctIn = E.outCubic(prog(t, 2300, 400));
    const pctOut = E.outCubic(prog(t, 7250, 550));
    $.pct.style.opacity = (pctIn * (1 - pctOut)).toFixed(3);
    $.pct.style.transform = `translateY(${px(lerp(10, 0, pctIn) - 8 * pctOut)}) scale(${1 + 0.12 * pulse})`;

    // QR Code módulo a módulo.
    drawQR(t);

    drawGrain(t);
  }

  /* --- encaixe na tela ---------------------------------------------------- */

  function fit() {
    const gutter = params.has('clean') ? 0 : 32;
    const s = Math.min((innerWidth - gutter) / STAGE_W, (innerHeight - gutter) / STAGE_H);
    $.stage.style.setProperty('--fit', params.has('clean') && innerWidth === STAGE_W ? 1 : s);
  }
  addEventListener('resize', fit);
  fit();

  /* --- relógio ------------------------------------------------------------ */

  let start = 0;
  let paused = false;
  let pausedAt = 0;
  let frozen = params.has('t');
  let current = 0;

  function frame(now) {
    if (!paused && !frozen) {
      current = now - start;
      render(current);
      const shown = Math.min(current, DURATION) / 1000;
      $.ctrlTime.textContent = `${shown.toFixed(1).padStart(4, '0')} / ${(DURATION / 1000).toFixed(1)}`;
    }
    requestAnimationFrame(frame);
  }

  function restart() {
    frozen = false;
    paused = false;
    $.btnPause.textContent = 'Pausar';
    start = performance.now();
  }
  function togglePause() {
    if (frozen) return;
    paused = !paused;
    if (paused) pausedAt = performance.now();
    else start += performance.now() - pausedAt;
    $.btnPause.textContent = paused ? 'Continuar' : 'Pausar';
  }

  $.btnRestart.addEventListener('click', restart);
  $.btnPause.addEventListener('click', togglePause);
  addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') restart();
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  });

  if (params.has('clean')) document.documentElement.classList.add('is-clean');
  if (params.has('nograin')) document.documentElement.classList.add('no-grain');

  const ready = document.fonts.ready.then(() => {
    if (frozen) render(Number(params.get('t')) || 0);
    else { start = performance.now(); requestAnimationFrame(frame); }
  });
  render(frozen ? Number(params.get('t')) || 0 : 0);

  window.story = {
    ready,
    duration: DURATION,
    seek(t) { frozen = true; current = t; render(t); },
    fontsOk: () => document.fonts.check('italic 800 20px Poppins') && document.fonts.check('italic 300 20px Poppins'),
  };
})();
