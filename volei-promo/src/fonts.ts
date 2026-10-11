// Fontes empacotadas pelo npm (@fontsource) — nada é baixado na renderização.
// loadFont() usa delayRender internamente, então nenhum quadro é capturado
// antes de as fontes estarem prontas.
import { loadFont } from '@remotion/fonts';
import anton from '@fontsource/anton/files/anton-latin-400-normal.woff2';
import barlow500 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2';
import barlow600 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2';
import barlow700 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2';
import mono500 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2';

export const FONTS = {
  display: '"Anton", "Impact", sans-serif',
  condensed: '"Barlow Condensed", "Arial Narrow", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

let started = false;
export const loadFonts = () => {
  if (started) return;
  started = true;
  loadFont({ family: 'Anton', url: anton, weight: '400' });
  loadFont({ family: 'Barlow Condensed', url: barlow500, weight: '500' });
  loadFont({ family: 'Barlow Condensed', url: barlow600, weight: '600' });
  loadFont({ family: 'Barlow Condensed', url: barlow700, weight: '700' });
  loadFont({ family: 'JetBrains Mono', url: mono500, weight: '500' });
};
