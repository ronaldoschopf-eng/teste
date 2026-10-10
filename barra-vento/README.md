# Barra Vento — vídeo vertical (Remotion)

Vídeo de 15 s para Reels, TikTok e Stories: 1080 × 1920, 60 fps, MP4 H.264. Estilo kinetic typography.

> "Suas fotos do 4º Festival Barra Vento de Capoeira estão te esperando, clique no link da bio"

- Vídeo pronto: [`out/barra-vento.mp4`](out/barra-vento.mp4)
- Frame 700, para conferir o card final: [`out/frame-700.png`](out/frame-700.png)

## Comandos

```bash
npm install
npm run studio      # pré-visualização interativa (Remotion Studio)
npm run render      # = npx remotion render BarraVento out/barra-vento.mp4 --codec=h264
npm run still       # = npx remotion still BarraVento out/frame-700.png --frame=700
npm run typecheck
```

As fontes (Plus Jakarta Sans e Noto Color Emoji) vêm do Google Fonts, então o render precisa de internet.

## Trocar fotos, logo e música

| Arquivo | Efeito |
| --- | --- |
| `public/fotos/*.jpg` (ou `.png`/`.webp`) | Entram na chuva de fotos, no grid e no card final, em ordem alfabética. Se houver menos de 16 fotos, elas se repetem. Sem fotos, aparecem placeholders verde/amarelo com silhuetas. |
| `public/logo.png` | Substitui o logo provisório (ícone de berimbau com "Barra Vento Capoeira") no card final. |
| `public/musica.mp3` | Trilha opcional, com fade-in e fade-out. Sem o arquivo, o vídeo sai sem áudio. |

Depois de trocar os arquivos, rode `npm run render` de novo.

## Editar textos e tempos

Tudo fica em [`src/config.ts`](src/config.ts):

- `TEXT`: palavras de cada cena, conteúdos do highlight box, notificações, emojis e textos do card final;
- `TIMING`: frame de início de cada cena, das palavras, das trocas do box, das notificações e do clique (60 frames = 1 s);
- `COLORS`, `TYPO`, `PHOTOS` (quantidade, tamanho, camadas de profundidade, grid), `BACKGROUND`, `MOTION_BLUR`, `SAFE` (área segura).

## Roteiro

| Frames | Cena |
| --- | --- |
| 0–150 | Fundo claro: "Suas" → "fotos" → "do" → highlight box que alterna "4º Festival" → "Barra Vento" → "de Capoeira" com wipe vertical |
| 150–182 | Onda (amarelo, verde-limão e depois verde-escuro) revela o fundo escuro |
| 166–420 | Chuva de 16 fotos em 3 camadas de profundidade (paralaxe, rotação 3D, motion blur), 3 notificações e "estão te esperando," com brilho amarelo pulsante |
| 420–492 | As fotos se agrupam num grid 3 × 4 e fazem zoom-out enquanto um círculo claro se abre do centro |
| 462–660 | Fundo claro com emojis flutuando: "clique" → "no" → box "link da bio"; o cursor entra e clica (o box encolhe e volta, com ripple verde e faíscas) |
| 652–900 | Card final: logo, "Suas fotos estão prontas 📸", colagem de 3 fotos, botão "Link na bio" pulsando e o nome do festival |

Nada importante fica a menos de 200 px do topo ou a menos de 300 px da base.

## Estrutura

```
src/
  config.ts              textos, tempos, cores e ajustes
  BarraVento.tsx         composição principal (ordem e transições das cenas)
  fonts.ts, assets.ts    fontes do Google Fonts; leitura de fotos, logo e música
  components/
    KineticWord.tsx      palavra com entrada em spring (y, opacidade, blur, escala)
    KineticLine.tsx      linha de palavras e "câmera" que desliza para a esquerda
    HighlightBox.tsx     box verde-limão com barrinhas laterais e wipe vertical
    Scribble.tsx         rabisco amarelo desenhado com stroke-dashoffset
    Sparks.tsx           faíscas (traços curvos e bolinhas)
    BlobBackground.tsx   fundos claro e escuro com blobs desfocados
    Grain.tsx            granulação
    WaveTransition.tsx   transição em onda
    FallingPhoto.tsx     card de foto (queda pseudo-3D e agrupamento no grid)
    PhotoPlaceholder.tsx placeholder com gradiente e silhueta
    Notification.tsx     notificação no estilo iMessage
    Cursor.tsx           mão/cursor e ripple do clique
    FloatingEmojis.tsx   emojis flutuantes nas bordas
    EndCard.tsx          card final
    BerimbauLogo.tsx     ícone provisório de berimbau
  scenes/                cenas 1, 3/4 e 5
```

Toda a aleatoriedade usa `random(seed)` do Remotion, então cada render sai idêntico.
