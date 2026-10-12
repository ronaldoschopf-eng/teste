# Fotos Disponíveis — Story animado (9:16)

Story vertical de 1080 × 1920 px, com 10 segundos de duração, que anuncia a liberação das fotos de um evento.
O visual segue a referência "Be authentic.": fundo preto, um orbe luminoso no centro com brilho magenta e laranja, círculos de contorno flutuando e tipografia Poppins centralizada. O sistema inicializa, carrega os registros do evento e revela a mensagem **Fotos disponíveis.**

Foi feito só com HTML, CSS e JavaScript nativos: sem build e sem dependências (as fontes vêm do Google Fonts).

## Como executar

Abra o `index.html` direto no navegador ou sirva a pasta:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

A sequência começa sozinha. No fim, a tela final continua visível até ser reiniciada.

| Ação | Como |
| --- | --- |
| Reiniciar | botão **↻ Reiniciar** (canto inferior direito) ou tecla `R` |
| Pausar / continuar | botão **Pausar** ou `Espaço` |
| Congelar um quadro | `?t=7500` (tempo em ms) |
| Gravar a tela sem os controles | `?clean` |
| Terminar com fade total para preto | `?fade` (por exemplo, `?clean&fade`) |

## Vídeo MP4

O vídeo pronto está em [`video/fotos-disponiveis.mp4`](video/fotos-disponiveis.mp4). Especificações:

- 1080 × 1920 px, H.264, 30 fps;
- 12 s de duração: os 10 s da animação mais 2 s de tela final, com o ambiente ainda em movimento, para dar tempo de leitura.

A versão anterior, monocromática, está em `video/fotos-disponiveis-mono.mp4`.

Para gerar o vídeo de novo (por exemplo, depois de trocar o nome do evento), é preciso ter Node e ffmpeg instalados:

```bash
npm install
npm run render          # gera video/fotos-disponiveis.mp4
npm run render:fade     # versão que termina com fade total para preto
node tools/render-video.js --fps 60 --hold 3 --out video/meu-story.mp4
```

Cada quadro é renderizado de forma determinística (`window.story.seek(t)`), então o vídeo sai sem quadros perdidos e com a sincronização exata.

## Linha do tempo

