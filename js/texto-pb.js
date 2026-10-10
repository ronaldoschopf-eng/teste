/* ==========================================================================
   FOTOS DISPONÍVEIS — versão em preto e branco (fonte Batica Sans)
   --------------------------------------------------------------------------
   Só o texto, branco sobre preto. Tudo é uma função pura do tempo: render(t).

     0,2–1,3 s  "FOTOS" sobe letra por letra de dentro de uma máscara
     0,8–2,6 s  "DISPONÍVEIS" sobe e o espaçamento entre letras se fecha
     0,0–6,0 s  zoom lento contínuo no título

   Parâmetros de URL: ?t=<ms> congela um quadro · ?clean esconde os controles
   Teclado: R reinicia · Espaço pausa/continua
   ========================================================================== */
(() => {
  'use strict';

  const DURATION = 6000;
  const STAGE_W = 1080;
  const STAGE_H = 1920;
  const TITLE_W = 880;                          // largura de "DISPONÍVEIS" no fim
  const SPACING = 0.12;                         // espaçamento final de "DISPONÍVEIS" (em)

  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  };
  /** progresso de t entre start e start + dur, com easing */
  const prog = (t, start, dur, ease = E.outExpo) => ease(clamp((t - start) / dur));

  /* --- montagem ---------------------------------------------------------- */

  const stage = document.getElementById('stage');
  const title = stage.querySelector('.title');
  const [big, small] = title.querySelectorAll('[data-word]');

  for (const word of [big, small]) {
    for (const c of word.dataset.word) {
      const mask = document.createElement('span');
      mask.className = 'ch';
      const inner = document.createElement('span');
      inner.textContent = c;
      mask.appendChild(inner);
      word.appendChild(mask);
    }
  }
  const bigCh = [...big.querySelectorAll('.ch > span')];
  const smallCh = [...small.querySelectorAll('.ch > span')];

  /** ajusta os tamanhos de fonte para "DISPONÍVEIS" ocupar TITLE_W */
  function layout() {
    setSpacing(SPACING);
    stage.style.setProperty('--fs-small', '100px');
    const fsSmall = 100 * (TITLE_W / small.offsetWidth);
    stage.style.setProperty('--fs-small', `${fsSmall.toFixed(1)}px`);
    stage.style.setProperty('--fs', `${(fsSmall * 1.95).toFixed(1)}px`);
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
    bigCh.forEach((c, i) => setLetter(c, prog(t, 200 + i * 80, 750), still));
    smallCh.forEach((c, i) => setLetter(c, prog(t, 800 + i * 45, 700), still));
    setSpacing(still ? SPACING : lerp(0.6, SPACING, prog(t, 800, 1800, E.outCubic)));
    const zoom = still ? 1 : 1 + 0.035 * clamp(t / DURATION);
    title.style.transform = `translateY(-50%) scale(${zoom.toFixed(4)})`;
  }

  // a margem negativa compensa o espaço após a última letra (centraliza)
  function setSpacing(em) {
    small.style.letterSpacing = `${em.toFixed(4)}em`;
    small.style.marginRight = `-${em.toFixed(4)}em`;
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

  const FONTS = ['400 200px "Batica Sans"'];
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
