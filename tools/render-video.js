/* Exporta o story como MP4 (1080 × 1920, H.264) quadro a quadro.
 *
 *   npm install
 *   npm run render                     → video/fotos-disponiveis.mp4
 *   node tools/render-video.js --fps 60 --hold 3 --fade --out saida.mp4
 *   node tools/render-video.js --page texto-pb.html --out video/texto-pb.mp4
 *
 * Requer ffmpeg no PATH. Cada quadro é renderizado de forma determinística
 * via window.story.seek(t), então não há quadros perdidos.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const FPS = Number(opt('fps', 30));
const HOLD = Number(opt('hold', 2));        // segundos extras com a tela final (ambiente animado)
const FADE = args.includes('--fade');
const PAGE = opt('page', 'index.html');     // ex.: --page texto-pb.html
const OUT = path.resolve(opt('out', 'video/fotos-disponiveis.mp4'));
const BROWSER = process.env.CHROMIUM_PATH || undefined;

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const url = 'file://' + path.resolve(__dirname, '..', PAGE) + '?clean' + (FADE ? '&fade' : '') + '&t=0';

  const browser = await chromium.launch({
    executablePath: BROWSER,
    args: (process.env.CHROMIUM_ARGS || '').split(' ').filter(Boolean),
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.story.ready);
  await page.waitForTimeout(300);
  const fontsOk = await page.evaluate(() => window.story.fontsOk());
  if (!fontsOk) console.warn('⚠ Fontes do Google não carregaram (sem internet?) — usando fontes de fallback.');
  const duration = await page.evaluate(() => window.story.duration);

  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const frames = Math.round(((duration / 1000) + HOLD) * FPS);
  const stage = page.locator('#stage');
  for (let f = 0; f < frames; f++) {
    const t = (f * 1000) / FPS;  // após a duração, o ambiente segue animado
    await page.evaluate((ms) => window.story.seek(ms), t);
    const png = await stage.screenshot({ type: 'png', animations: 'disabled' });
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % FPS === 0) process.stdout.write(`\r${(t / 1000).toFixed(0)}s / ${frames} quadros`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  await browser.close();
  console.log(`\n✓ ${path.relative(process.cwd(), OUT)}`);
})();
