import {loadFont} from '@remotion/google-fonts/PlusJakartaSans';
import {loadFont as loadEmoji} from '@remotion/google-fonts/NotoColorEmoji';
import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';

const jakarta = loadFont('normal', {
  weights: ['500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
});
const emoji = loadEmoji('normal', {weights: ['400'], subsets: ['emoji']});

export const FONT_FAMILY = `${jakarta.fontFamily}, ${emoji.fontFamily}, sans-serif`;
export const TEXT_FONT = jakarta.fontFamily;

const fontsReady = Promise.all([jakarta.waitUntilDone(), emoji.waitUntilDone()]);

// Segura o render até as fontes carregarem, para que medidas de texto
// (measureText) usem a fonte certa.
export const useFontsReady = (): boolean => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Carregando fontes'));
  useEffect(() => {
    fontsReady
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
};
