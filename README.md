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

## Versão em preto e branco (`texto-pb.html`)

Uma animação curta, de 6 s, só com o texto **Fotos Disponíveis** (só as iniciais maiúsculas), branco sobre preto, sem nenhum outro elemento. A fonte é a **Batica Sans Regular** (`fonts/batica-sans-regular.otf`), carregada localmente, com espaçamento entre letras de -50 (`-0.05em`) e as duas palavras no mesmo tamanho. Abra `texto-pb.html`; os controles e os parâmetros `?t=` e `?clean` funcionam como no story principal. O vídeo pronto está em [`video/fotos-disponiveis-pb.mp4`](video/fotos-disponiveis-pb.mp4) (7 s, com 1 s de tela final). Para gerar de novo, rode `npm run render:pb`.

| Tempo | O que acontece |
| --- | --- |
| 0,2–1,3 s | `Fotos` sobe letra por letra de dentro de uma máscara. |
| 0,8–2,6 s | `Disponíveis` sobe e o espaço entre as letras se fecha até -50. |
| 0–6 s | Zoom lento e contínuo no título. |

## Versão com formas (`texto-formas.html`)

Recriação de uma animação de referência, em laranja `#EA622F` e branco, com a mesma fonte, tamanho e espaçamento da versão P&B. Tudo é desenhado num canvas, em ciclos de 74 quadros a 30 fps (≈ 2,47 s). O vídeo [`video/fotos-disponiveis-formas.mp4`](video/fotos-disponiveis-formas.mp4) tem 4,9 s:

1. um ciclo com **4º Festival Barra Vento de Capoeira** (três linhas), branco sobre laranja. Depois que as letras se montam, um marca-texto rosa `#D12384` se desenha da esquerda para a direita atrás de **Capoeira**;
2. a tela vira branca a partir do centro e, logo em seguida, sem as formas, **Fotos Disponíveis** é datilografado em laranja letra por letra (máquina de escrever), com um cursor;
3. 1 s parado no fim, com o cursor piscando.

### Efeitos sonoros

O vídeo tem uma trilha de efeitos sincronizada quadro a quadro. A trilha também fica separada em [`video/fotos-disponiveis-formas.wav`](video/fotos-disponiveis-formas.wav) (48 kHz, estéreo), para usar num editor. Todos os sons são sintetizados por `tools/render-audio.js`, sem amostras externas. Os tempos vêm de `window.story.cues()`, que usa os mesmos números da animação.

| Momento | Som |
| --- | --- |
| Texto some | sopro suave descendo |
| Arcos girando | sopro que sobe e passeia entre os lados (estéreo) |
| Arcos viram pontos | três "pops" em notas subindo |
| Pontos girando | brilho agudo com tremolo |
| Pontos esticam / barras caem | "boing" para cima e glissando para baixo |
| Letras se montam | um tique curto por letra, posicionado no estéreo conforme a letra |
| Traços curvos | sopros curtos |
| Marca-texto | ruído de caneta no papel, da esquerda para a direita |
| Tela vira branca | sopro grande e baque grave |
| Máquina de escrever | uma tecla por letra (estalo, corpo e a haste voltando) |
| Fim da digitação | sino de máquina de escrever |

Para gerar de novo (trilha e vídeo), rode `npm run render:formas`. O ciclo do nome do evento segue esta sequência (na segunda parte só há a digitação, que começa 12 quadros depois do fim do ciclo, com uma letra a cada 2 quadros):

| Quadros | O que acontece |
| --- | --- |
| 0–7 | O texto some. |
| 5–20 | Três arcos entram de fora girando, encolhem e engrossam até virar três pontos. |
| 20–32 | Os pontos giram devagar em triângulo e param. |
| 32–38 | Os pontos se esticam em barras verticais, que caem e afinam. |
| 37–58 | Pedaços das letras se encaixam do centro para as bordas, com traços curvos, tracinhos e pontos que se desenham e somem. |
| 58–74 | Texto parado. |

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
