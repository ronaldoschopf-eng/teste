/* ==========================================================================
   FOTOS DISPONÍVEIS — formas que montam o texto (loop)
   --------------------------------------------------------------------------
   Recriação de uma referência em loop de 74 quadros a 30 fps (≈ 2,47 s).
   Tudo é desenhado num canvas como função pura do quadro f do ciclo:

     f  0–7    o texto some (fade)
     f  5–20   três arcos entram de fora girando, encolhem e engrossam
               até virar três pontos
     f 20–32   os três pontos giram devagar em triângulo e param
     f 32–38   os pontos se esticam em barras verticais, que caem e afinam
     f 37–58   pedaços das letras surgem do centro para as bordas, com
               traços curvos, tracinhos e pontos que se desenham e somem
     f 58–74   texto parado

   A peça tem um ciclo com o nome do evento e um segundo em que a tela
   vira branca a partir do centro (f 1–11) e, sem as formas, "Fotos
   Disponíveis" é datilografado letra por letra, com um cursor que
   continua piscando no fim (mais 1 s parado). No nome do evento, "Capoeira"
   ganha um marca-texto rosa que se desenha da esquerda para a direita.

   As medidas da referência foram convertidas para U (o tamanho de fonte da
   referência), escalado para a largura do nosso bloco de texto.

   Parâmetros de URL: ?t=<ms> congela um quadro · ?clean esconde os controles
   Teclado: R reinicia · Espaço pausa/continua
   ========================================================================== */
