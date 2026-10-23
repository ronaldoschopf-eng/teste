# Radar de Oportunidades Fotográficas — Santa Maria/RS

Encontra eventos esportivos num raio de 100 km (linha reta) de Santa Maria/RS
que tenham sinais públicos de inscrições ou realização e verifica se já há fotos
à venda na Fotto. O objetivo é achar eventos para oferecer cobertura fotográfica.

> **Estado atual: protótipo (etapa 2 de 3).** Nada aqui afirma que a busca está
> completa. Leia "Limitações" antes de usar os resultados.

## 1. Levantamento exploratório (23/10/2026)

O levantamento foi feito numa sessão na nuvem com rede restrita:

| Fonte | Acesso | O que dá para obter legitimamente |
|---|---|---|
| fotto.com.br e os 4 perfis indicados | **Bloqueado** na sessão (nem robots.txt foi lido). Visível só por resultados de busca indexada. | Páginas de evento públicas no padrão `/<slug>/e/<id>`, com cidade, data e nº de fotos. Perfis em subdomínios `<perfil>.fotto.com.br`. |
| Outros perfis Fotto da região | Descobertos pela busca: `silvio-kaufmann`, `fotomix`, `andersonfotos`. Já incluídos no coletor. | Álbuns de Santa Maria e Cachoeira do Sul. |
| Prefeitura de Santa Maria (SMEL) | Por busca indexada | Calendário oficial de corridas 2026, lotes de vagas e nº de inscritos em campeonatos. |
| Wind Fit (inscrições) | Por busca indexada | Páginas de inscrição e regulamentos em PDF. Nº de inscritos não aparece. |
| corridasderuars.com.br, Sesc/RS | Por busca indexada | Datas e horários por cidade. |
| Federações (FGT/beach tennis etc.) | Por busca indexada | Nenhum evento da região em nov/2026 encontrado. Precisa de consulta direta. |
| Imprensa local | Por busca indexada | Confirma se o evento aconteceu. |

Inventário completo: aba **FONTES** do Excel e `data/fontes.json`.

**Consequência:** nesta sessão não foi possível abrir nenhuma página da Fotto.
Os eventos do protótipo ficaram como **D (verificação pendente)**, salvo dois
casos **A** em que o resultado indexado mostra o álbum e o nº de fotos. A
estrutura das páginas da Fotto **ainda precisa ser inspecionada** (comando
`inspecionar`) antes de confiar no coletor automático.

## 2. Protótipo (13 eventos)

`data/eventos.json` tem 12 eventos dentro do raio e 1 fora dele (Santiago, mantido para testar o filtro).
Resultado em `saida/radar_fotto.xlsx` e `saida/radar_fotto.csv`:

- **OPORTUNIDADES: 0.** Nenhum evento pôde ser classificado como B ou C
  sem acesso à Fotto. Isso não significa que não haja oportunidades.
- **REVISAR: 10.** Candidatos mais fortes depois da verificação local:
  - 4ª Rústica da Medianeira (07/11)
  - Corrida de Aniversário de Formigueiro (01/11)
  - 2ª Rústica Abas Largas (29/11)
  - Corrida da Asa – Base Aérea (11/10): a busca não achou álbum de Santa Maria.
- **A (fotos publicadas):** Corrida Sesc 2026 e Corrida SESI 2026, em Santa Maria.

## 3. Instalação

```bash
cd radar-fotto
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export RADAR_CONTATO="seu-email@exemplo.com"          # vai no User-Agent
```

## 4. Uso

```bash
python -m radar inspecionar     # 1º passo: salva HTML + resumo da estrutura em inspecao/
python -m radar verificar       # consulta a Fotto e atualiza data/eventos.json
python -m radar verificar --ids corrida-da-asa-sm-2026   # só alguns eventos
python -m radar validar         # checa se cada evento tem fonte/evidência
python -m radar exportar        # gera saida/radar_fotto.xlsx e .csv
python -m radar tudo            # verificar + exportar (para agendar)
python -m radar geocodificar    # refina coordenadas das cidades (OpenStreetMap)
python -m unittest discover -s tests
```

