# Fotos Disponíveis — Story animado (9:16)

Story vertical de 1080 × 1920 px, com 10 segundos de duração, que anuncia a liberação das fotos de um evento.
O visual é monocromático e tipográfico: o sistema inicializa, carrega os registros do evento e revela a mensagem **FOTOS DISPONÍVEIS.**

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
- 12 s de duração: os 10 s da animação mais 2 s de tela final, para dar tempo de leitura.

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
| 01 · Inicialização | 0–1,5 s | Duas guias verticais finas são desenhadas, o indicador central pisca e o nome do evento é digitado caractere por caractere, com uma leve "decodificação". |
| 02 · Carregamento | 1,5–5 s | O nome sobe para o topo. A barra fina avança de 0 a 100 % por uma curva contínua que passa por 08, 17, 34, 52, 76 e 91 %. A porcentagem acompanha a barra, ao lado de `PROCESSANDO REGISTROS...`. |
| 03 · Conclusão | 5–6 s | A barra chega a 100 % no mesmo quadro em que a cena muda. A porcentagem pulsa, a barra engrossa com um flash branco sutil, o status passa para `PROCESSAMENTO CONCLUÍDO` e há uma pausa. |
| 04 · Revelação | 6–8 s | O `100%` diminui e some. A barra vira a linha divisória. `FOTOS` é revelada por uma máscara horizontal (um bloco branco varre a palavra e recua) e `DISPONÍVEIS.` sobe por trás de uma máscara. |
| 05 · Tela final | 8–10 s | O nome do evento aparece abaixo da linha, seguido da chamada secundária e do link da galeria, [ronaldo-schopf.fotto.com.br](https://ronaldo-schopf.fotto.com.br/). As guias somem no preto. |

### Paralaxe

Os textos ficam em camadas com profundidades diferentes (`PARALLAX` em `js/story.js`). Duas "câmeras" percorrem a peça, uma no carregamento (0–6 s) e outra na revelação (6–10 s). Cada camada se desloca na proporção da sua profundidade, e quanto mais baixa na tela, maior a profundidade. Por isso os textos começam afastados e se acomodam em velocidades diferentes, sem se sobrepor. No fim de cada ato, todos chegam exatamente à posição final. Com `prefers-reduced-motion`, a paralaxe é desligada.

Todos os elementos derivam de uma única função `render(t)` em `js/story.js`, então a sincronização é exata e qualquer instante pode ser reproduzido.

## Personalização

Tudo se edita no `index.html`:

- **Nome do evento**: as duas linhas `<span class="event__line">`. A tela final copia esse texto automaticamente.
- **Link da galeria**: o bloco `.cta` (o `href` e o texto em `.cta__link`).
- **Chamada secundária**: `.final__copy`.

Os títulos `FOTOS` e `DISPONÍVEIS.` se ajustam sozinhos à largura útil de 888 px.

## Direção de arte

- **Cores**: só `#000000`, `#FFFFFF`, `#808080` e `#1A1A1A`.
- **Fontes**:
  - **Anton** na mensagem principal;
  - **Archivo** condensada no nome do evento;
  - **Space Grotesk** na chamada secundária;
  - **Space Mono** nas porcentagens e nos indicadores.
- **Área segura**: o conteúdo fica entre y = 250 e y = 1600 px, com margens laterais de 96 px.
- **Acessibilidade**: com `prefers-reduced-motion`, deslocamentos, máscaras, flash e piscadas viram transições só de opacidade. A barra continua avançando.