(() => {
  'use strict';

  const STAGE_W = 1080;
  const STAGE_H = 1920;
  const FPS = 30;
  const CYCLE = 74;                              // quadros por ciclo
  const CYCLE_MS = (CYCLE / FPS) * 1000;
  const OUTRO = CYCLE;                           // um ciclo com o nome do evento
  const END_HOLD = 30;                           // quadros parados no fim, com "Fotos Disponíveis"
  const TEXT_A = ['4º Festival', 'Barra Vento', 'de Capoeira'];
  const TEXT_B = ['Fotos', 'Disponíveis'];
  const TITLE_W = 528;                           // largura de "Disponíveis"
  const TRACKING = -0.05;                        // espaçamento entre letras: -50
  const LINE_H = 0.88;                           // entrelinha
  const FONT = '"Batica Sans", "Helvetica Neue", Arial, sans-serif';
  const WHITE = '#FFFFFF';
  const ORANGE = '#EA622F';
  const PINK = '#D12384';                        // marca-texto sob "Capoeira"
  const HIGHLIGHT = 'Capoeira';
  const TYPE_START = 12;                         // quadro (após a tela branca) em que a digitação começa
  const TYPE_RATE = 2;                           // quadros por letra
  const TYPED = TEXT_B.join('').replace(/ /g, '').length * TYPE_RATE;
  const TOTAL = OUTRO + TYPE_START + TYPED + END_HOLD;   // em quadros
  const DURATION = (TOTAL / FPS) * 1000;
  let fg = WHITE;                                // cores do ciclo atual (invertidas no final)
  let bg = ORANGE;

  const params = new URLSearchParams(location.search);
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  /* --- utilitários ------------------------------------------------------- */

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const rad = (d) => (d * Math.PI) / 180;
  const E = {
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inCubic: (p) => p * p * p,
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  };
  const span = (f, a, b) => clamp((f - a) / (b - a));

  /** interpolação cúbica monotônica (sem "passar" dos valores-chave) */
  function curve(keys) {
    const n = keys.length;
    const x = keys.map((k) => k[0]);
    const y = keys.map((k) => k[1]);
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
    const m = y.map((_, i) => {
      if (i === 0) return d[0];
      if (i === n - 1) return d[n - 2];
      return d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    });
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i];
      const b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
    }
    return (f) => {
      if (f <= x[0]) return y[0];
      if (f >= x[n - 1]) return y[n - 1];
      let i = 0;
      while (f > x[i + 1]) i++;
      const h = x[i + 1] - x[i];
      const t = (f - x[i]) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i]
        + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  /** gerador pseudoaleatório com semente (o mesmo desenho a cada execução) */
  function random(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --- traçado ----------------------------------------------------------- */

  function line(x1, y1, x2, y2, w, color = fg) {
    if (w <= 0.2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + (x1 === x2 && y1 === y2 ? 0.01 : 0), y2);
    ctx.stroke();
  }

  function arc(cx, cy, r, a0, a1, w) {
    if (w <= 0.2 || r <= 0) return;
    if (Math.abs(a1 - a0) < 0.002) a1 = a0 + 0.002;
    ctx.strokeStyle = fg;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
  }

  function dot(x, y, r) {
    if (r <= 0.2) return;
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* --- layout do texto --------------------------------------------------- */

  let U = 126;          // unidade da referência em px
  let C = { x: STAGE_W / 2, y: STAGE_H / 2 };
  let fs = 100;
  let textA = null;     // { glyphs, swooshes } de cada frase
  let textB = null;
  let capH = 70;        // altura das maiúsculas, para o cursor

  function setFont(size) {
    ctx.font = `400 ${size}px ${FONT}`;
    ctx.letterSpacing = `${(TRACKING * size).toFixed(3)}px`;
  }

  /** largura visual de um texto (sem o espaçamento após a última letra) */
  const textW = (s) => ctx.measureText(s).width - TRACKING * fs;

  function layout() {
    fs = 100;
    setFont(fs);
    fs = 100 * (TITLE_W / textW('Disponíveis'));
    setFont(fs);
    U = 110 * (TITLE_W / 460);                   // "famolus": 460 px de largura a 110 px de fonte
    capH = ctx.measureText('H').actualBoundingBoxAscent;
    textA = build(TEXT_A, 20251010);
    textA.highlight = marker(textA.glyphs, HIGHLIGHT);
    textB = build(TEXT_B, 20251011);
  }

  /** retângulo de marca-texto sob uma palavra: cobre a metade de baixo das letras */
  function marker(glyphs, word) {
    const gs = glyphs.filter((g) => g.word === word);
    const xh = ctx.measureText('x').actualBoundingBoxAscent;
    const x0 = gs[0].x - 0.08 * fs;
    const x1 = gs[gs.length - 1].x + gs[gs.length - 1].w + 0.08 * fs;
    const base = gs[0].baseline;
    return { x: x0, y: base - xh * 0.62, w: x1 - x0, h: xh * 0.62 + 0.14 * fs };
  }

  function drawMarker(m, p, yoff = 0) {
    if (!m || p <= 0) return;
    ctx.fillStyle = PINK;
    ctx.fillRect(m.x, m.y + yoff, m.w * p, m.h);
  }

  /** máquina de escrever: uma letra a cada TYPE_RATE quadros, com cursor */
  function drawTyping({ glyphs }, f) {
    if (f < TYPE_START) return;
    const shown = Math.min(glyphs.length, Math.floor((f - TYPE_START) / TYPE_RATE) + 1);
    ctx.fillStyle = fg;
    for (let i = 0; i < shown; i++) ctx.fillText(glyphs[i].ch, glyphs[i].x, glyphs[i].baseline);

    // cursor logo depois da última letra; fixo enquanto digita, piscando no fim
    const typedAt = TYPE_START + glyphs.length * TYPE_RATE;
    if (f >= typedAt && Math.floor((f - typedAt) / 8) % 2 === 0) return;
    const g = glyphs[shown - 1];
    const x = g.x + g.w + 0.08 * fs;             // largura medida já desconta o espaçamento -50
    ctx.fillRect(x, g.baseline - capH, 0.06 * fs, capH + 0.08 * fs);
  }

  /** posiciona as letras de uma frase (linhas centradas) e sorteia os detalhes da montagem */
  function build(lines, seed) {
    const m = ctx.measureText('Hp');
    const asc = m.fontBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent;
    const lh = LINE_H * fs;
    const top = C.y - (lh * lines.length) / 2;   // bloco centrado
    const rnd = random(seed);
    const glyphs = [];
    lines.forEach((text, li) => {
      const baseline = top + li * lh + (lh - (asc + desc)) / 2 + asc;
      const x0 = C.x - textW(text) / 2;
      [...text].forEach((ch, i) => {
        if (ch === ' ') return;
        const word = text.slice(text.lastIndexOf(' ', i) + 1).split(' ')[0];
        const x = x0 + ctx.measureText(text.slice(0, i)).width;
        const gm = ctx.measureText(ch);
        const gTop = baseline - gm.actualBoundingBoxAscent;
        const gBot = baseline + gm.actualBoundingBoxDescent;
        const w = gm.width;
        const cx = x + w / 2;
        const cy = (gTop + gBot) / 2;
        const dn = Math.abs(cx - C.x) / (TITLE_W / 2);   // 0 no centro, 1 nas bordas
        const start = 38 + dn * 7 + rnd() * 2;
        const bands = [0, 1, 2].map((k) => ({
          at: start + k * 1.3 + rnd() * 1.2,
          dx: (rnd() - 0.5) * 0.5 * U,
          dy: (0.1 + rnd() * 0.3) * U,
        }));
        glyphs.push({
          ch, line: li, word, x, baseline, cx, cy, w, top: gTop, bot: gBot, start, bands,
          arc: rnd() < 0.3 ? {
            x: cx + (rnd() - 0.5) * 0.4 * U,
            y: cy + (rnd() - 0.3) * 0.4 * U,
            r: (0.3 + rnd() * 0.35) * U,
            a: rnd() * 360,
            sweep: (80 + rnd() * 90) * (rnd() < 0.5 ? -1 : 1),
          } : null,
          dash: rnd() < 0.3 ? { x: cx + (rnd() - 0.2) * 0.5 * U, y: gTop - rnd() * 0.25 * U, len: (0.08 + rnd() * 0.08) * U } : null,
          spark: rnd() < 0.25 ? { x: cx + (rnd() - 0.5) * 0.6 * U, rise: (0.9 + rnd() * 0.6) * U } : null,
        });
      });
    });

    // grandes traços curvos que atravessam várias letras
    const l1 = glyphs[0];
    const l2 = glyphs[glyphs.length - 1];
    const swooshes = [
      { x: C.x + 0.2 * U, y: l2.baseline + 1.5 * U, r: 2.1 * U, a0: 205, a1: 300, from: 40, to: 51 },
      { x: C.x - 0.4 * U, y: l1.baseline + 1.1 * U, r: 1.5 * U, a0: 215, a1: 320, from: 41, to: 52 },
    ];
    return { glyphs, swooshes };
  }

  /* --- fases ------------------------------------------------------------- */

  // arcos → pontos (centro, raio e espessura em U; ângulos em graus)
  const ARC = {
    cy: curve([[5, 0.15], [12, 0.15], [20, -0.63], [32, -0.63]]),
    r: curve([[5, 3.4], [8, 2.9], [10, 2.5], [12, 2.0], [14, 1.36], [16, 0.64], [18, 0.47], [20, 0.5]]),
    len: curve([[5, 1], [8, 8], [10, 22], [12, 42], [14, 58], [16, 55], [18, 30], [20, 0]]),
    w: curve([[5, 0.05], [10, 0.1], [14, 0.13], [16, 0.2], [18, 0.32], [20, 0.36]]),
    rot: curve([[5, -80], [14, 150], [20, 250], [26, 282], [32, 290]]),
    base: [-405, -285, -165],        // em f32 os pontos ficam a -115°, 5° e 125°
  };

  function drawArcs(f) {
    if (f < 5 || f >= 32) return;
    const cy = C.y + ARC.cy(f) * U;
    const r = ARC.r(f) * U;
    const len = ARC.len(f);
    const w = ARC.w(f) * U * (f < 7 ? span(f, 5, 7) : 1);
    const rot = ARC.rot(f);
    for (const b of ARC.base) {
      const mid = rot + b;
      arc(C.x, cy, r, rad(mid - len / 2), rad(mid + len / 2), w);
    }
  }

  // pontos → barras que caem: [x1, y1, x2, y2, espessura] em U, relativos a C
  const BARS = [
    [[32, -0.21, -1.08, -0.21, -1.08, 0.36], [33, -0.14, -0.95, 0.02, -0.32, 0.3], [34, 0, -0.64, 0, 1.09, 0.36],
      [35, 0, 0.36, 0, 1.64, 0.3], [36, -0.1, 1.2, -0.1, 1.8, 0.25], [37, -0.05, 1.8, -0.05, 1.9, 0.15], [38, 0, 2.2, 0, 2.2, 0]],
    [[32, 0.5, -0.59, 0.5, -0.59, 0.36], [33, 0.5, -0.55, 0.5, 0, 0.32], [34, 0.5, -0.45, 0.5, 1.18, 0.25],
      [35, 0.45, -0.14, 0.45, 1.82, 0.1], [36, 0.45, 0.45, 0.45, 1.9, 0.08], [37, 0.45, 1.5, 0.45, 2.0, 0.06], [38, 0.45, 2.2, 0.45, 2.2, 0]],
    [[32, -0.29, -0.21, -0.29, -0.21, 0.36], [33, -0.35, -0.09, -0.35, -0.09, 0.35], [34, -0.45, 0.36, -0.45, 1.27, 0.3],
      [35, -0.64, 1.5, -0.6, 1.82, 0.1], [36, -0.6, 1.85, -0.55, 1.95, 0.08], [37, -0.58, 2.0, -0.55, 2.0, 0]],
  ].map((keys) => [1, 2, 3, 4, 5].map((c) => curve(keys.map((k) => [k[0], k[c]]))));

  function drawBars(f) {
    if (f < 32 || f >= 38) return;
    BARS.forEach(([x1, y1, x2, y2, w], i) => {
      const X1 = C.x + x1(f) * U;
      const Y1 = C.y + y1(f) * U;
      const X2 = C.x + x2(f) * U;
      const Y2 = C.y + y2(f) * U;
      const W = Math.max(0, w(f)) * U;
      line(X1, Y1, X2, Y2, W);
      // o primeiro ponto ganha um furo, que vira uma fenda ao esticar
      if (i === 0 && f > 32.3 && f < 35.6) {
        const p = 0.12 + 0.05 * span(f, 32.3, 34);
        const q = lerp(p, 0.62, span(f, 32.6, 34));
        line(lerp(X1, X2, p), lerp(Y1, Y2, p), lerp(X1, X2, q), lerp(Y1, Y2, q), 0.06 * U, bg);
      }
    });
  }

  function drawText({ glyphs, highlight }, alpha) {
    ctx.globalAlpha = alpha;
    drawMarker(highlight, 1);
    ctx.fillStyle = fg;
    for (const g of glyphs) ctx.fillText(g.ch, g.x, g.baseline);
    ctx.globalAlpha = 1;
  }

  function drawAssembly({ glyphs, swooshes, highlight }, f) {
    if (f < 36) return;
    const yoff = (1 - E.outCubic(span(f, 37, 51))) * 0.3 * U;
    // o marca-texto passa da esquerda para a direita depois que a palavra se monta
    drawMarker(highlight, E.outCubic(span(f, 49, 58)), yoff);
    ctx.fillStyle = fg;

    for (const g of glyphs) {
      // a letra surge em três faixas horizontais que se encaixam
      const h = (g.bot - g.top) + 0.3 * U;
      const y0 = g.top - 0.15 * U;
      g.bands.forEach((b, k) => {
        if (f < b.at) return;
        const p = E.outCubic(span(f, b.at, b.at + 4));
        ctx.save();
        ctx.beginPath();
        ctx.rect(g.x - 0.3 * U, y0 + yoff + (h * k) / 3, g.w + 0.6 * U, h / 3 + 0.5);
        ctx.clip();
        ctx.fillText(g.ch, g.x + b.dx * (1 - p), g.baseline + yoff + b.dy * (1 - p));
        ctx.restore();
      });

      // traço curvo que se desenha e se recolhe
      if (g.arc) {
        const a = g.arc;
        const head = E.outCubic(span(f, g.start - 3, g.start + 3));
        const tail = E.inCubic(span(f, g.start + 1, g.start + 7));
        if (head > tail) arc(a.x, a.y + yoff, a.r, rad(a.a + a.sweep * tail), rad(a.a + a.sweep * head), 0.07 * U);
      }
      // tracinho
      if (g.dash && f >= g.start - 1 && f < g.start + 5) {
        const d = g.dash;
        line(d.x, d.y + yoff, d.x + d.len, d.y + yoff, 0.05 * U);
      }
      // ponto que sobe e some
      if (g.spark && f >= g.start - 4 && f < g.start + 2) {
        const p = span(f, g.start - 4, g.start + 2);
        dot(g.spark.x, g.cy - p * g.spark.rise, 0.045 * U * (1 - p * 0.5));
      }
    }

    for (const s of swooshes) {
      const head = E.outCubic(span(f, s.from, s.from + 6));
      const tail = E.inCubic(span(f, s.from + 3, s.to));
      if (head > tail) arc(s.x, s.y + yoff, s.r, rad(lerp(s.a0, s.a1, tail)), rad(lerp(s.a0, s.a1, head)), 0.08 * U);
    }

    // último tracinho residual ao lado da última letra
    if (f >= 50 && f < 58) {
      const g = glyphs[glyphs.length - 1];
      line(g.x + g.w + 0.08 * U, g.top + 0.1 * U, g.x + g.w + 0.16 * U, g.top + 0.1 * U, 0.05 * U);
    }
  }

  function render(t) {
    const F = ((t / 1000) * FPS) % TOTAL;        // quadro na linha do tempo inteira
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    ctx.lineCap = 'round';
    ctx.textBaseline = 'alphabetic';
    setFont(fs);

    fg = WHITE;
    bg = ORANGE;
    let f = F % CYCLE;
    let text = textA;
    if (F >= OUTRO) {
      // último ciclo: o nome do evento some, a tela vira branca a partir
      // do centro e "Fotos Disponíveis" é datilografado, sem as formas
      f = F - OUTRO;                             // segue além do ciclo para o cursor piscar
      if (f < 7) drawText(textA, 1 - E.inOutSine(f / 7));
      const wipe = E.outCubic(span(f, 1, 11)) * Math.hypot(STAGE_W, STAGE_H) / 2;
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.arc(C.x, C.y, wipe + 1, 0, Math.PI * 2);
      ctx.fill();
      fg = ORANGE;
      bg = WHITE;
      text = textB;
    } else if (f < 7) {
      drawText(textA, 1 - E.inOutSine(f / 7));
    }
    if (text === textB) {
      drawTyping(text, f);                       // só a máquina de escrever, sem as formas
    } else {
      drawArcs(f);
      drawBars(f);
      drawAssembly(text, f);
    }
  }

  /* --- palco e relógio --------------------------------------------------- */

  const stage = document.getElementById('stage');
  function fitStage() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const gutter = w > 720 && !params.has('clean') ? 48 : 0;
    stage.style.setProperty('--scale', Math.min((w - gutter) / STAGE_W, (h - gutter) / STAGE_H).toFixed(5));
  }

  const timeEl = document.querySelector('[data-ref="time"]');
  const pauseBtn = document.querySelector('[data-ref="pause"]');
  const restartBtn = document.querySelector('[data-ref="restart"]');
  let startAt = performance.now();
  let pausedAt = null;
  let raf = 0;
  const elapsed = () => (pausedAt !== null ? pausedAt : performance.now() - startAt);

  function tick() {
    const t = elapsed();
    render(t);
    timeEl.textContent = `${((t % DURATION) / 1000).toFixed(1)} / ${(DURATION / 1000).toFixed(1)}`;
    pauseBtn.textContent = pausedAt !== null ? 'Continuar' : 'Pausar';
    raf = pausedAt === null ? requestAnimationFrame(tick) : 0;
  }

  function restart() {
    cancelAnimationFrame(raf);
    pausedAt = null;
    startAt = performance.now();
    tick();
  }

  function togglePause() {
    if (pausedAt === null) pausedAt = elapsed();
    else { startAt = performance.now() - pausedAt; pausedAt = null; }
    cancelAnimationFrame(raf);
    tick();
  }

  restartBtn.addEventListener('click', restart);
  pauseBtn.addEventListener('click', togglePause);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  });
  window.addEventListener('resize', fitStage);

  /* --- início ------------------------------------------------------------ */

  if (params.has('clean')) document.documentElement.classList.add('is-clean');
  fitStage();

  const FONTS = ['400 100px "Batica Sans"'];
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all(FONTS.map((f) => document.fonts.load(f, '4º Festival Barra Vento de Capoeira Fotos Disponíveis').catch(() => null)))
        .then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 2500)),
    ])
    : Promise.resolve();

  // Mesma API do story principal, usada por tools/render-video.js.
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

  const frozen = params.has('t') ? Math.max(0, parseFloat(params.get('t')) || 0) : null;
  fontsReady.then(() => {
    layout();
    if (frozen !== null) { pausedAt = frozen; tick(); } else restart();
  });
})();
