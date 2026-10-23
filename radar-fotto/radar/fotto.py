"""Verificação de álbuns na Fotto usando apenas páginas públicas.

Fluxo:
1. `inspecionar` salva as páginas iniciais e um resumo da estrutura (links,
   formulários, scripts). Rode-o antes de confiar no coletor: os seletores
   abaixo partem do padrão de URL público `/<slug>/e/<id>` visto em
   resultados de busca e PRECISAM ser confirmados na inspeção.
2. `coletar_indice` lê as páginas públicas dos perfis e monta um índice de
   álbuns (id, título, url, perfil).
3. `verificar_evento` casa o evento com os álbuns, abre os candidatos e
   classifica em A/B/C/D.
"""
import json
import logging
import re
import unicodedata
from datetime import date, datetime
from urllib.parse import quote_plus, urljoin, urlparse

from bs4 import BeautifulSoup

from . import config
from .modelo import agora_local

log = logging.getLogger("radar.fotto")

RE_ALBUM = re.compile(r"/e/(\d+)")
RE_FOTOS = re.compile(r"([\d\.]+)\s*(?:fotos|photos)\b", re.I)
RE_DATA = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
SINAIS_EM_BREVE = ("em breve", "fotos em breve", "ainda não disponíveis", "ainda nao disponiveis",
                   "aguarde", "em processamento", "coming soon", "próximos eventos", "proximos eventos")
STOP = {"de", "da", "do", "das", "dos", "e", "a", "o", "em", "na", "no", "rs", "fotos",
        "busca", "facial", "numerica", "numero", "rec", "por", "peito", "reconhecimento"}


def normalizar(txt):
    txt = unicodedata.normalize("NFKD", txt or "")
    txt = "".join(c for c in txt if not unicodedata.combining(c)).lower()
    txt = re.sub(r"(\d+)\s*[ªºao°]\b", r"\1", txt)  # 4ª -> 4
    return re.sub(r"[^a-z0-9]+", " ", txt).strip()


def tokens(txt):
    return {t for t in normalizar(txt).split() if t not in STOP and (len(t) > 1 or t.isdigit())}


def _edicao(txt):
    m = re.match(r"^\s*(\d{1,2})\b", normalizar(txt))
    return m.group(1) if m else None


def similaridade(nome_evento, titulo_album):
    a, b = tokens(nome_evento), tokens(titulo_album)
    if not a or not b:
        return 0.0
    ea, eb = _edicao(nome_evento), _edicao(titulo_album)
    if ea and eb and ea != eb:  # edições diferentes (ex.: 3ª x 4ª)
        return 0.0
    return len(a & b) / len(a | b) if (a | b) else 0.0


# ------------------------------------------------------------- inspeção
def inspecionar(http):
    config.DIR_INSPECAO.mkdir(exist_ok=True)
    resumo = {}
    for url in [config.FOTTO_BASE + "/", *config.FOTTO_PERFIS]:
        r = http.get(url)
        if not r:
            resumo[url] = {"acessivel": False}
            continue
        nome = re.sub(r"[^a-z0-9]+", "_", urlparse(url).netloc + urlparse(url).path)
        (config.DIR_INSPECAO / f"{nome}.html").write_text(r.texto, "utf-8")
        s = BeautifulSoup(r.texto, "html.parser")
        albuns = [(a.get_text(" ", strip=True), urljoin(url, a["href"]))
                  for a in s.find_all("a", href=True) if RE_ALBUM.search(a["href"])]
        resumo[url] = {
            "acessivel": True,
            "status": r.status,
            "titulo": s.title.get_text(strip=True) if s.title else None,
            "links_album": len(albuns),
            "exemplos_album": albuns[:15],
            "formularios": [{"action": f.get("action"), "method": f.get("method"),
                             "campos": [i.get("name") for i in f.find_all(["input", "select"])]}
                            for f in s.find_all("form")],
            "links_paginacao": sorted({urljoin(url, a["href"]) for a in s.find_all("a", href=True)
                                       if re.search(r"(page|pagina)=\d+|/eventos", a["href"])})[:20],
            "scripts": [sc.get("src") for sc in s.find_all("script", src=True)][:20],
            "renderizado_por_js": len(s.get_text(strip=True)) < 500,
        }
    (config.DIR_INSPECAO / "resumo.json").write_text(json.dumps(resumo, ensure_ascii=False, indent=2), "utf-8")
    return resumo


# ------------------------------------------------------------- índice
def _extrair_albuns(html, url_pagina, perfil):
    s = BeautifulSoup(html, "html.parser")
    for a in s.find_all("a", href=True):
        m = RE_ALBUM.search(a["href"])
        if m:
            yield {"id": m.group(1), "url": urljoin(url_pagina, a["href"]),
                   "titulo": a.get_text(" ", strip=True) or a.get("title", ""), "perfil": perfil}


