# Vôlei · 20% OFF — vídeo promocional (Remotion)

Peça vertical 9:16 para Stories, Reels e Status do WhatsApp, feita em **Remotion 4.0.534 + React 19**.

- 1080 × 1920 px, 30 fps, 450 quadros (15 s), H.264 `yuv420p` / BT.709.
- Vídeo renderizado: [`../video/volei-promo-20off.mp4`](../video/volei-promo-20off.mp4).

Este projeto fica isolado em `volei-promo/` e não altera o story em HTML nem o script de exportação com Playwright da raiz.

## Comandos

```bash
cd volei-promo
npm install
npm run studio        # pré-visualização interativa (Remotion Studio)
npm run render        # → out/volei-promo.mp4
npm run still         # → out/still.png (quadro 240)
npm run typecheck
```

O Remotion baixa um Chrome Headless Shell na primeira renderização. Se a máquina não tiver acesso a `remotion.media` (como em ambientes com rede restrita), informe um Chromium local:

```bash
npm run render -- --browser-executable=/caminho/para/headless_shell
```

Para revisar as áreas seguras do Instagram por cima do vídeo:

```bash
npx remotion still VoleiPromo out/areas.png --frame=420 --props='{"mostrarAreasSeguras":true}'
```

## Roteiro

| Cena | Tempo | O que acontece |
| --- | --- | --- |
| 01 · O impacto | 0–3 s | Arena escura e flashes da arquibancada. O atleta salta, arma o braço e ataca. No contato com a bola, um flash congela o instante: a imagem dessatura, o autofoco trava na bola, o rastro do salto aparece como múltipla exposição em verde-limão e entra **AMANHÃ, CADA PONTO VIRA HISTÓRIA.** |
| 02 · A fotografia | 3–6 s | Visor de câmera com pontos de AF, dados de exposição, contador de rajada e ícone de obturador. Há três disparos (ataque, bloqueio e comemoração), ligados por movimentos rápidos de câmera (*whip pan*). Cada foto vira uma miniatura na tira de contato. **NÃO DEIXE OS MELHORES MOMENTOS PASSAREM.** entra linha a linha, no ritmo dos disparos. |
| 03 · A oferta | 6–10 s | No impacto grave, o **20%** entra em escala monumental, passa um pouco do tamanho final e se acomoda. Um contorno luminoso percorre as letras e o **OFF** bate na tela. Ao fundo, flashes e linhas de quadra. **GARANTA 20% OFF NOS SEUS REGISTROS DE AMANHÃ.** |
| 04 · Chamada | 10–15 s | O movimento diminui. **ACESSE O LINK E GARANTA SEUS 20% OFF!** e *Seus melhores momentos merecem ser lembrados.* Uma seta aponta para a área livre do sticker de link, abaixo vem a assinatura do fotógrafo, e o vídeo termina com um último flash e a cortina do obturador fechando. |

A área do sticker de link (`SAFE.stickerZone`) fica **vazia de propósito**. As molduras de canto só indicam onde colocar o sticker nativo do Instagram, e nenhum botão é simulado.

## Personalização (`src/config.ts`)

Todos os ajustes ficam em um único arquivo:

- **`DEFAULT_PROPS.copy`**: todos os textos, com uma linha por item do array.
- **`DEFAULT_PROPS.brand`**: nome do fotógrafo, descrição, link/@perfil e logotipo (`"marca/logo.png"` dentro de `public/`).
- **`DEFAULT_PROPS.media.fotos`**: fotos reais para os três disparos da Cena 02 (`"fotos/ataque.jpg"` etc.). Quando há uma foto, ela substitui a silhueta gráfica.
- **`DEFAULT_PROPS.media.audio`**: trilha e efeitos sonoros (obturador, whoosh e impacto), com arquivos em `public/audio/`.
- **`SYNC`**: pontos de sincronização em quadros (entrada do 20%, disparos, transições, último flash…). Mova um número para casar a imagem com a batida da trilha; os efeitos sonoros configurados se movem junto.
- **`SCENES`**, **`COLORS`**, **`EFFECTS`** (grão, vinheta, tremor, partículas) e **`SAFE`** (áreas seguras).

Também dá para trocar textos e mídias sem editar código:

```bash
npx remotion render VoleiPromo out/outra.mp4 --props=props.json
```

Hoje o projeto não tem fotos, logotipo nem áudio. Por isso a Cena 02 usa silhuetas gráficas (sem se passar por fotos do evento) e o vídeo sai mudo. Nenhum caminho de mídia é usado sem que o arquivo tenha sido configurado.

## Estrutura

```
src/
  index.ts, Root.tsx          registro da composição "VoleiPromo"
  VoleiPromo.tsx              linha do tempo: cenas, transições por flash, acabamento, áudio
  config.ts                   parâmetros centrais (textos, marca, mídias, tempos, cores)
  fonts.ts                    Anton, Barlow Condensed e JetBrains Mono (locais, via @fontsource)
  anim/motion.ts              easing, tween, mola, tremor e curva de flash
  scenes/                     Scene01Impacto, Scene02Fotografia, Scene03Oferta, Scene04Cta
  components/
    PhotoFlash.tsx            flash de transição e estouro pontual
    KineticText.tsx           texto cinético com máscara e cascata
    SpeedLines.tsx            linhas de velocidade
    AutofocusFrame.tsx        moldura de autofoco (busca e trava)
    FocusIndicator.tsx        grade de pontos de AF que segue o assunto
    Particles.tsx             partículas
    PromoNumber.tsx           número promocional com contorno luminoso
    CtaEnding.tsx             seta, área do sticker e assinatura
    Athlete.tsx, Ball.tsx     silhueta articulada (poses interpoladas) e bola
    Arena.tsx                 luzes, piso da quadra e rede
    CaptureView.tsx           conteúdo de cada disparo (foto real ou silhueta)
    Overlays.tsx              grão, vinheta, cortina do obturador, guia de áreas seguras
    SoundTrack.tsx            trilha e efeitos opcionais sincronizados com SYNC
public/                       fotos/, audio/, marca/ (vazias, para suas mídias)
```

Toda animação é função do quadro (`useCurrentFrame`, `interpolate`, `spring`, `random(seed)`). Não há animações CSS, timers nem estado, então cada quadro sai sempre igual e pode ser renderizado isoladamente.
