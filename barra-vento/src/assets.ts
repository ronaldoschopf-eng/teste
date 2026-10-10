import {getStaticFiles, staticFile} from 'remotion';

const files = (() => {
  try {
    return getStaticFiles();
  } catch {
    return [];
  }
})();

// Fotos reais em public/fotos/*.jpg (ordem alfabética). Vazio → placeholders.
export const PHOTO_FILES: string[] = files
  .filter((f) => /^fotos\/[^/]+\.(jpe?g|png|webp)$/i.test(f.name))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((f) => f.src);

export const LOGO_SRC: string | null = files.some((f) => f.name === 'logo.png')
  ? staticFile('logo.png')
  : null;

export const MUSIC_SRC: string | null = files.some((f) => f.name === 'musica.mp3')
  ? staticFile('musica.mp3')
  : null;
