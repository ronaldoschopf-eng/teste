/* ==========================================================================
   FOTOS DISPONÍVEIS — linha do tempo
   --------------------------------------------------------------------------
   Toda a animação é uma função pura do tempo: render(t) recebe os
   milissegundos decorridos e posiciona cada elemento. Uma única fonte de
   tempo garante que anel, porcentagem, textos e cenas fiquem sincronizados,
   e permite congelar qualquer quadro com ?t=<ms>.

   Depois de 10 s a narrativa termina, mas o "ambiente" (círculos flutuando,
   orbe respirando) continua vivo até o usuário reiniciar.

   Parâmetros de URL:
     ?t=7500   congela a peça nesse instante (pré-visualização / captura)
     ?clean    esconde os controles (para gravação de tela)
     ?fade     termina com fade completo para preto (para gravação)
   Teclado: R reinicia · Espaço pausa/continua
   ========================================================================== */
(() => {
  'use strict';

  const DURATION = 10000;
  const STAGE_W = 1080;
  const STAGE_H = 1920;
  const HEADLINE_W = 860;
  const ORB_LOAD_Y = 1060;   // centro do orbe durante o carregamento
  const RING_R = 170;

  // Pontos de passagem da porcentagem (ms, %). Curva contínua e monotônica,
  // chega a 100 exatamente em 5 s.
  const PROGRESS_KEYS = [
    [2000, 0], [2300, 8], [2650, 17], [3100, 34],
    [3550, 52], [4050, 76], [4550, 91], [5000, 100],
  ];

  // Paralaxe: cada camada tem uma profundidade. Duas "câmeras" percorrem a
  // peça (carregamento 0–6 s, revelação 6–10 s); o deslocamento de cada camada
  // é profundidade × curso restante da câmera e chega a zero no fim de cada
  // ato. Textos mais baixos são mais "próximos", então começam afastados e se
  // acomodam em velocidades diferentes, sem se sobrepor.
  const PARALLAX = {
    loadRange: 200,
    revealRange: 260,
    depth: {
      event: 0.25, pct: 0.35, orb: 0.55, status: 0.85,
      hl1: 0.3, hl2: 0.42, finalEvent: 0.8, copy: 0.95, cta: 1.1,
    },
  };

  // Círculos de contorno flutuando nas laterais: [x, y, diâmetro, profundidade, cor].
  // Mais profundos (maiores) = mais próximos = sobem mais rápido. Ficam em
  // faixas laterais (x < 220 ou x > 860) para nunca cruzar os textos centrais.
  const CIRCLES = [
    [150, 80, 96, 0.55, ''],
    [935, 300, 150, 0.95, ''],
    [92, 640, 98, 0.6, ''],
    [1000, 980, 64, 0.4, 'orange'],
    [945, 1250, 100, 0.65, ''],
    [120, 1560, 112, 0.75, ''],
    [955, 1880, 160, 1.05, ''],
    [56, 1180, 46, 0.3, 'magenta'],
    [140, 2150, 120, 0.8, ''],
    [1012, 1720, 40, 0.3, ''],
  ];
  const CIRCLE_SPEED = 26;   // px/s na profundidade 1
  const WRAP_TOP = -260;
  const WRAP_SPAN = STAGE_H + 520;

  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- utilitários ------------------------------------------------------- */

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    linear: (p) => p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    outBack: (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2),
    inOutSine: (p) => (1 - Math.cos(Math.PI * p)) / 2,
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  };
  /** progresso 0→1 de t entre a e b, com easing */
  const seg = (t, a, b, ease = E.linear) => ease(clamp((t - a) / (b - a)));
  /** pulso 0→1→0 entre a e b */
  const pulse = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const pad = (n, len) => String(n).padStart(len, '0');
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

  /* --- referências ------------------------------------------------------- */

  const stage = document.getElementById('stage');
  const R = {};
  document.querySelectorAll('[data-ref]').forEach((el) => { R[el.dataset.ref] = el; });
  const dots = Array.from(R.statusBusy.querySelectorAll('.dot'));

  // Nome do evento: cada caractere vira um <span> para a revelação.
  const eventLines = Array.from(R.eventName.querySelectorAll('.event__line'));
  const lineTexts = eventLines.map((l) => l.textContent.trim());
  const chars = [];
  eventLines.forEach((line, li) => {
    line.textContent = '';
    for (const ch of lineTexts[li]) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      line.appendChild(span);
      chars.push(span);
    }
  });

  // Repete o nome na tela final.
  const finalLines = lineTexts.map((text) => {
    const line = document.createElement('span');
    line.className = 'final__line';
    const inner = document.createElement('span');
    inner.textContent = text;
    line.appendChild(inner);
    R.finalEvent.appendChild(line);
    return inner;
  });

  // Círculos de fundo.
  const circles = CIRCLES.map(([x, y, size, depth, color], i) => {
    const el = document.createElement('span');
    el.className = 'circle' + (color ? ` circle--${color}` : '');
    el.style.width = el.style.height = size + 'px';
    if (size < 70) el.style.borderWidth = '1.5px';
    R.circles.appendChild(el);
    return { el, x: x - size / 2, y: y - size / 2, size, depth, phase: i * 1.7 };
  });

  // Anel de progresso.
  const RING_C = 2 * Math.PI * RING_R;
  R.ringFill.style.strokeDasharray = `${RING_C} ${RING_C}`;

  /* --- layout (depende das fontes carregadas) ---------------------------- */

  const L = { eventOffset: 0, orbFinalY: 1110 };

  function layout() {
    // título: "disponíveis." ocupa a largura útil; "Fotos" usa o mesmo corpo
    R.hl2Inner.style.fontSize = '100px';
    const w = R.hl2Inner.offsetWidth;
    const fs = w > 0 ? (100 * HEADLINE_W) / w : 150;
    R.headline.style.fontSize = fs + 'px';
    R.hl2Inner.style.fontSize = '';

    const headBottom = R.headline.offsetTop + R.headline.offsetHeight;

    // bloco final o mais baixo possível dentro da área segura (até y = 1596)
    R.final.style.top = '0px';
    const fh = R.final.offsetHeight;
    const finalTop = Math.min(1310, 1596 - fh);
    R.final.style.top = finalTop + 'px';

    // orbe final centralizado entre título e bloco final
    L.orbFinalY = (headBottom + finalTop) / 2;

    // Cena 01: nome centralizado; depois sobe.
    L.eventOffset = 860 - (R.event.offsetTop + R.event.offsetHeight / 2);
  }

  function fitStage() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const gutter = w > 720 && !params.has('clean') ? 48 : 0;
    const s = Math.min((w - gutter) / STAGE_W, (h - gutter) / STAGE_H);
    stage.style.setProperty('--scale', s.toFixed(5));
  }

  /* --- render ------------------------------------------------------------ */

  const cache = new Map();
  /** escreve um estilo só quando muda */
  function set(el, prop, value) {
    let c = cache.get(el);
    if (!c) { c = {}; cache.set(el, c); }
    if (c[prop] !== value) {
      c[prop] = value;
      if (prop.startsWith('--')) el.style.setProperty(prop, value);
      else el.style[prop] = value;
    }
  }
  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }
  const op = (el, v) => set(el, 'opacity', (+clamp(v)).toFixed(3));
  const tf = (el, v) => set(el, 'transform', v);
  const r2 = (v) => Math.round(v * 100) / 100;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const ty = (y) => `translate3d(0, ${r2(y)}px, 0)`;
  const blur = (px) => (px > 0.05 ? `blur(${r2(px)}px)` : 'none');

  /** entrada suave: sobe, ganha nitidez e opacidade */
  function softIn(el, k, M, dy = 40, bl = 14, extraY = 0) {
    op(el, k);
    tf(el, ty((1 - k) * dy * M + extraY));
    set(el, 'filter', blur((1 - k) * bl * M));
  }

  /**
   * @param ta tempo total (ms), pode passar de DURATION — move o ambiente
   */
  function render(ta) {
    const t = Math.min(ta, DURATION);          // tempo da narrativa
    const M = reduceMotion.matches ? 0 : 1;    // multiplicador de movimento
    const s = ta / 1000;

    // câmeras da paralaxe (curso restante, em px)
    const camA = M * PARALLAX.loadRange * (1 - seg(t, 0, 6000, E.inOutSine));
    const camB = M * PARALLAX.revealRange * (1 - seg(t, 6000, 10000, E.inOutSine));
    const D = PARALLAX.depth;

    /* Círculos flutuantes */
    op(R.circles, 1);
    circles.forEach((c, i) => {
      const k = seg(t, 100 + i * 90, 1100 + i * 90, E.outCubic);
      const drift = M * CIRCLE_SPEED * c.depth * s;
      const y = mod(c.y - drift + c.depth * (camA + camB) - WRAP_TOP, WRAP_SPAN) + WRAP_TOP;
      const x = c.x + M * 12 * c.depth * Math.sin(s * 0.45 + c.phase);
      op(c.el, k * (0.35 + 0.6 * Math.min(1, c.depth)));
      tf(c.el, `translate3d(${r2(x)}px, ${r2(y)}px, 0) scale(${r3(lerp(0.7, 1, k))})`);
    });

    /* Progresso */
    const p = progressAt(t);
    const pInt = t >= 5000 ? 100 : Math.min(99, Math.floor(p));
    const bump = pulse(t, 5000, 5600);          // destaque em 100%
    const toFinal = seg(t, 6000, 6900, E.inOutCubic);
    const breathe = M ? Math.sin(Math.max(0, ta - 6900) / 1000 * 1.6) * seg(ta, 6900, 7900) : 0;

    /* Orbe + anel + brilho */
    // cena 01: ponto pulsante; cena 02: cresce com o progresso; 03: pulso; 04: posição final
    const dotIn = seg(t, 0, 300, E.outCubic);
    const blink = M && t < 1500 ? 0.75 + 0.25 * Math.cos(t / 120) : 1;
    const grow = seg(t, 1500, 2200, E.inOutCubic);
    const loadScale = lerp(0.09 * dotIn, 0.5, grow) + 0.35 * (p / 100);
    const orbScale = lerp(loadScale, 1, toFinal) + 0.22 * bump * M + 0.025 * breathe;
    const orbY = lerp(ORB_LOAD_Y + D.orb * camA, L.orbFinalY + D.orb * camB, toFinal);

    op(R.orbwrap, 1);
    tf(R.orbwrap, ty(orbY));
    op(R.orb, dotIn * blink);
    tf(R.orb, `scale(${r3(orbScale)})`);

    const ringIn = seg(t, 1650, 2150, E.outCubic);
    const ringOut = seg(t, 5050, 5900, E.outCubic);
    op(R.ring, ringIn * (1 - ringOut));
    tf(R.ring, `rotate(-90deg) scale(${r3(lerp(0.85, 1, ringIn) + 0.3 * ringOut * M)})`);
    set(R.ringFill, 'strokeDashoffset', r2(RING_C * (1 - p / 100)));

    [[R.ripple1, 5000], [R.ripple2, 5220]].forEach(([el, a]) => {
      const k = seg(t, a, a + 1100, E.outCubic);
      op(el, M && k > 0 && k < 1 ? 0.9 * (1 - k) : 0);
      tf(el, `scale(${r3(1 + 1.8 * k)})`);
    });

    const glowLevel = 0.18 + 0.55 * (p / 100) * grow;
    const glowO = lerp(glowLevel, 0.85, toFinal) + 0.25 * bump + 0.06 * breathe;
    const glowS = lerp(0.45 + 0.45 * (p / 100), 1, toFinal) + 0.12 * bump * M + 0.02 * breathe;
    op(R.glow, glowO * dotIn);
    tf(R.glow, `translate3d(0, ${r2(orbY)}px, 0) scale(${r3(glowS)})`);
    op(R.glowWarm, (0.25 + 0.75 * bump + 0.55 * toFinal) * dotIn * grow);
    tf(R.glowWarm, `translate3d(0, ${r2(orbY + 40)}px, 0) scale(${r3(glowS)})`);

    /* Nome do evento — caracteres surgem com desfoque */
    chars.forEach((el, i) => {
      const a = 520 + i * 24;
      const k = M ? seg(t, a, a + 460, E.outCubic) : seg(t, 520, 900);
      op(el, k);
      tf(el, ty((1 - k) * 22 * M));
      set(el, 'filter', blur((1 - k) * 10 * M));
    });
    let evY;
    let evO = 1;
    if (M) {
      evY = L.eventOffset * (1 - seg(t, 1500, 2250, E.inOutCubic));
    } else {
      evY = t < 1650 ? L.eventOffset : 0;
      evO = t < 1650 ? 1 - seg(t, 1500, 1650) : seg(t, 1650, 1900);
    }
    const evExit = seg(t, 7900, 8350, E.inOutCubic);
    evY += D.event * camA - 30 * evExit * M;
    op(R.event, evO * (1 - 0.45 * seg(t, 6000, 6600)) * (1 - evExit));
    tf(R.event, ty(evY));
    set(R.event, 'filter', blur(8 * evExit * M));

    /* CENA 02 — porcentagem e status */
    const loadIn = seg(t, 1650, 2150, E.outCubic);
    const pctOut = seg(t, 6000, 6450, E.inOutCubic);
    setText(R.pctNum, pad(pInt, 2));
    op(R.pct, loadIn * (1 - pctOut));
    tf(R.pct, `translate3d(0, ${r2(((1 - loadIn) * 30 - 40 * pctOut) * M + D.pct * camA)}px, 0) scale(${r3((1 + 0.08 * bump * M) * (1 - 0.3 * pctOut * M))})`);
    set(R.pct, 'filter', blur(((1 - loadIn) * 10 + pctOut * 14) * M));

    const statusIn = seg(t, 1800, 2300, E.outCubic);
    const statusOut = seg(t, 6000, 6350, E.inOutCubic);
    op(R.status, statusIn * (1 - statusOut));
    tf(R.status, ty((1 - statusIn) * 16 * M + D.status * camA));
    const swapOut = seg(t, 5000, 5260, E.inOutCubic);
    const swapIn = seg(t, 5120, 5440, E.outCubic);
    op(R.statusBusy, 1 - swapOut);
    tf(R.statusBusy, ty(-40 * swapOut * M));
    op(R.statusDone, swapIn);
    tf(R.statusDone, ty(40 * (1 - swapIn) * M));
    const dotCount = M ? Math.floor(Math.max(0, t - 1800) / 260) % 4 : 3;
    dots.forEach((d, i) => op(d, i < dotCount ? 1 : 0.15));

    /* CENA 04 — revelação */
    op(R.headline, t >= 6000 ? 1 : 0);
    softIn(R.hl1, seg(t, 6250, 7000, E.outCubic), M, 70, 18, D.hl1 * camB);
    softIn(R.hl2, seg(t, 6480, 7230, E.outCubic), M, 70, 18, D.hl2 * camB);
    const dot = seg(t, 7150, 7550, E.outBack);
    op(R.hl2Dot, M ? clamp(dot * 3) : 1);
    tf(R.hl2Dot, `scale(${r3(M ? dot : 1)})`);

    /* CENA 05 — tela final */
    op(R.final, t >= 7900 ? 1 : 0);
    finalLines.forEach((el, i) => {
      softIn(el, seg(t, 8050 + i * 130, 8700 + i * 130, E.outCubic), M, 34, 10);
    });
    tf(R.finalEvent, ty(D.finalEvent * camB));
    softIn(R.copy, seg(t, 8450, 9050, E.outCubic), M, 26, 8, D.copy * camB);
    softIn(R.cta, seg(t, 8750, 9350, E.outCubic), M, 26, 8, D.cta * camB);
    set(R.cta, '--underline', `${r2(100 * seg(t, 9050, 9750, E.inOutCubic))}%`);

    // ?fade → fecha totalmente em preto (para gravação em loop)
    op(R.blackout, params.has('fade') ? seg(t, 9400, 10000, E.inOutCubic) : 0);

    /* Controles */
    setText(R.ctrlTime, `${(t / 1000).toFixed(1).padStart(4, '0')} / ${(DURATION / 1000).toFixed(1)}`);
    tf(R.ctrlFill, `scaleX(${(t / DURATION).toFixed(4)})`);
  }

  /* --- relógio ----------------------------------------------------------- */

  let startAt = 0;
  let pausedAt = null;
  let raf = 0;
  const frozen = params.has('t') ? Math.max(0, parseFloat(params.get('t')) || 0) : null;

  const elapsed = () => (pausedAt !== null ? pausedAt : performance.now() - startAt);

  function tick() {
    const t = elapsed();
    render(t);
    const ambient = !reduceMotion.matches;  // após 10 s o ambiente continua vivo
    if (pausedAt === null && (t < DURATION || ambient)) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
    }
    setText(R.btnPause, pausedAt !== null ? 'Continuar' : t >= DURATION ? 'Reproduzir' : 'Pausar');
  }

  function restart() {
    cancelAnimationFrame(raf);
    pausedAt = null;
    startAt = performance.now();
    tick();
  }

  function togglePause() {
    if (pausedAt === null && elapsed() >= DURATION) return restart();
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

  // Aguarda as fontes (com limite) para medir o título e evitar troca no meio da peça.
  const FONTS = ['400 26px Poppins', '500 46px Poppins', '600 156px Poppins'];
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all(FONTS.map((f) => document.fonts.load(f, 'Fotos disponíveis 4º 0123456789%').catch(() => null)))
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
    layout();
    cache.clear();
    if (frozen !== null) {
      pausedAt = frozen;
      tick();
    } else {
      restart();
    }
  });
})();
