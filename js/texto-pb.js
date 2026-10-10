/* ==========================================================================
   FOTOS DISPONÍVEIS — versão em preto e branco
   --------------------------------------------------------------------------
   Assim como o story principal, tudo é uma função pura do tempo: render(t).

     0,0–0,6 s  cantos de visor de câmera se fecham sobre o quadro
     0,3–1,4 s  "FOTOS" sobe letra por letra de dentro de uma máscara
     0,9–2,6 s  "DISPONÍVEIS" sobe e o espaçamento entre letras se fecha
     2,2–2,9 s  barra sob o título se desenha a partir do centro
     3,2–4,1 s  clique de obturador: flash branco e uma íris circular
                inverte a peça para preto sobre branco
     4,1–6,0 s  tela final (zoom lento contínuo)

   Parâmetros de URL: ?t=<ms> congela um quadro · ?clean esconde os controles
   Teclado: R reinicia · Espaço pausa/continua
   ========================================================================== */
(() => {
  'use strict';

  const DURATION = 6000;
  const STAGE_W = 1080;
  const STAGE_H = 1920;
  const TITLE_W = 880;                          // largura de "DISPONÍVEIS" no fim
  const IRIS_MAX = Math.hypot(STAGE_W, STAGE_H) / 2 + 20;

  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOutQuart: (p) => (p < 0.5 ? 8 * p ** 4 : 1 - Math.pow(-2 * p + 2, 4) / 2),
  };
  /** progresso de t entre start e start + dur, com easing */
  const prog = (t, start, dur, ease = E.outExpo) => ease(clamp((t - start) / dur));

  /* --- montagem ---------------------------------------------------------- */

  const stage = document.getElementById('stage');
  const dark = stage.querySelector('.layer--dark');

  for (const word of dark.querySelectorAll('[data-word]')) {
    for (const c of word.dataset.word) {
      const mask = document.createElement('span');
      mask.className = 'ch';
      const inner = document.createElement('span');
      inner.textContent = c;
      mask.appendChild(inner);
      word.appendChild(mask);
    }
  }

  // A camada clara é um clone exato, com as cores invertidas pelo CSS.
  const light = dark.cloneNode(true);
  light.classList.replace('layer--dark', 'layer--light');
  light.setAttribute('aria-hidden', 'true');
  dark.after(light);

  const layers = [dark, light].map((el) => {
    const [big, small] = el.querySelectorAll('.word');
    return {
      el,
      title: el.querySelector('.title'),
      big,
      small,
      bigCh: [...big.querySelectorAll('.ch > span')],
      smallCh: [...small.querySelectorAll('.ch > span')],
      corners: [...el.querySelectorAll('.frame i')],
      bar: el.querySelector('.bar'),
    };
  });
  const flash = stage.querySelector('.flash');

  /** ajusta os tamanhos de fonte para "DISPONÍVEIS" ocupar TITLE_W */
  function layout() {
    const probe = layers[0].small;
    probe.style.letterSpacing = '0.12em';
    probe.style.marginRight = '-0.12em';
    stage.style.setProperty('--fs-small', '100px');
    const w = probe.offsetWidth;
    const fsSmall = 100 * (TITLE_W / w);
    stage.style.setProperty('--fs-small', `${fsSmall.toFixed(1)}px`);
    stage.style.setProperty('--fs', `${(fsSmall * 1.95).toFixed(1)}px`);
    stage.style.setProperty('--bar-y', `${(fsSmall * 1.95 * 0.5 + fsSmall * 0.5 + 70).toFixed(0)}px`);
  }

  function fitStage() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const gutter = w > 720 && !params.has('clean') ? 48 : 0;
    stage.style.setProperty('--scale', Math.min((w - gutter) / STAGE_W, (h - gutter) / STAGE_H).toFixed(5));
  }

  /* --- render ------------------------------------------------------------ */

  function render(t) {
    const still = reduceMotion.matches;

    // cantos do visor: aparecem afastados e se fecham sobre o quadro
    const pf = prog(t, 0, 600, E.outQuart);
    const off = still ? 0 : lerp(60, 0, pf);
    const sx = [-1, 1, -1, 1];
    const sy = [-1, -1, 1, 1];

    // letras de "FOTOS"
    const big = (i) => prog(t, 300 + i * 80, 750, E.outExpo);
    // letras de "DISPONÍVEIS"
    const small = (i) => prog(t, 900 + i * 45, 700, E.outExpo);
    const spacing = lerp(0.6, 0.12, prog(t, 900, 1700, E.outCubic));

    const bar = prog(t, 2200, 700, E.outExpo);
    const zoom = still ? 1 : 1 + 0.035 * clamp(t / DURATION) + 0.01 * Math.max(0, t - DURATION) / DURATION;

    for (const L of layers) {
      L.corners.forEach((c, i) => {
        c.style.opacity = pf.toFixed(3);
        c.style.transform = `translate(${sx[i] * off}px, ${sy[i] * off}px)`;
      });
      L.bigCh.forEach((c, i) => setLetter(c, big(i), still));
      L.smallCh.forEach((c, i) => setLetter(c, small(i), still));
      // margem negativa compensa o espaço após a última letra (centraliza)
      const ls = `${(still ? 0.12 : spacing).toFixed(4)}em`;
      L.small.style.letterSpacing = ls;
      L.small.style.marginRight = `-${ls}`;
      L.bar.style.transform = `scaleX(${bar.toFixed(4)})`;
      L.title.style.transform = `translateY(-50%) scale(${zoom.toFixed(4)})`;
    }

    // obturador: flash rápido + íris que inverte para preto sobre branco
    const fl = t < 3200 ? 0 : 1 - prog(t, 3200, 450, E.outCubic);
    flash.style.opacity = (still ? fl * 0.4 : fl * 0.85).toFixed(3);
    const iris = prog(t, 3200, 900, E.inOutQuart);
    light.style.clipPath = `circle(${(iris * IRIS_MAX).toFixed(1)}px at 50% 50%)`;
  }

  function setLetter(el, p, still) {
    if (still) {
      el.style.transform = 'none';
      el.style.opacity = p.toFixed(3);
    } else {
      el.style.transform = `translateY(${((1 - p) * 110).toFixed(2)}%)`;
      el.style.opacity = '1';
    }
  }

  /* --- relógio ----------------------------------------------------------- */

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
    timeEl.textContent = `${(Math.min(t, DURATION) / 1000).toFixed(1)} / ${(DURATION / 1000).toFixed(1)}`;
    pauseBtn.textContent = pausedAt !== null ? 'Continuar' : t >= DURATION ? 'Reproduzir' : 'Pausar';
    raf = pausedAt === null && t < DURATION ? requestAnimationFrame(tick) : 0;
  }

  function restart() {
    cancelAnimationFrame(raf);
    pausedAt = null;
    startAt = performance.now();
    tick();
  }

  function togglePause() {
    if (pausedAt === null && elapsed() >= DURATION) return restart();
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
  window.addEventListener('resize', () => { fitStage(); });
  reduceMotion.addEventListener?.('change', () => render(elapsed()));

  /* --- início ------------------------------------------------------------ */

  if (params.has('clean')) document.documentElement.classList.add('is-clean');
  fitStage();
  render(0);

  const FONTS = ['700 200px Poppins', '300 100px Poppins'];
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all(FONTS.map((f) => document.fonts.load(f, 'FOTOS DISPONÍVEIS').catch(() => null)))
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