def coletar_indice(http, max_paginas_por_perfil=5):
    """Lê páginas públicas dos perfis. Devolve (álbuns, perfis_ok, perfis_falhos)."""
    albuns, ok, falhos = {}, [], []
    for perfil in [config.FOTTO_BASE + "/", *config.FOTTO_PERFIS]:
        fila, vistos = [perfil], set()
        while fila and len(vistos) < max_paginas_por_perfil:
            url = fila.pop(0)
            if url in vistos:
                continue
            vistos.add(url)
            r = http.get(url)
            if not r or not r.ok:
                if url == perfil:
                    falhos.append(perfil)
                break
            for alb in _extrair_albuns(r.texto, url, perfil):
                albuns.setdefault(alb["id"], alb)
            s = BeautifulSoup(r.texto, "html.parser")
            for a in s.find_all("a", href=True):
                prox = urljoin(url, a["href"])
                if urlparse(prox).netloc == urlparse(perfil).netloc and re.search(r"(page|pagina)=\d+", prox):
                    fila.append(prox)
        if perfil not in falhos:
            ok.append(perfil)
    log.info("índice Fotto: %s álbuns de %s perfis (%s falharam)", len(albuns), len(ok), len(falhos))
    return list(albuns.values()), ok, falhos


def buscar(http, termo):
    if not config.FOTTO_URL_BUSCA:
        return None  # busca interna ainda não confirmada pela inspeção
    url = config.FOTTO_URL_BUSCA.format(q=quote_plus(termo))
    r = http.get(url)
    if not r or not r.ok:
        return None
    return list(_extrair_albuns(r.texto, url, "busca"))


# ------------------------------------------------------------- detalhe
def detalhar(http, url):
    r = http.get(url)
    if not r or not r.ok:
        return None
    s = BeautifulSoup(r.texto, "html.parser")
    texto = s.get_text(" ", strip=True)
    baixo = texto.lower()
    m = RE_FOTOS.search(texto)
    fotos = int(m.group(1).replace(".", "")) if m else None
    d = RE_DATA.search(texto)
    data_alb = None
    if d:
        try:
            data_alb = date(int(d.group(3)), int(d.group(2)), int(d.group(1)))
        except ValueError:
            pass
    return {"url": r.url, "titulo": s.title.get_text(strip=True) if s.title else "",
            "fotos": fotos, "data": data_alb.isoformat() if data_alb else None,
            "em_breve": any(x in baixo for x in SINAIS_EM_BREVE) and not fotos}


# ------------------------------------------------------------- classificação
def classificar(detalhes, cobertura_completa):
    """detalhes: álbuns candidatos já abertos (mesma edição/data)."""
    com_fotos = [d for d in detalhes if d.get("fotos")]
    if com_fotos:
        return "A", com_fotos[0]["url"]
    em_breve = [d for d in detalhes if d.get("em_breve")]
    if em_breve:
        return "B", em_breve[0]["url"]
    if cobertura_completa and not detalhes:
        return "C", None
    return "D", None


def verificar_evento(http, ev, indice, perfis_ok, perfis_falhos, limiar=0.55):
    nomes = [ev["nome"], *ev.get("variantes", [])]
    candidatos = {}
    for alb in indice:
        if max(similaridade(n, alb["titulo"]) for n in nomes) >= limiar:
            candidatos[alb["id"]] = alb
    buscas_ok = config.FOTTO_URL_BUSCA is not None
    for n in nomes:
        res = buscar(http, n)
        if res is None:
            buscas_ok = False
            continue
        for alb in res:
            if similaridade(n, alb["titulo"]) >= limiar:
                candidatos.setdefault(alb["id"], alb)

    data_ev = date.fromisoformat(ev["data"]) if ev.get("data") else None
    detalhes = []
    for alb in candidatos.values():
        d = detalhar(http, alb["url"])
        if not d:
            continue
        if data_ev and d["data"] and abs((date.fromisoformat(d["data"]) - data_ev).days) > 3:
            continue  # outra edição
        d["perfil"] = alb["perfil"]
        detalhes.append(d)

    cobertura = buscas_ok and not perfis_falhos
    classe, url = classificar(detalhes, cobertura)
    agora = agora_local().strftime("%Y-%m-%d %H:%M %Z")
    notas = []
    if not buscas_ok:
        notas.append("busca interna da Fotto não configurada/inacessível: cobertura parcial (só perfis)")
    if perfis_falhos:
        notas.append("perfis inacessíveis: " + ", ".join(perfis_falhos))
    return {
        "classe": classe,
        "evidencia_url": url or (config.FOTTO_BASE if classe == "C" else None),
        "evidencia_data": agora if classe != "D" else None,
        "metodo": "coletor automático (perfis públicos" + (" + busca interna)" if buscas_ok else ")"),
        "albuns": [{k: d[k] for k in ("url", "titulo", "fotos", "data", "perfil")} for d in detalhes],
        "perfis": sorted({d["perfil"] for d in detalhes}),
        "perfis_consultados": perfis_ok,
        "notas": "; ".join(notas),
        "verificado_em": agora,
    }