| Cena | Tempo | O que acontece |
| --- | --- | --- |
| 01 · Inicialização | 0–1,5 s | Os círculos surgem nas laterais e um pequeno ponto de luz pulsa no centro. O nome do evento aparece caractere por caractere, saindo de um leve desfoque. |
| 02 · Carregamento | 1,5–5 s | O nome sobe para o topo e o ponto cresce até virar o orbe. Um anel fino ao redor do orbe se completa de 0 a 100 % por uma curva contínua que passa por 08, 17, 34, 52, 76 e 91 %. O orbe e o brilho de fundo ficam mais intensos com o progresso, e `PROCESSANDO REGISTROS...` aparece abaixo. |
| 03 · Conclusão | 5–6 s | O anel fecha em 100 % no mesmo quadro em que a cena muda. O orbe pulsa, duas ondas circulares se expandem, o brilho ganha um toque laranja e o status passa para `PROCESSAMENTO CONCLUÍDO`. |
| 04 · Revelação | 6–8 s | O `100%` encolhe e se desfoca. `Fotos` e `disponíveis` entram em sequência, subindo e ganhando nitidez, e o ponto final laranja surge com um pequeno salto. O orbe desce para o centro da composição. |
| 05 · Tela final | 8–10 s | Abaixo do orbe aparecem o nome do evento, a chamada secundária e o link da galeria, [ronaldo-schopf.fotto.com.br](https://ronaldo-schopf.fotto.com.br/), com um sublinhado em degradê magenta → laranja que se desenha. Depois dos 10 s, o orbe continua respirando e os círculos seguem flutuando. |

### Paralaxe

- **Textos e orbe**: ficam em camadas com profundidades diferentes (`PARALLAX` em `js/story.js`). Duas "câmeras" percorrem a peça, uma no carregamento (0–6 s) e outra na revelação (6–10 s). Cada camada se desloca na proporção da sua profundidade; quanto mais baixa na tela, maior a profundidade. Por isso os textos começam afastados e se acomodam em velocidades diferentes, sem se sobrepor.
- **Círculos de fundo** (`CIRCLES`): sobem continuamente, e os maiores, "mais próximos", sobem mais rápido. Eles também reagem às câmeras. Ficam em faixas laterais para nunca cruzar os textos centrais.
- **Movimento reduzido**: com `prefers-reduced-motion`, a paralaxe é desligada.

Todos os elementos derivam de uma única função `render(t)` em `js/story.js`, então a sincronização é exata e qualquer instante pode ser reproduzido.

## Personalização

Tudo se edita no `index.html`:

- **Nome do evento**: as duas linhas `<span class="event__line">`. A tela final copia esse texto automaticamente.
- **Link da galeria**: o bloco `.cta` (o `href` e o texto em `.cta__link`).
- **Chamada secundária**: `.final__copy`.

O título se ajusta sozinho: `disponíveis.` ocupa 860 px de largura, e `Fotos` usa o mesmo tamanho de fonte.

## Direção de arte

- **Cores**:
  - Rosa-magenta `#D12384`: cor principal do brilho e do orbe;
  - Laranja intenso `#EA622F`: destaques (ponto final, brilho quente, sublinhado do link);
  - Branco suave `#FCFCFC`: tipografia e contornos;
  - Fundo preto `#000000`.
- **Fonte**: **Poppins**, com peso 600 no título, 500 no nome do evento e no link, e 400 na chamada. O título vai em caixa alta e baixa, como na referência.
- **Área segura**: os textos ficam entre y = 370 e y = 1600 px, centralizados.
- **Acessibilidade**: com `prefers-reduced-motion`, deslocamentos, desfoques, paralaxe e pulsos viram transições só de opacidade. O anel continua avançando.

---

# Logo animada — Ronaldo Schopf (4:5)

Animação da logo em 1080 × 1350 px, 9 s, em [`logo/index.html`](logo/index.html). O vídeo pronto está em [`video/ronaldo-schopf-logo.mp4`](video/ronaldo-schopf-logo.mp4) (H.264, 30 fps, 11 s com 2 s de tela final).

| Tempo | O que acontece |
| --- | --- |
| 0–2,3 s | A câmera começa próxima e inclinada e recua, abrindo espaço. A base branca surge como um ponto, vira uma linha, se abre em retângulo e inclina, sobre fundo preto. Uma retícula (halftone) magenta surge junto: um halo em volta do cartão e uma sombra retícula deslocada para baixo e à direita. |
| 2,3–4,9 s | `RONALDO` e `SCHOPF` são datilografados letra por letra, com cursor, batida em cada tecla e tranco do carro. No O, a estrela gira e se abre. |
| 5,0–6,7 s | A estrela pulsa, uma cópia sobe da letra O (soltando uma onda na retícula) e se transforma em uma estrela de 5 pontas. |
| 6,7–9 s | Ela se divide em 5 estrelas, com uma nova onda na retícula, que pousam em arco sobre a logo e cintilam. |

Cores: magenta `#B4407F`, branco `#FFFFFF`, fundo preto `#000000`. Fonte: Six Caps (Google Fonts), esticada para preencher a largura e inclinada junto com o cartão.

`?t=6500` congela um quadro, `?clean` esconde os controles, `R` repete. Para gerar o vídeo de novo: `npm run render:logo`.

---

# DEU BEACH — fotos em formato de agenda (9:16)

Story animado em 1080 × 1920 px, com 15,5 s de duração, em [`deu-beach/index.html`](deu-beach/index.html). Ele divulga a **cobertura fotográfica** do campeonato de beach tennis **DEU BEACH**: **sábado a partir das 18:00** e **domingo o dia todo**. É voltado para quem quer as fotos do evento.

É um redesign em rosa pink e branco da referência do convite no chat: balão → cartão de evento → toque do dedo → lista. Aqui, a lista virou a agenda de fotos do fim de semana. Os ícones são flat e minimalistas: câmera, raquete de beach tennis, bola, rede, sol, calendário e check.

O vídeo pronto está em [`video/deu-beach.mp4`](video/deu-beach.mp4). Especificações: H.264, 30 fps, com áudio AAC e 18 s de duração (os 15,5 s da animação mais 2,5 s de tela final, com os ícones flutuando).

| Tempo | O que acontece |
| --- | --- |
| 0–2,9 s | Um avatar com câmera aparece, o balão mostra "digitando…" e surge a pergunta **Vai jogar no DEU BEACH?** |
| 2,7–5,4 s | O balão vira o cartão do fotógrafo, montado linha por linha: Ronaldo Schopf · fotos · Suas fotos no DEU BEACH · Sábado, a partir das 18:00 · Domingo, o dia todo · **Quero minhas fotos**. |
| 5,0–6,6 s | O dedo entra e toca em "Quero minhas fotos". O cartão inverte para preto e gira. |
| 6,5–10,4 s | Aparece a agenda de fotos do fim de semana. Os blocos crescem na grade de horários: SÁB das 18:00 até 00:00 e DOM das 08:00 até 00:00. No rodapé, **Lembrete das fotos ativado**. |
| 10,5–12,1 s | Um jogador responde: **Quero as fotos!** |
| 12,1–15,5 s | Um círculo pinta a tela de rosa e a marca **DEU BEACH** monta, com "Fotos do Campeonato de Beach Tennis", os dois horários em blocos de calendário e o crédito "Cobertura fotográfica · Ronaldo Schopf". |

Cores: rosa pink `#FF2E93` (no lugar do preto), branco `#FFFFFF` e tons de rosa para o texto secundário e os fundos suaves (`#E0237F`, `#FFE6F2`, `#FFD6EA`). Fonte: Inter (Google Fonts).

Os tamanhos são enxutos para um visual mais minimalista: o cartão tem 740 px de largura e a agenda, 720 px. Na tela final, tudo fica numa coluna de 680 px, alinhada à esquerda, com a marca no alto e os horários e o crédito embaixo.

## Efeitos sonoros

O MP4 tem áudio (AAC, 48 kHz, estéreo). Os efeitos são sintetizados por [`tools/sfx-deu-beach.py`](tools/sfx-deu-beach.py), sem bancos de som externos, e salvos em `deu-beach/sfx.wav`. Eles seguem a linha do tempo da animação:

| Momento | Som |
| --- | --- |
| Avatar, balões e resposta | "pop" de bolha |
| Digitando… e as linhas do cartão entrando | tiques secos de interface |
| Troca de cena, dedo e tela ficando rosa | sopro de ar (whoosh) |
| Toque em "Quero minhas fotos" e crédito do fotógrafo | **obturador de câmera** |
| Blocos da agenda crescendo | tom que sobe |
| Lembrete das fotos ativado | sino de confirmação |
| Ícones da tela final | "tok" de bolada de beach tennis |
| DEU / BEACH | batida grave |

Para ajustar um som ou o momento em que ele toca, edite a lista `CUES` no script (tempos em ms) e rode `npm run render:deubeach`, que gera o áudio e o vídeo. Para gerar só o áudio, use `npm run sfx:deubeach` (precisa de Python 3 com NumPy). O `tools/render-video.js` também aceita `--audio arquivo.wav` para colocar áudio em qualquer outra peça.

`?t=8000` congela um quadro, `?clean` esconde os controles, `R` repete. Para gerar o vídeo de novo: `npm run render:deubeach`.

---

# Fotos do vôlei — conversa no WhatsApp (9:16)

Story animado em 1080 × 1920 px, com 10,5 s de duração, em [`fotos-volei/index.html`](fotos-volei/index.html). Simula uma conversa no estilo WhatsApp com o fotógrafo, sobre um fundo em degradê de rosa pink (`#FF2E93`) para laranja (`#FF8A3D`). Todo o texto é branco.

O vídeo pronto está em [`video/fotos-volei.mp4`](video/fotos-volei.mp4). Especificações: H.264, 30 fps, com áudio AAC e 13 s de duração (os 10,5 s da animação mais 2,5 s com o álbum completo na tela).

| Tempo | O que acontece |
| --- | --- |
| 0–0,5 s | Entra o cabeçalho da conversa: Ronaldo Schopf · fotógrafo · online. |
| 0,74–1,5 s | O status muda para "digitando…" e chega **Suas fotos do vôlei de ontem estão te esperando**. |
| 3,02 s | A pessoa responde **Onde?**, e os tiques acendem quando a mensagem é lida. |
| 3,78–4,54 s | "digitando…" de novo e chega **Clica no link aqui abaixo 👇**. |
| 5,3–8,3 s | O fotógrafo envia um álbum 2 × 2. Cada foto chega desfocada, com o anel de download, e aparece nítida em sequência. A última foto mostra **+24**. |

Cada mensagem nova empurra as anteriores para cima, como no app.

**Fotos**: o álbum usa quatro fotos do evento, salvas em `fotos-volei/fotos/1.jpg` a `4.jpg` em 800 × 800 px. A quarta foi recortada de vertical para quadrada, mantendo os rostos no enquadramento. Para trocar, substitua os arquivos ou atualize a lista `PHOTOS` no `index.html` (jpg, png ou webp, 4 itens; recortes quadrados ficam melhores). O número em "+24" é a constante `MORE`.

**Trilha e efeitos sonoros** ([`tools/sfx-fotos-volei.py`](tools/sfx-fotos-volei.py)): tudo é sintetizado, sem bancos de som.

A trilha é um chill-pop a 79 BPM, e a animação foi travada no compasso dela (1 tempo = 760 ms):

| Tempo | Música | Efeitos |
| --- | --- | --- |
| 0–2,3 s | pad escuro (Am7) entrando devagar | whoosh do cabeçalho, tiques do "digitando…", notificação da 1ª mensagem |
| 2,3–5,3 s | Fmaj7 com o filtro abrindo, baixo e chimbal suave; um riser no último tempo | "swoop" do "Onde?", tique de lida, notificação do "Clica no link" |
| 5,3 s | **a batida entra junto com o álbum**, com um impacto grave | notificação do álbum |
| 5,3–11,4 s | groove com bumbo, palmas, baixo sincopado, arpejo com eco e pad que "respira" com o bumbo | tiques do download; **obturador + uma nota brilhante** a cada foto (6,82 · 7,20 · 7,58 · 7,96 s, em colcheias, formando um arpejo que sobe), "pop" no +24, sino em 8,34 s |
| 11,4–13 s | resolve em Cmaj9 e some | — |

Os efeitos passam por um reverb, a trilha abaixa um pouco quando chega mensagem e o estéreo é aberto. Os instrumentos (pad, baixo, bumbo, palma, chimbal, pluck, riser, delay e reverb) ficam em [`tools/sfx_synth.py`](tools/sfx_synth.py), compartilhados com o DEU BEACH.

`?t=7000` congela um quadro, `?clean` esconde os controles, `R` repete. Para gerar o vídeo de novo: `npm run render:volei`.

---

# Registro Premiado — flyer animado (1:1)

Flyer animado em 1080 × 1080 px, com 12,5 s de duração, em [`registro/index.html`](registro/index.html). Segue a mesma pegada do "Fotos do vôlei": uma conversa com o fotógrafo, com a imagem do prêmio baixando e uma trilha no compasso. No fim, o flyer completo se monta. As cores são as do flyer: fundo mostarda (`#D4AE3A`, em degradê de `#E3BD48` a `#C0951F`) e texto branco. As fontes são Montserrat no flyer e Inter no chat.

O vídeo pronto está em [`video/registro-premiado.mp4`](video/registro-premiado.mp4). Especificações: 1080 × 1080, H.264, 30 fps, com áudio AAC e 14,5 s de duração (2 s a mais com o flyer na tela).

| Tempo | O que acontece | Som |
| --- | --- | --- |
| 0,74–1,5 s | "digitando…" → **Seu registro foi premiado 🏆** | notificação; pad de acordes entrando |
| 3,02 s | **Sério?! 😱** | "swoop" de envio; os acordes abrem |
| 3,78–5,3 s | chega a imagem do prêmio, que baixa com o anel de progresso | tiques do download e um riser |
| **5,3 s** | a imagem fica nítida, com um brilho dourado: é o próprio flyer em miniatura | **a batida entra**, com obturador, impacto e um arpejo de "prêmio" |
| 6,06–6,82 s | chega o cupom **FOTOGRATIS2026**, e "Copiar código" vira "Copiado" | notificação e clique |
| 7,58 s | **Ganhei, e agora?** | envio |
| 8,34–9,1 s | "digitando…" → **Coloque um número par de fotos no carrinho e pague pela metade** | notificação |
| 10,62 s | a conversa desfoca e sai | a bateria para e uma subida cria tensão |
| 10,8–12,5 s | o flyer se monta: REGIS bate, TRO desliza, o sorriso se desenha e pisca, as linhas de PREMIADO se abrem, **FOTO GRÁTIS** pousa (11,38 s), o contorno do cupom se desenha e entra a regra do número par | **a batida volta com tudo** e o arpejo de "prêmio" toca de novo; acorde final em 12,9 s |

A trilha é um chill-pop a 79 BPM em ré maior, sintetizado por [`tools/sfx-registro.py`](tools/sfx-registro.py) com os instrumentos de [`tools/sfx_synth.py`](tools/sfx_synth.py).

O texto do flyer fica no `<template id="flyer-tpl">` do `index.html`. Ele é usado tanto na miniatura do chat quanto no final, e REGISTRO e FOTO GRÁTIS se ajustam sozinhos à largura de 860 px.

`?t=11500` congela um quadro, `?clean` esconde os controles, `R` repete. Para gerar o vídeo de novo: `npm run render:registro`.
