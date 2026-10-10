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

# Fotos sendo adicionadas — Story animado (9:16, flat)

Segunda peça, em [`adicionando.html`](adicionando.html): a arte laranja "Fotos sendo adicionadas" animada em flat design, com paralaxe. Ela reproduz a arte estática ao pixel no quadro final: mesma posição, tipografia e cores.

- **Cores**: laranja `#E9612E` (fundo) e branco `#FFFFFF`. As formas de fundo usam só branco translúcido sobre o laranja.
- **Fonte**: **Montserrat Itálico**, peso 800 (negrito) e 300 (light), com espaçamento negativo calibrado contra a arte original.
- **QR code**: redesenhado em vetor a partir da arte. Ele aponta para `https://www.fotto.com.br/ronaldo.schopf` e continua legível no quadro final.

Os controles são os mesmos da outra peça: `?t=<ms>`, `?clean`, `R` e `Espaço`.

| Cena | Tempo | O que acontece |
| --- | --- | --- |
| 01 · Barra | 0,2–6,8 s | O contorno da barra se desenha a partir da esquerda. O preenchimento surge como um ponto com um pequeno salto e cresce por uma curva contínua até 76 %. Listras diagonais em laranja suave correm dentro dele sem parar. |
| 02 · Status | 1,5–3 s | `Fotos sendo` sobe por trás de uma máscara, palavra por palavra. As letras de `adicionadas` saltam em sequência. A partir de 7 s, uma onda leve percorre essas letras a cada 3,2 s. |
| 03 · Evento | 2,9–4 s | O nome do evento entra palavra por palavra, subindo de trás da linha de base com uma leve inclinação que se desfaz. |
| 04 · Link | 3,8–5 s | `ronaldo-schopf` desce do topo e `.fotto.com.br` é "digitado" caractere por caractere. |
| 05 · QR | 5–7,2 s | Os três marcadores de posição giram e se encaixam, e os módulos aparecem em uma onda diagonal. |

**Paralaxe**: uma "câmera" desce ao longo dos primeiros 8 s. Cada camada tem uma profundidade (`DEPTH` em `js/adicionando.js`): link 0,25, evento 0,45, status 0,65, barra 0,8 e QR 1,05. As camadas mais baixas começam mais longe e se acomodam mais rápido. As formas de fundo (`SHAPES`) têm profundidades próprias, entre 0,3 e 1,8, e seguem flutuando depois do fim.

Para gerar o vídeo:

```bash
npm run render:adicionando   # gera video/fotos-sendo-adicionadas.mp4
```