Depois de `inspecionar`, abra `inspecao/resumo.json`:
- Se `links_album` for 0 e `renderizado_por_js` for true, a página monta a
  lista por JavaScript. Aí é preciso avaliar Playwright (só se os termos permitirem).
- Se houver um formulário de busca pública, preencha `FOTTO_URL_BUSCA` em
  `radar/config.py` (ex.: `"https://www.fotto.com.br/busca?q={q}"`). **Sem
  essa busca o coletor nunca marca C**: só consultar os perfis cobre parte da
  plataforma, e o resultado fica como D.

### Adicionar ou atualizar eventos

Edite `data/eventos.json`, copiando um item existente. Regras (o `validar` confere):
- `link_confirmacao` é obrigatório.
- `inscricoes` é um destes valores: `abertas`, `encerradas_futuro`,
  `numero_divulgado` (exige `inscritos_fonte`), `confirmado_sem_evidencia`,
  `passado_confirmado`, `desconhecida`.
- Nunca escreva um número de inscritos sem fonte. Limite de vagas não é número de inscritos.
- Classe A/B exige URL e data da evidência.

Eventos repetidos (mesmo nome normalizado, data e cidade) são unidos na exportação.

### Agendamento

Linux/macOS (cron, diário às 7h10):
```
10 7 * * * cd /caminho/radar-fotto && .venv/bin/python -m radar tudo >> logs/cron.log 2>&1
```
Windows: Agendador de Tarefas → ação `C:\caminho\radar-fotto\.venv\Scripts\python.exe`,
argumentos `-m radar tudo`, iniciar em `C:\caminho\radar-fotto`.

## 5. Classificação

| Classe | Quando |
|---|---|
| A. FOTOS PUBLICADAS | Álbum da mesma edição (data ±3 dias) com nº de fotos > 0 |
| B. AINDA NÃO DISPONÍVEIS | A página do evento na Fotto diz explicitamente "em breve"/"ainda não disponíveis" |
| C. NENHUM ÁLBUM ENCONTRADO | Perfis **e** busca interna consultados sem erro, sem nenhum álbum casado |
| D. PENDENTE | Qualquer falha de acesso, cobertura parcial ou só busca indexada |

Na aba OPORTUNIDADES, a coluna "Tipo de ausência" separa **B (ausência
confirmada)** de **C (ausência de resultados)**. Entram eventos futuros ou
que aconteceram há até 30 dias (`DIAS_APROVEITAVEL` em `radar/exportar.py`).

## 6. Regras de coleta

- `robots.txt` é respeitado. Se não puder ser lido, o host é ignorado.
- Até 2 requisições simultâneas e no mínimo 3 s entre requisições ao mesmo host.
  Há retentativas e respeito a `Retry-After`.
- Respostas ficam em cache por 12 h em `cache/`. Use `--sem-cache` para ignorar.
- Login, CAPTCHA, HTTP 401/403 ou página anti-bot fazem o coletor parar naquele
  host. Nada disso é contornado. Endpoints privados não são usados.
- Logs ficam em `logs/radar.log`.
- Distância: linha reta (haversine) até a sede municipal aproximada. A distância
  rodoviária só é preenchida com fonte (`distancia_rodoviaria_km` e
  `fonte_distancia_rodoviaria`); sem fonte, fica "não verificada". Cachoeira do
  Sul (96,5 km) e Caçapava do Sul (97,4 km) estão perto do limite. Use o
  `lat`/`lon` exato do local quando houver.

## 7. Limitações

- Os dados do protótipo vêm de **resumos de mecanismo de busca**. As páginas não
  foram abertas e cada linha precisa ser conferida no link indicado.
- O coletor da Fotto não foi testado contra o site real.
- Beach tennis, padel, MTB, artes marciais e outras modalidades ainda têm
  pouca cobertura no protótipo. A etapa 3 (ampliar fontes) só deve começar depois da validação.
