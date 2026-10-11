// Baixa as fontes do Google Fonts para public/fonts/ e gera
// src/font-files.json, para que o render não dependa do navegador acessar a
// internet. Rode de novo depois de trocar emojis nos textos:
//   node tools/baixar-fontes.mjs
import {getInfo as jakartaInfo} from '@remotion/google-fonts/PlusJakartaSans';
import {getInfo as emojiInfo} from '@remotion/google-fonts/NotoColorEmoji';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const parseRanges = (ranges) =>
  ranges.split(',').map((r) => {
    const [a, b] = r.trim().replace('U+', '').split('-');
    return [parseInt(a, 16), parseInt(b ?? a, 16)];
  });

// Codepoints usados no código-fonte (para escolher só as fatias de emoji necessárias).
const used = new Set();
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f)) for (const ch of readFileSync(p, 'utf8')) used.add(ch.codePointAt(0));
  }
};
walk('src');
const needed = (ranges) => parseRanges(ranges).some(([a, b]) => [...used].some((c) => c >= a && c <= b));

const out = 'public/fonts';
mkdirSync(out, {recursive: true});
const faces = [];
const add = (family, info, weights, subsets) => {
  for (const weight of weights) {
    for (const [subset, url] of Object.entries(info.fonts.normal[weight])) {
      const unicodeRange = info.unicodeRanges[subset];
      if (subsets ? !subsets.includes(subset) : !needed(unicodeRange)) continue;
      const file = `${family.replace(/\W/g, '')}-${weight}-${subset.replace(/\W/g, '')}.woff2`;
      execFileSync('curl', ['-sSfL', '-o', join(out, file), url]);
      faces.push({family, weight, unicodeRange, file: `fonts/${file}`});
    }
  }
};
add('Plus Jakarta Sans', jakartaInfo(), ['500', '600', '700', '800'], ['latin', 'latin-ext']);
add('Noto Color Emoji', emojiInfo(), ['400'], null);
writeFileSync('src/font-files.json', JSON.stringify(faces, null, 2) + '\n');
console.log(faces.map((f) => f.file).join('\n'));
