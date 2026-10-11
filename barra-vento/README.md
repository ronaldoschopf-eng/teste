# Torneio — vídeo vertical (Remotion)

Vídeo de 19 s para Reels, TikTok e Stories: 1080 × 1920, 60 fps, MP4 H.264. Estilo kinetic typography, na paleta rosa pink, laranja e branco, com efeito de meio-tom (halftone) no vídeo todo.

> "Amanhã, a partir das 8 horas ocorre o Torneio - Kizuna & Vai que Dá & Diretoria. Cobertura fotográfica de cada ponto! Suas fotos estarão no link da bio."

- Vídeo pronto: [`out/torneio-abertura.mp4`](out/torneio-abertura.mp4), já na versão leve (5,4 MB, H.264 CRF 30, `faststart`)
- Frame 960, para conferir o card final: [`out/frame-960.png`](out/frame-960.png)
- Versão anterior (4º Festival Barra Vento de Capoeira, 15 s): [`out/barra-vento.mp4`](out/barra-vento.mp4) e [`out/frame-700.png`](out/frame-700.png)

## Comandos

```bash
npm install
npm run studio      # pré-visualização interativa (Remotion Studio)
npm run render      # = npx remotion render Torneio out/torneio-abertura.mp4 --codec=h264
npm run still       # = npx remotion still Torneio out/frame-960.png --frame=960
npm run compress    # versão leve (CRF 30, preset veryslow, faststart) em out/torneio-abertura-leve.mp4; precisa de ffmpeg
npm run typecheck
```

As fontes (Plus Jakarta Sans e Noto Color Emoji, do Google Fonts) ficam em `public/fonts/`, então o render funciona sem internet. Se trocar ou acrescentar emojis nos textos, baixe as fontes de novo com `node tools/baixar-fontes.mjs` (gera `src/font-files.json` só com as partes do emoji que o vídeo usa).

## Trocar fotos, logo e música

| Arquivo | Efeito |
| --- | --- |
| `public/fotos/*.jpg` (ou `.png`/`.webp`) | Entram na chuva de fotos, no grid e no card final, em ordem alfabética. Se houver menos de 16 fotos, elas se repetem. Sem fotos, aparecem placeholders rosa/laranja com silhuetas de jogadas de vôlei (cortada, bloqueio, levantamento, manchete e saque). |
| `public/logo.png` | Substitui o logo provisório (bola de vôlei com "Torneio de Vôlei") no card final. |
| `public/musica.mp3` | Trilha opcional, com fade-in e fade-out. Sem o arquivo, o vídeo sai sem áudio. |

Depois de trocar os arquivos, rode `npm run render` de novo.

## Editar textos e tempos

Tudo fica em [`src/config.ts`](src/config.ts):

- `FULL_TEXT`: a frase completa;
- `TEXT_GROUPS`: a frase dividida em blocos de duas linhas. Cada linha tem os tokens (palavra, `{glow}` para brilho laranja ou `{box}` para highlight box), o frame de entrada, a altura na tela e, nos boxes, os frames das trocas de conteúdo. Lidos em ordem, os blocos precisam formar exatamente a `FULL_TEXT`; se não formarem, o vídeo avisa no console;
- `TEXT`: notificações, emojis e textos do card final;
- `TIMING`: cenas, transições, notificações e clique (60 frames = 1 s);
- `HALFTONE`: tamanho e inclinação da retícula, força dos pontos nos fundos e a textura fina sobre o vídeo;
- `COLORS`, `TYPO` (tamanho máximo e mínimo da fonte: cada linha encolhe sozinha até caber), `PHOTOS`, `BACKGROUND`, `MOTION_BLUR`, `SAFE`.

## Roteiro

| Frames | Cena |
| --- | --- |
| 0–206 | Fundo claro: [Amanhã,] / a partir das / [8 horas] |
| 200–232 | Onda (laranja, rosa e depois rosa-escuro) revela o fundo escuro |
| 216–620 | Chuva de 16 fotos em 3 camadas de profundidade e 3 notificações. Texto: ocorre o Torneio - / [Kizuna & → Vai que Dá & → Diretoria.] (wipe vertical), depois Cobertura fotográfica / de cada ponto! (brilho laranja pulsante) |
| 620–694 | As fotos se agrupam num grid 3 × 4 e fazem zoom-out enquanto um círculo claro se abre do centro |
| 662–900 | Fundo claro com emojis: Suas fotos estarão / no [link da bio.]; o cursor entra e clica (o box encolhe e volta, com ripple rosa e faíscas) |
| 880–1140 | Card final: logo, etiqueta "AMANHÃ · A PARTIR DAS 8H", "Cada ponto, cada jogada 📸", colagem de 3 fotos, botão "Link na bio" pulsando e o nome do torneio |

Nada importante fica a menos de 200 px do topo ou a menos de 300 px da base.

## Estrutura

```
src/
  config.ts              textos, tempos, cores e ajustes
  BarraVento.tsx         composição principal (ordem e transições das cenas)
  fonts.ts, assets.ts    fontes locais (public/fonts); leitura de fotos, logo e música
  components/
    KineticWord.tsx      palavra com entrada em spring (y, opacidade, blur, escala)
    KineticLine.tsx      linha de palavras (fonte ajustada para caber; "câmera" desliza se não couber)
    TextGroup.tsx        bloco de linhas que entra palavra por palavra e sai junto
    HighlightBox.tsx     box rosa com barrinhas laterais, sombra em pontos e wipe vertical
    Scribble.tsx         rabisco laranja desenhado com stroke-dashoffset
    Sparks.tsx           faíscas (traços curvos e bolinhas)
    BlobBackground.tsx   fundos claro e escuro com blobs desfocados e campos de meio-tom
    Grain.tsx            granulação
    WaveTransition.tsx   transição em onda
    FallingPhoto.tsx     card de foto (queda pseudo-3D e agrupamento no grid)
    PhotoPlaceholder.tsx placeholder com gradiente e jogada de vôlei
    Notification.tsx     notificação no estilo iMessage
    Cursor.tsx           mão/cursor e ripple do clique
    FloatingEmojis.tsx   emojis flutuantes nas bordas
    EndCard.tsx          card final
    LogoIcon.tsx         ícone provisório (bola de vôlei)
    Halftone.tsx         meio-tom: retícula com limiar, textura fina e sombras em pontos
  scenes/                cenas 1, 3/4 e 5
```

Toda a aleatoriedade usa `random(seed)` do Remotion, então cada render sai idêntico.
