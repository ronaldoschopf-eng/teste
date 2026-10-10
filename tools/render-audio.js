/* Gera os efeitos sonoros de uma página (WAV estéreo, 48 kHz, 16 bits).
 *
 *   node tools/render-audio.js --page texto-formas.html --out video/fotos-disponiveis-formas.wav
 *
 * A página expõe window.story.cues(): uma lista de eventos { t (ms), kind, ... }
 * calculada com os mesmos números da animação, então o som cai exatamente no
 * quadro certo. Cada tipo de evento é sintetizado aqui (ruído filtrado,
 * osciladores e envelopes), sem amostras externas.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const PAGE = opt('page', 'texto-formas.html');
const OUT = path.resolve(opt('out', 'video/fotos-disponiveis-formas.wav'));
const SR = 48000;

/* --- síntese --------------------------------------------------------------- */

function random(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synth(cues, durationMs) {
  const n = Math.ceil((durationMs / 1000) * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rnd = random(1234);
  const noise = () => rnd() * 2 - 1;

  /** soma uma amostra com pan (-1 esquerda … 1 direita, potência constante) */
  const put = (i, v, pan = 0) => {
    if (i < 0 || i >= n) return;
    const a = ((pan + 1) * Math.PI) / 4;
    L[i] += v * Math.cos(a);
    R[i] += v * Math.sin(a);
  };
  const at = (ms) => Math.round((ms / 1000) * SR);
  const sweep = (f0, f1, p) => f0 * Math.pow(f1 / f0, p);   // varredura exponencial

  /** filtro passa-banda de estado variável (Chamberlin), com frequência por amostra */
  function bandpass(q = 0.6) {
    let low = 0;
    let band = 0;
    return (x, fc) => {
      const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
      low += f * band;
      const high = x - low - q * band;
      band += f * high;
      return band;
    };
  }

  /** sopro: ruído filtrado com o centro varrendo de f0 a f1 */
  function whoosh(t, dur, f0, f1, gain, pan0 = 0, pan1 = 0, q = 0.7) {
    const bp = bandpass(q);
    const s = at(t);
    const len = at(dur);
    for (let i = 0; i < len; i++) {
      const p = i / len;
      const env = Math.pow(Math.sin(Math.PI * p), 1.6);
      put(s + i, bp(noise(), sweep(f0, f1, p)) * env * gain, pan0 + (pan1 - pan0) * p);
    }
  }

  /** tom com glissando, decaimento exponencial e ataque curto */
  function tone(t, dur, f0, f1, gain, decay, pan = 0, harm = 0) {
    const s = at(t);
    const len = at(dur);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const p = i / len;
      ph += (2 * Math.PI * sweep(f0, f1, Math.min(1, p * 1.5))) / SR;
      const env = Math.min(1, i / (SR * 0.002)) * Math.exp(-i / (SR * decay));
      put(s + i, (Math.sin(ph) + harm * Math.sin(3 * ph)) * env * gain, pan);
    }
  }

  /** estalo: ruído curtíssimo, só agudos */
  function click(t, dur, gain, pan = 0) {
    const s = at(t);
    const len = at(dur);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const x = noise();
      put(s + i, (x - prev) * 0.5 * Math.exp(-i / (len / 4)) * gain, pan);
      prev = x;
    }
  }

  const SOUNDS = {
    // o texto some
    fade: (c) => whoosh(c.t, c.dur * 1.4, 1800, 500, 0.12),
    // arcos entrando e girando: sopro que sobe e passeia entre os lados
    swirl: (c) => {
      const bp = bandpass(0.5);
      const s = at(c.t);
      const len = at(c.dur);
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const p = i / len;
        ph += (2 * Math.PI * (1 + 6 * p)) / SR;
        const env = Math.min(1, p / 0.6) * Math.min(1, (1 - p) / 0.12);
        put(s + i, bp(noise(), sweep(400, 3200, p)) * env * 0.22, Math.sin(ph) * 0.7);
      }
      tone(c.t, c.dur, 220, 660, 0.05, 1);
    },
    // arcos viram pontos
    pop: (c) => {
      tone(c.t, 0.18 * 1000, c.freq * 1.8, c.freq, 0.28, 0.05);
      click(c.t, 3, 0.15);
    },
    // pontos girando: brilho suave com tremolo
    shimmer: (c) => {
      const s = at(c.t);
      const len = at(c.dur);
      for (let i = 0; i < len; i++) {
        const p = i / len;
        const tt = i / SR;
        const env = Math.sin(Math.PI * p) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 12 * tt));
        const v = Math.sin(2 * Math.PI * 1320 * tt) + 0.6 * Math.sin(2 * Math.PI * 1980 * tt) + 0.3 * Math.sin(2 * Math.PI * 2640 * tt);
        put(s + i, v * env * 0.025, Math.sin(2 * Math.PI * 1.5 * tt) * 0.4);
      }
    },
    // pontos esticando em barras: "boing" para cima
    stretch: (c) => tone(c.t, c.dur * 2, 300, 950, 0.2, 0.09, 0, 0.2),
    // barras caindo
    drop: (c) => {
      tone(c.t, c.dur * 2.2, 900, 120, 0.16, 0.12);
      whoosh(c.t, c.dur * 1.5, 2200, 300, 0.08);
    },
    // pedaço de letra se encaixando
    tick: (c) => {
      const f = 2000 + rnd() * 1500;
      tone(c.t, 60, f, f, 0.06, 0.02, c.x * 0.7);
      click(c.t, 3, 0.08, c.x * 0.7);
    },
    // traço curvo grande
    swoosh: (c) => whoosh(c.t, c.dur, 600, 2600, 0.12, -0.4, 0.4),
    // marca-texto passando no papel, da esquerda para a direita
    marker: (c) => {
      const bp = bandpass(0.25);
      const s = at(c.t);
      const len = at(c.dur);
      let jitter = 0;
      for (let i = 0; i < len; i++) {
        const p = i / len;
        if (i % 480 === 0) jitter = 0.6 + rnd() * 0.4;
        const env = Math.min(1, i / (SR * 0.012)) * Math.min(1, (len - i) / (SR * 0.04)) * jitter;
        const am = 0.75 + 0.25 * Math.sin((2 * Math.PI * 38 * i) / SR);
        const v = bp(noise(), 2900 + 400 * Math.sin(p * Math.PI)) * am
          + 0.15 * Math.sin((2 * Math.PI * (2300 + 60 * Math.sin(i / 300)) * i) / SR);
        put(s + i, v * env * 0.12, -0.5 + p);
      }
    },
    // tela vira branca: sopro grande e um baque grave
    wipe: (c) => {
      whoosh(c.t, c.dur * 1.2, 300, 4000, 0.24);
      tone(c.t + c.dur * 0.2, 450, 75, 42, 0.38, 0.12);
    },
    // tecla de máquina de escrever
    key: (c) => {
      const pan = c.x * 0.6;
      const g = 0.85 + rnd() * 0.3;
      click(c.t, 4, 0.45 * g, pan);
      const bp = bandpass(0.35);
      const fc = 1000 + rnd() * 500;
      const s = at(c.t);
      for (let i = 0; i < at(45); i++) put(s + i, bp(noise(), fc) * Math.exp(-i / (SR * 0.012)) * 0.35 * g, pan);
      tone(c.t, 60, 150, 120, 0.18 * g, 0.015, pan);
      click(c.t + 16 + rnd() * 6, 3, 0.15 * g, pan);         // a haste voltando
    },
    // sino do fim da linha
    bell: (c) => {
      [[1, 1, 0.4], [2.76, 0.4, 0.22], [5.4, 0.2, 0.12]].forEach(([m, a, d]) => tone(c.t, 1000, 2093 * m, 2093 * m, 0.11 * a, d, 0.2));
      click(c.t, 3, 0.12, 0.2);
    },
  };

  for (const c of cues) {
    const fn = SOUNDS[c.kind];
    if (!fn) throw new Error(`efeito desconhecido: ${c.kind}`);
    fn(c);
  }

  // normaliza para -1 dBFS com uma saturação suave nos picos
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = peak > 0 ? 0.89 / Math.tanh(peak) : 1;
  for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i]) * k; R[i] = Math.tanh(R[i]) * k; }
  return [L, R];
}

function wav([L, R]) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  return buf;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean),
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(__dirname, '..', PAGE) + '?clean&t=0');
  await page.evaluate(() => window.story.ready);
  await page.waitForTimeout(300);
  const { cues, duration } = await page.evaluate(() => ({ cues: window.story.cues(), duration: window.story.duration }));
  await browser.close();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, wav(synth(cues, duration)));
  console.log(`✓ ${path.relative(process.cwd(), OUT)} (${cues.length} efeitos, ${(duration / 1000).toFixed(2)} s)`);
})();
