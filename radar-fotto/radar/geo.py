"""Distância geográfica (linha reta). Distância rodoviária é campo separado."""
import json
import math
import unicodedata

from . import config


def _norm(txt: str) -> str:
    txt = unicodedata.normalize("NFKD", txt or "")
    return "".join(c for c in txt if not unicodedata.combining(c)).lower().strip()


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _cidades_extra() -> dict:
    arq = config.DIR_DADOS / "cidades_geocodificadas.json"
    if arq.exists():
        return {k: tuple(v) for k, v in json.loads(arq.read_text("utf-8")).items()}
    return {}


def coordenadas(cidade: str, lat=None, lon=None):
    """Usa lat/lon do evento se houver; senão a sede da cidade."""
    if lat is not None and lon is not None:
        return float(lat), float(lon), "coordenada do local"
    tabela = {**config.CIDADES, **_cidades_extra()}
    alvo = _norm(cidade)
    for nome, (la, lo) in tabela.items():
        if _norm(nome) == alvo:
            return la, lo, "sede municipal (aprox.)"
    return None, None, "cidade sem coordenada"


def distancia_centro(cidade: str, lat=None, lon=None):
    la, lo, origem = coordenadas(cidade, lat, lon)
    if la is None:
        return None, origem
    d = haversine_km(config.CENTRO_LAT, config.CENTRO_LON, la, lo)
    return round(d, 1), origem


def geocodificar(cidades, http):
    """Geocodifica cidades via Nominatim (OSM), 1 req/s, com cache."""
    arq = config.DIR_DADOS / "cidades_geocodificadas.json"
    atual = json.loads(arq.read_text("utf-8")) if arq.exists() else {}
    for c in cidades:
        if c in atual:
            continue
        url = ("https://nominatim.openstreetmap.org/search?format=json&limit=1"
               f"&countrycodes=br&city={c}&state=Rio%20Grande%20do%20Sul")
        resp = http.get(url, intervalo=1.1)
        if resp and resp.ok:
            dados = resp.json()
            if dados:
                atual[c] = [float(dados[0]["lat"]), float(dados[0]["lon"])]
    arq.write_text(json.dumps(atual, ensure_ascii=False, indent=2), "utf-8")
    return atual
