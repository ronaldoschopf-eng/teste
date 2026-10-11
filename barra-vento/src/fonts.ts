import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import faces from './font-files.json';

// As fontes (Plus Jakarta Sans e Noto Color Emoji, do Google Fonts) ficam em
// public/fonts/, para que o render funcione offline. Para baixá-las de novo
// (por exemplo, depois de usar outro emoji): node tools/baixar-fontes.mjs
export const FONT_FAMILY = `'Plus Jakarta Sans', 'Noto Color Emoji', sans-serif`;
export const TEXT_FONT = `'Plus Jakarta Sans'`;

const fontsReady = Promise.all(
  faces.map(async ({family, weight, unicodeRange, file}) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {weight, unicodeRange});
    (document.fonts as FontFaceSet & {add: (f: FontFace) => void}).add(await face.load());
  }),
);

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
