/* ==========================================================================
   FOTOS DISPONÍVEIS — linha do tempo
   --------------------------------------------------------------------------
   Toda a animação é uma função pura do tempo: render(t) recebe os
   milissegundos decorridos e posiciona cada elemento. Uma única fonte de
   tempo garante que barra, porcentagem, textos e cenas fiquem sincronizados,
   e permite congelar qualquer quadro com ?t=<ms>.

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
  const CONTENT_W = 888;

  // Pontos de passagem da porcentagem (ms, %). A curva é interpolada de forma
  // contínua e monotônica — sem saltos — e chega a 100 exatamente em 5 s.
  const PROGRESS_KEYS = [
    [2000, 0], [2300, 8], [2650, 17], [3100, 34],
    [3550, 52], [4050, 76], [4550, 91], [5000, 100],
  ];

  const SCENES = [
    [0, '01 / INICIALIZAÇÃO'],
    [1500, '02 / CARREGAMENTO'],
    [5000, '03 / CONCLUSÃO'],
    [6000, '04 / REVELAÇÃO'],
    [8000, '05 / ACESSO LIBERADO'],
  ];

  const TYPE_START = 620;   // início da digitação do nome
  const TYPE_STEP = 22;     // ms por caractere
  const SCRAMBLE = 70;      // ms em que cada caractere "decodifica"
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%/+=<>';

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
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    inOutQuart: (p) => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
  };
  /** progresso 0→1 de t entre a e b, com easing */
  const seg = (t, a, b, ease = E.linear) => ease(clamp((t - a) / (b - a)));
  /** pulso 0→1→0 entre a e b */
  const pulse = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const pad = (n, len) => String(n).padStart(len, '0');
  const hash = (a, b) => {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  };

  /** Interpolação cúbica monotônica (Fritsch–Carlson). */
  function monotoneCurve(points) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const n = xs.length;
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    const m = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    // m[0] = m[n-1] = 0 → arranque e chegada suaves
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
  const $$ = (sel) => Array.from(stage.querySelectorAll(sel));

  const gridV = $$('.grid__v');
  const gridH = $$('.grid__h');
  const crosses = $$('.cross');
  const huds = $$('.hud');
  const loaderParts = [R.status, R.count];
  const seqBars = Array.from(R.seq.children);
  const dots = Array.from(R.statusBusy.querySelectorAll('.dot'));

  const TOTAL_RECORDS = parseInt(R.countTotal.textContent, 10) || 1284;

  // Nome do evento: cada caractere vira um <span> para a digitação.
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
      chars.push({ el: span, ch, state: -1, glyph: ch, blank: ch === ' ' });
    }
  });
  const TYPE_END = TYPE_START + (chars.length - 1) * TYPE_STEP + SCRAMBLE;

  // Repete o nome na tela final.
  const finalLines = lineTexts.map((text) => {
    const line = document.createElement('span');
    line.className = 'final__line';
    const inner = document.createElement('span');
    inner.textContent = text;
    line.appendChild(inner);
    R.finalEvent.appendChild(line);
    return { line, inner };
  });

  // Escala técnica: 21 marcas, rótulos a cada 25%.
  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const x = (CONTENT_W * i) / 20;
    const major = i % 5 === 0;
    const tick = document.createElement('span');
    tick.className = 'tick' + (major ? ' tick--major' : '');
    tick.style.left = x + 'px';
    R.scale.appendChild(tick);
    let label = null;
    if (major) {
      label = document.createElement('span');
      label.className = 'tick__label' + (i === 0 ? ' tick__label--first' : i === 20 ? ' tick__label--last' : '');
      label.style.left = x + 'px';
      label.textContent = pad(i * 5, 2);
      R.scale.appendChild(label);
    }
    ticks.push({ tick, label, major, i });
  }

  /* --- layout (depende das fontes carregadas) ---------------------------- */

  const L = { eventOffset: 0, dividerDelta: 0 };

  function fitToWidth(el, width) {
    el.style.fontSize = '100px';
    const w = el.offsetWidth;
    if (w > 0) el.style.fontSize = (100 * width) / w + 'px';
  }

  function layout() {
    fitToWidth(R.hl1Inner, CONTENT_W);
    fitToWidth(R.hl2Inner, CONTENT_W);
    // o tamanho da fonte do bloco define o respiro do acento
    R.hl1.style.fontSize = R.hl1Inner.style.fontSize;
    R.hl2.style.fontSize = R.hl2Inner.style.fontSize;

    // Bloco final ancorado acima do limite inferior da área segura.
    R.final.style.top = '0px';
    const h = R.final.offsetHeight;
    const top = Math.max(620, Math.min(700, 1596 - h));
    R.final.style.top = top + 'px';

    // Cena 01: nome centralizado verticalmente; depois sobe para o topo.
    const ev = R.event;
    L.eventOffset = 880 - (ev.offsetTop + ev.offsetHeight / 2);

    // A barra (y = 1039) se transforma na linha divisória.
    L.dividerDelta = top + R.dividerSlot.offsetTop - R.bar.offsetTop;
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
      el.style[prop] = value;
    }
  }
  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }
  const op = (el, v) => set(el, 'opacity', (+clamp(v)).toFixed(3));
  const tf = (el, v) => set(el, 'transform', v);
  const r2 = (v) => Math.round(v * 100) / 100;

  function render(t) {
    const M = reduceMotion.matches ? 0 : 1;  // multiplicador de movimento
    const chromeOut = seg(t, 9300, 10000, E.inOutCubic); // moldura técnica sai para o preto

    /* Grade, cruzes e HUD */
    const gv = seg(t, 0, 900, E.inOutQuart);
    gridV.forEach((el) => {
      tf(el, `scaleY(${M ? r2(gv) : 1})`);
      op(el, (M ? 1 : gv) * (1 - chromeOut));
    });
    const gh = seg(t, 150, 1050, E.inOutQuart);
    gridH.forEach((el) => {
      tf(el, `scaleX(${M ? r2(gh) : 1})`);
      op(el, (M ? 1 : gh) * (1 - chromeOut));
    });
    crosses.forEach((el) => op(el, seg(t, 400, 800) * (1 - chromeOut)));
    huds.forEach((el) => op(el, seg(t, 200, 650) * (1 - chromeOut)));

    setText(R.timecode, timecode(t));
    let sceneIdx = 0;
    SCENES.forEach(([start], i) => { if (t >= start) sceneIdx = i; });
    setText(R.scene, SCENES[sceneIdx][1]);
    seqBars.forEach((b, i) => b.classList.toggle('is-on', i <= sceneIdx));
    setText(R.access, t >= 8000 ? 'LIBERADO' : 'RESTRITO');

    /* CENA 01 — indicador de inicialização */
    const bootIn = seg(t, 0, 180);
    const bootOut = seg(t, 560, 780, E.inOutCubic);
    op(R.boot, bootIn * (1 - bootOut));
    tf(R.boot, `scale(${r2(1 - 0.06 * bootOut * M) })`);
    op(R.bootSquare, M && Math.floor(t / 140) % 2 ? 0.25 : 1);
    tf(R.bootFill, `scaleX(${r2(seg(t, 120, 560, E.inOutCubic))})`);

    /* Nome do evento — digitação com leve decodificação */
    let lastOn = -1;
    chars.forEach((c, i) => {
      const ti = TYPE_START + i * TYPE_STEP;
      let state;
      if (!M) state = t >= TYPE_START ? 2 : 0;
      else state = t < ti ? 0 : t < ti + SCRAMBLE && !c.blank ? 1 : 2;
      if (state > 0) lastOn = i;
      if (state !== c.state) {
        c.el.classList.toggle('is-on', state > 0);
        c.el.classList.toggle('is-scramble', state === 1);
        if (state !== 1) { c.el.textContent = c.ch; c.glyph = c.ch; }
        c.state = state;
      }
      if (state === 1) {
        const g = GLYPHS[hash(i, Math.floor(t / 35)) % GLYPHS.length];
        if (g !== c.glyph) { c.el.textContent = g; c.glyph = g; }
      }
    });
    const cursorVisible = M && t >= TYPE_START && t < 1500;
    const cursorBlinkOff = t > TYPE_END && Math.floor((t - TYPE_END) / 180) % 2 === 1;
    chars.forEach((c, i) => {
      const isCur = cursorVisible && i === lastOn;
      c.el.classList.toggle('is-cursor', isCur);
      c.el.classList.toggle('is-blink-off', isCur && cursorBlinkOff);
    });

    // posição: centro (cena 01) → topo (cena 02)
    let evY;
    let evO;
    if (M) {
      evY = L.eventOffset * (1 - seg(t, 1500, 2200, E.inOutQuart));
      evO = 1;
    } else {
      evY = t < 1650 ? L.eventOffset : 0;
      evO = t < 1650 ? 1 - seg(t, 1500, 1650) : seg(t, 1650, 1900);
      evO *= seg(t, TYPE_START, TYPE_START + 400);
    }
    const evDim = 1 - 0.5 * seg(t, 6000, 6600, E.inOutCubic); // integra-se em cinza
    const evExit = seg(t, 7900, 8350, E.inOutCubic);
    evY -= 28 * evExit * M;
    op(R.event, (t >= TYPE_START - 40 ? evO : 0) * evDim * (1 - evExit));
    tf(R.event, `translate3d(0, ${r2(evY)}px, 0)`);

    /* CENA 02 — carregamento */
    const p = progressAt(t);                     // 0 → 100
    const pInt = t >= 5000 ? 100 : Math.min(99, Math.floor(p));
    const loadIn = seg(t, 1650, 2150, E.outCubic);
    const loadOut = seg(t, 6000, 6350, E.inOutCubic);

    loaderParts.forEach((el, i) => {
      const k = seg(t, 1650 + i * 120, 2150 + i * 120, E.outCubic);
      op(el, k * (1 - loadOut));
      tf(el, `translate3d(0, ${r2((1 - k) * 18 * M)}px, 0)`);
    });

    // status: PROCESSANDO… → PROCESSAMENTO CONCLUÍDO
    const swapOut = seg(t, 5000, 5260, E.inOutCubic);
    const swapIn = seg(t, 5120, 5440, E.outCubic);
    op(R.statusBusy, 1 - swapOut);
    tf(R.statusBusy, `translate3d(0, ${r2(-40 * swapOut * M)}px, 0)`);
    op(R.statusDone, swapIn);
    tf(R.statusDone, `translate3d(0, ${r2(40 * (1 - swapIn) * M)}px, 0)`);
    const dotCount = M ? Math.floor(Math.max(0, t - 1650) / 260) % 4 : 3;
    dots.forEach((d, i) => op(d, i < dotCount ? 1 : 0.15));

    // porcentagem
    setText(R.pctNum, pad(pInt, 2));
    R.pctSign.classList.toggle('is-full', pInt === 100);
    const bump = pulse(t, 5000, 5520);           // destaque em 100%
    const pctOut = seg(t, 6000, 6420, E.inOutCubic);
    op(R.pct, loadIn * (1 - pctOut));
    tf(R.pct, `translate3d(0, ${r2(((1 - loadIn) * 22 - 34 * pctOut) * M)}px, 0) scale(${r2((1 + 0.09 * bump * M) * (1 - 0.32 * pctOut * M) * 1000) / 1000})`);

    // contador de registros
    setText(R.countNum, pad(Math.round((TOTAL_RECORDS * p) / 100), 4));

    // escala técnica
    op(R.scale, 1);
    ticks.forEach(({ tick, label, major, i }) => {
      const k = seg(t, 1800 + i * 16, 1980 + i * 16);
      const settle = 1 - 0.55 * seg(t, 5400, 5900);
      const v = k * settle * (1 - loadOut) * (major ? 1 : 0.6);
      op(tick, v);
      if (label) op(label, v);
    });

    /* Barra → linha divisória */
    const trackIn = seg(t, 1700, 2100, E.inOutCubic);
    const toDivider = seg(t, 6080, 6900, E.inOutQuart);
    let barY;
    let barO;
    if (M) {
      barY = L.dividerDelta * toDivider;
      barO = 1;
    } else {
      barY = t < 6300 ? 0 : L.dividerDelta;
      barO = t < 6300 ? 1 - seg(t, 6100, 6300) : seg(t, 6300, 6550);
    }
    op(R.bar, (t >= 1700 ? barO : 0));
    tf(R.bar, `translate3d(0, ${r2(barY)}px, 0)`);
    tf(R.barTrack, `scaleX(${M ? r2(trackIn) : 1})`);
    op(R.barTrack, (M ? 1 : trackIn) * (1 - seg(t, 5300, 5900)));
    const thick = (1 + 2.2 * bump * M) * lerp(1, 0.5, toDivider); // 2px → 1px
    tf(R.barFill, `scaleX(${(p / 100).toFixed(4)}) scaleY(${r2(thick)})`);
    set(R.barFill, 'boxShadow', bump > 0.01 && M
      ? `0 0 ${r2(28 * bump)}px rgba(255,255,255,${r2(0.65 * bump)})` : 'none');
    op(R.barHead, loadIn * (1 - seg(t, 5000, 5320)));
    tf(R.barHead, `translate3d(${r2((CONTENT_W * p) / 100)}px, 0, 0)`);

    op(R.flash, 0.13 * pulse(t, 5000, 5380) * M);

    /* CENA 04 — revelação */
    op(R.final, t >= 6000 ? 1 : 0);

    // FOTOS: bloco branco varre da esquerda, revela o texto e recua
    const wipeA = seg(t, 6250, 6620, E.inOutQuart);
    const wipeB = seg(t, 6620, 7000, E.inOutQuart);
    if (M) {
      set(R.hl1Wipe, 'clipPath', `inset(0 ${r2(100 - 100 * wipeA)}% 0 ${r2(100 * wipeB)}%)`);
      op(R.hl1Wipe, wipeB >= 1 ? 0 : 1);
      op(R.hl1Inner, t >= 6620 ? 1 : 0);
      tf(R.hl1Inner, `translate3d(${r2(-14 * (1 - seg(t, 6620, 7600, E.outCubic)))}px, 0, 0)`);
    } else {
      op(R.hl1Wipe, 0);
      op(R.hl1Inner, seg(t, 6300, 6800));
      tf(R.hl1Inner, 'none');
    }

    // DISPONÍVEIS.: sobe por trás de uma máscara e se expande levemente
    const rise = seg(t, 6820, 7520, E.outExpo);
    if (M) {
      set(R.hl2, 'clipPath', rise >= 1 ? 'none' : 'inset(-45% -4% 0 -4%)');
      op(R.hl2Inner, t >= 6820 ? 1 : 0);
      tf(R.hl2Inner, `translate3d(0, ${r2(112 * (1 - rise))}%, 0) scaleX(${r2((0.965 + 0.035 * rise) * 1000) / 1000})`);
    } else {
      set(R.hl2, 'clipPath', 'none');
      op(R.hl2Inner, seg(t, 6800, 7300));
      tf(R.hl2Inner, 'none');
    }
    set(R.hl2Inner, 'transformOrigin', '0 100%');
    const dot = seg(t, 7300, 7620, E.outQuart);
    op(R.hl2Dot, M ? dot : 1);
    tf(R.hl2Dot, `scale(${r2(M ? lerp(0.4, 1, dot) : 1)})`);

    /* CENA 05 — tela final */
    finalLines.forEach(({ line, inner }, i) => {
      const a = 8100 + i * 120;
      const k = seg(t, a, a + 700, E.outExpo);
      if (M) {
        set(line, 'clipPath', k >= 1 ? 'none' : 'inset(-35% -2% 0 -2%)');
        op(inner, t >= a ? 1 : 0);
        tf(inner, `translate3d(0, ${r2(110 * (1 - k))}%, 0)`);
      } else {
        op(inner, seg(t, 8100, 8500));
      }
    });
    const copyIn = seg(t, 8550, 9100, E.outCubic);
    op(R.copy, copyIn);
    tf(R.copy, `translate3d(0, ${r2(16 * (1 - copyIn) * M)}px, 0)`);
    const ctaIn = seg(t, 8850, 9400, E.outCubic);
    op(R.cta, ctaIn);
    tf(R.cta, `translate3d(0, ${r2(16 * (1 - ctaIn) * M)}px, 0)`);

    // ?fade → fecha totalmente em preto (para gravação em loop)
    op(R.blackout, params.has('fade') ? seg(t, 9400, 10000, E.inOutCubic) : 0);

    /* Controles */
    setText(R.ctrlTime, `${(t / 1000).toFixed(1).padStart(4, '0')} / ${(DURATION / 1000).toFixed(1)}`);
    tf(R.ctrlFill, `scaleX(${(t / DURATION).toFixed(4)})`);
  }

  function timecode(t) {
    const totalFrames = Math.floor((t / 1000) * 30);
    const ff = totalFrames % 30;
    const ss = Math.floor(totalFrames / 30);
    return `00:00:${pad(ss, 2)}:${pad(ff, 2)}`;
  }

  /* --- relógio ----------------------------------------------------------- */

  let startAt = 0;
  let pausedAt = null;
  let raf = 0;
  const frozen = params.has('t') ? clamp(parseFloat(params.get('t')) || 0, 0, DURATION) : null;

  const elapsed = () => (pausedAt !== null ? pausedAt : performance.now() - startAt);

  function tick() {
    const t = Math.min(elapsed(), DURATION);
    render(t);
    if (t < DURATION && pausedAt === null) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      if (t >= DURATION) setText(R.btnPause, 'Reproduzir');
    }
  }

  function restart() {
    cancelAnimationFrame(raf);
    pausedAt = null;
    startAt = performance.now();
    setText(R.btnPause, 'Pausar');
    tick();
  }

  function togglePause() {
    if (elapsed() >= DURATION) return restart();
    if (pausedAt === null) {
      pausedAt = elapsed();
      setText(R.btnPause, 'Continuar');
    } else {
      startAt = performance.now() - pausedAt;
      pausedAt = null;
      setText(R.btnPause, 'Pausar');
      cancelAnimationFrame(raf);
      tick();
    }
  }

  R.btnRestart.addEventListener('click', restart);
  R.btnPause.addEventListener('click', togglePause);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); restart(); }
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  });
  window.addEventListener('resize', fitStage);
  reduceMotion.addEventListener?.('change', () => { cache.clear(); if (!raf) render(Math.min(elapsed(), DURATION)); });

  /* --- início ------------------------------------------------------------ */

  if (params.has('clean')) document.documentElement.classList.add('is-clean');
  fitStage();
  render(0);

  // Aguarda as fontes (com limite) para medir títulos e evitar troca no meio da peça.
  const FONTS = ['400 100px Anton', '600 62px Archivo', '500 24px "Space Grotesk"', '400 20px "Space Mono"', '700 20px "Space Mono"'];
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.race([
      Promise.all(FONTS.map((f) => document.fonts.load(f, 'FOTOS DISPONÍVEIS 4º 0123456789%').catch(() => null)))
        .then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 2500)),
    ])
    : Promise.resolve();

  // API mínima para exportação quadro a quadro (tools/render-video.js).
  window.story = {
    duration: DURATION,
    ready: fontsReady.then(() => undefined),
    seek(t) {
      cancelAnimationFrame(raf);
      raf = 0;
      pausedAt = clamp(t, 0, DURATION);
      render(pausedAt);
    },
  };

  fontsReady.then(() => {
    layout();
    if (frozen !== null) {
      pausedAt = frozen;
      setText(R.btnPause, frozen >= DURATION ? 'Reproduzir' : 'Continuar');
      render(frozen);
    } else {
      restart();
    }
  });
})();
