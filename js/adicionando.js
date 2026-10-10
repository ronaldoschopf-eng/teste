/* ==========================================================================
   FOTOS SENDO ADICIONADAS — linha do tempo
   --------------------------------------------------------------------------
   Toda a animação é uma função pura do tempo: render(t) recebe os
   milissegundos decorridos e posiciona cada elemento, então qualquer quadro
   pode ser reproduzido (?t=<ms>) e exportado (tools/render-video.js).

   A ordem segue o pedido: primeiro a barra de carregamento, depois os textos
   (status → evento → link) e por fim o QR code. Depois de 10 s a narrativa
   termina, mas o ambiente (formas flutuando, listras da barra, onda em
   "adicionadas") continua vivo.

   Parâmetros de URL:
     ?t=7500   congela a peça nesse instante
     ?clean    esconde os controles (para gravação)
   Teclado: R reinicia · Espaço pausa/continua
   ========================================================================== */
(() => {
  'use strict';

  const DURATION = 10000;
  const STAGE_W = 1080;
  const STAGE_H = 1920;

  // Barra: largura interna útil (px) e pontos de passagem do progresso (ms, 0–1).
  const BAR_INNER = 773;
  const BAR_MIN = 38;
  const bar = document.querySelector('[data-ref="bar"]');
  const BAR_END = Number(bar.dataset.progress) || 0.76;
  const PROGRESS_KEYS = [
    [1300, 0], [1800, 0.1], [2400, 0.22], [3100, 0.35],
    [3900, 0.48], [4800, 0.6], [5800, 0.7], [6800, 1],
  ].map(([ms, p]) => [ms, p * BAR_END]);
  const STRIPE_PERIOD = 38 / Math.sin((55 * Math.PI) / 180);

  // Paralaxe: uma "câmera" desce de CAM_Y a 0 ao longo da peça. Cada camada
  // se desloca profundidade × curso restante; camadas mais próximas (maior
  // profundidade) começam mais longe e se acomodam mais rápido.
  const CAM_Y = 260;
  const CAM_X = 70;
  const DEPTH = { url: 0.25, title: 0.45, label: 0.65, bar: 0.8, qr: 1.05 };

  // Formas planas: [tipo, centro x, centro y, largura, altura, profundidade].
  // Ficam nos vazios da composição para não competir com os textos.
  const SHAPES = [
    ['disc', 1010, 380, 560, 560, 0.3],
    ['disc', -40, 1860, 460, 460, 0.45],
    ['ring', 250, 400, 150, 150, 0.6],
    ['ring', 860, 1450, 360, 360, 0.9],
    ['pill', 700, 1770, 520, 96, 1.2],
    ['disc', 520, 1380, 120, 120, 1.4],
    ['ring', 980, 1080, 70, 70, 1.1],
    ['dot', 960, 1210, 18, 18, 1.6],
    ['dot', 620, 540, 22, 22, 1.3],
    ['dot', 160, 1700, 14, 14, 1.8],
    ['dot', 430, 270, 12, 12, 0.9],
  ];

  // QR code (29 × 29) → https://www.fotto.com.br/ronaldo.schopf
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
  const QR_N = 29;
  const FINDERS = [[0, 0], [0, 22], [22, 0]];   // [linha, coluna]

  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- utilitários ------------------------------------------------------- */

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    linear: (p) => p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outBack: (p) => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2),
    inOutSine: (p) => (1 - Math.cos(Math.PI * p)) / 2,
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  };
  const seg = (t, a, b, ease = E.linear) => ease(clamp((t - a) / (b - a)));
  const pulse = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const mod = (a, n) => ((a % n) + n) % n;

  /** Interpolação cúbica monotônica (Fritsch–Carlson). */
  function monotoneCurve(points) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const n = xs.length;
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    const m = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        m[i] = tau * a * d[i];
        m[i + 1] = tau * b * d[i];
      }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i];
      const s = (x - xs[i]) / h;
      const s2 = s * s;
      const s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i]
        + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
    };
  }
  const progressAt = monotoneCurve(PROGRESS_KEYS);

  /* --- montagem do DOM --------------------------------------------------- */

  const stage = document.getElementById('stage');
  const R = {};
  document.querySelectorAll('[data-ref]').forEach((el) => { R[el.dataset.ref] = el; });

  /** Quebra o texto em palavras com máscara (.w > i) ou em caracteres (.c). */
  function split(el) {
    const mode = el.dataset.split;
    const text = el.textContent;
    el.textContent = '';
    const parts = [];
    if (mode === 'chars') {
      for (const ch of text) {
        const c = document.createElement('span');
        c.className = 'c';
        c.textContent = ch;
        el.appendChild(c);
        parts.push(c);
      }
    } else {
      text.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const i = document.createElement('i');
        i.textContent = tok;
        w.appendChild(i);
        el.appendChild(w);
        parts.push(i);
      });
    }
    return parts;
  }
  const splits = {};
  stage.querySelectorAll('[data-split]').forEach((el) => {
    const key = el.closest('[data-ref]').dataset.ref + (el.dataset.split === 'chars' ? 'Chars' : 'Words');
    splits[key] = split(el);
  });

  const shapes = SHAPES.map(([type, cx, cy, w, h, depth], i) => {
    const el = document.createElement('span');
    el.className = `shape shape--${type}`;
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    R.shapes.appendChild(el);
    return { el, x: cx - w / 2, y: cy - h / 2, depth, phase: i * 1.7 };
  });

  // QR: os três padrões de posição viram grupos próprios; o resto, um rect por módulo.
  const SVG = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(SVG, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  const inFinder = (r, c) => FINDERS.some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7);
  const finders = FINDERS.map(([r, c]) => {
    const g = svgEl('g', {});
    g.appendChild(svgEl('rect', { class: 'finder-ring', x: c + 0.5, y: r + 0.5, width: 6, height: 6, 'stroke-width': 1 }));
    g.appendChild(svgEl('rect', { x: c + 2, y: r + 2, width: 3, height: 3 }));
    R.qr.appendChild(g);
    return g;
  });
  const modules = [];
  QR.forEach((row, r) => {
    for (let c = 0; c < QR_N; c++) {
      if (row[c] !== '1' || inFinder(r, c)) continue;
      const el = svgEl('rect', { x: c, y: r, width: 1.04, height: 1.04 });
      R.qr.appendChild(el);
      modules.push({ el, r, c });
    }
  });

  function fitStage() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const gutter = w > 720 && !params.has('clean') ? 48 : 0;
    const s = Math.min((w - gutter) / STAGE_W, (h - gutter) / STAGE_H);
    stage.style.setProperty('--scale', s.toFixed(5));
  }

  /* --- render ------------------------------------------------------------ */

  const cache = new Map();
  function set(el, prop, value) {
    let c = cache.get(el);
    if (!c) { c = {}; cache.set(el, c); }
    if (c[prop] !== value) {
      c[prop] = value;
      el.style[prop] = value;
    }
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const op = (el, v) => set(el, 'opacity', String(r3(clamp(v))));
  const tf = (el, v) => set(el, 'transform', v);
  const tr = (x, y) => `translate3d(${r2(x)}px, ${r2(y)}px, 0)`;

  /** palavras subindo por trás da máscara, em sequência */
  function revealWords(parts, t, start, step, dur, M) {
    parts.forEach((el, i) => {
      const k = seg(t, start + i * step, start + i * step + dur, E.outQuart);
      tf(el, M ? `translate3d(0, ${r2((1 - k) * 115)}%, 0) skewX(${r2((1 - k) * -8)}deg)` : 'none');
      op(el, M ? 1 : k);
    });
  }

  /**
   * @param ta tempo total (ms); pode passar de DURATION — move o ambiente
   */
  function render(ta) {
    const t = Math.min(ta, DURATION);
    const M = reduceMotion.matches ? 0 : 1;
    const s = ta / 1000;

    const cam = M * CAM_Y * (1 - seg(t, 0, 8000, E.inOutCubic));
    const camX = M * CAM_X * (1 - seg(t, 0, 8000, E.inOutCubic));

    /* Formas de fundo: entram crescendo e flutuam em velocidades diferentes */
    op(R.shapes, 1);
    shapes.forEach((sh, i) => {
      const k = seg(t, 150 + i * 70, 950 + i * 70, E.outBack);
      const floatY = M * 14 * sh.depth * Math.sin(s * 0.7 + sh.phase);
      const floatX = M * 8 * sh.depth * Math.cos(s * 0.5 + sh.phase);
      const x = sh.x - sh.depth * camX + floatX;
      const y = sh.y + sh.depth * cam * 1.4 + floatY;
      op(sh.el, M ? clamp(k * 4) : seg(t, 150 + i * 70, 950 + i * 70));
      tf(sh.el, `${tr(x, y)} scale(${r3(M ? Math.max(0, k) : 1)})`);
    });

    /* 01 · Barra de carregamento (começa a peça) */
    op(R.bar, 1);
    tf(R.bar, tr(0, DEPTH.bar * cam));
    const draw = seg(t, 200, 1200, E.inOutCubic);
    set(R.barTrack, 'strokeDashoffset', String(r3(1 - draw)));
    const pop = seg(t, 1000, 1450, E.outBack);
    const p = progressAt(t);
    const width = Math.max(BAR_MIN, p * BAR_INNER);
    set(R.barFill, 'width', r2(width) + 'px');
    tf(R.barFill, `scale(${r3(M ? Math.max(0, pop) : 1)})`);
    op(R.barFill, M ? clamp(pop * 3) : seg(t, 1000, 1450));
    tf(R.barStripes, tr(M ? -mod(s * 60, STRIPE_PERIOD) : 0, 0));
    op(R.barStripes, seg(t, 1500, 2200));

    /* 02 · "Fotos sendo adicionadas" */
    op(R.label, 1);
    tf(R.label, tr(0, DEPTH.label * cam));
    revealWords(splits.labelWords, t, 1500, 140, 700, M);
    splits.labelChars.forEach((el, i) => {
      const a = 2050 + i * 45;
      const k = seg(t, a, a + 520, E.outBack);
      // onda leve e recorrente nas letras, como se as fotos continuassem chegando
      const loop = ta > 7000 ? mod(ta - 7000, 3200) : -1;
      const wave = loop >= 0 ? pulse(loop, i * 55, i * 55 + 420) : 0;
      op(el, M ? clamp(k * 2.5) : seg(t, a, a + 300));
      tf(el, M ? `translate3d(0, ${r2((1 - k) * 46 - wave * 9)}px, 0) scale(${r3(lerp(0.6, 1, clamp(k)))})` : 'none');
    });

    /* 03 · Nome do evento */
    op(R.title, 1);
    tf(R.title, tr(0, DEPTH.title * cam));
    revealWords(splits.titleWords, t, 2900, 110, 750, M);

    /* 04 · Link no topo: parte em negrito desce; o domínio é "digitado" */
    op(R.url, 1);
    tf(R.url, tr(0, DEPTH.url * cam));
    splits.urlWords.forEach((el) => {
      const k = seg(t, 3800, 4500, E.outQuart);
      tf(el, M ? `translate3d(0, ${r2((k - 1) * 115)}%, 0)` : 'none');
      op(el, M ? 1 : k);
    });
    splits.urlChars.forEach((el, i) => {
      const a = 4350 + i * 45;
      const k = seg(t, a, a + 260, E.outCubic);
      op(el, k);
      tf(el, M ? tr((1 - k) * -10, 0) : 'none');
    });

    /* 05 · QR code: padrões de posição giram e encaixam; módulos em onda diagonal */
    op(R.qr, 1);
    tf(R.qr, tr(0, DEPTH.qr * cam));
    finders.forEach((g, i) => {
      const a = 5000 + i * 120;
      const k = seg(t, a, a + 600, E.outBack);
      op(g, M ? clamp(k * 3) : seg(t, a, a + 300));
      tf(g, M ? `rotate(${r2((1 - k) * -90)}deg) scale(${r3(Math.max(0, k))})` : 'none');
    });
    modules.forEach(({ el, r, c }) => {
      const a = 5350 + (r + c) * 26;
      const k = seg(t, a, a + 340, E.outBack);
      op(el, M ? clamp(k * 3) : seg(t, a, a + 200));
      tf(el, M ? `scale(${r3(Math.max(0, k))})` : 'none');
    });

    // controles
    R.ctrlTime.textContent = `${(t / 1000).toFixed(1).padStart(4, '0')} / ${(DURATION / 1000).toFixed(1)}`;
  }

  /* --- relógio ----------------------------------------------------------- */

  let startAt = 0;
  let pausedAt = null;
  let raf = 0;
  const frozen = params.has('t') ? Math.max(0, Number(params.get('t')) || 0) : null;

  const elapsed = () => (pausedAt !== null ? pausedAt : performance.now() - startAt);

  function tick() {
    render(elapsed());
    R.btnPause.textContent = pausedAt !== null ? 'Continuar' : 'Pausar';
    if (pausedAt === null) raf = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(raf);
    startAt = performance.now();
    pausedAt = null;
    tick();
  }
  function togglePause() {
    if (pausedAt === null) {
      pausedAt = elapsed();
    } else {
      startAt = performance.now() - pausedAt;
      pausedAt = null;
    }
    cancelAnimationFrame(raf);
    tick();
  }

  R.btnRestart.addEventListener('click', restart);
  R.btnPause.addEventListener('click', togglePause);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  });
  window.addEventListener('resize', fitStage);
  reduceMotion.addEventListener?.('change', () => { cache.clear(); cancelAnimationFrame(raf); tick(); });

  /* --- início ------------------------------------------------------------ */

  if (params.has('clean')) document.documentElement.classList.add('is-clean');
  fitStage();
  render(0);

  const FONTS = ['italic 300 59px Montserrat', 'italic 800 64px Montserrat'];
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all(FONTS.map((f) => document.fonts.load(f, 'Fotos sendo adicionadas 4º').catch(() => null)))
        .then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 2500)),
    ])
    : Promise.resolve();

  // API mínima para exportação quadro a quadro (tools/render-video.js).
  window.story = {
    duration: DURATION,
    ready: fontsReady.then(() => undefined),
    fontsOk: () => FONTS.every((f) => document.fonts.check(f)),
    seek(t) {
      cancelAnimationFrame(raf);
      raf = 0;
      pausedAt = Math.max(0, t);
      render(pausedAt);
    },
  };

  fontsReady.then(() => {
    cache.clear();
    if (frozen !== null) {
      pausedAt = frozen;
      tick();
    } else {
      restart();
    }
  });
})();
