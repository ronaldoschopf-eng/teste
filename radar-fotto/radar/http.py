"""Cliente HTTP educado: robots.txt, limite por host, cache em disco, retentativas.

Não contorna login, CAPTCHA ou bloqueios: se detectar um deles, marca o host
como bloqueado e devolve None para as próximas requisições.
"""
import hashlib
import json
import logging
import os
import threading
import time
from dataclasses import dataclass
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from . import config

log = logging.getLogger("radar.http")

SINAIS_BLOQUEIO = ("captcha", "cf-challenge", "are you a robot", "access denied",
                   "verifique se você é humano")


@dataclass
class Resposta:
    url: str
    status: int
    texto: str
    obtido_em: float
    do_cache: bool = False

    @property
    def ok(self):
        return 200 <= self.status < 300

    def json(self):
        return json.loads(self.texto)


class ClienteEducado:
    def __init__(self, usar_cache=True, ttl_horas=config.CACHE_TTL_HORAS):
        self.sessao = requests.Session()
        contato = os.environ.get("RADAR_CONTATO", "")
        ua = config.USER_AGENT.replace("defina RADAR_CONTATO no ambiente", contato) if contato else config.USER_AGENT
        self.sessao.headers.update({"User-Agent": ua, "Accept-Language": "pt-BR,pt;q=0.9"})
        self.usar_cache = usar_cache
        self.ttl = ttl_horas * 3600
        self._robots = {}
        self._ultimo = {}
        self._bloqueados = set()
        self._lock = threading.Lock()
        self._sem = threading.Semaphore(config.MAX_CONCORRENCIA)
        config.DIR_CACHE.mkdir(exist_ok=True)

    # ---- robots.txt
    def permitido(self, url):
        p = urlparse(url)
        base = f"{p.scheme}://{p.netloc}"
        if base not in self._robots:
            rp = RobotFileParser()
            try:
                r = self.sessao.get(base + "/robots.txt", timeout=config.TIMEOUT_S)
                if r.status_code == 200:
                    rp.parse(r.text.splitlines())
                else:  # sem robots.txt => permitido
                    rp.parse([])
            except requests.RequestException as e:
                log.warning("robots.txt inacessível em %s (%s); host ignorado", base, e)
                rp = None
            self._robots[base] = rp
        rp = self._robots[base]
        return bool(rp) and rp.can_fetch(self.sessao.headers["User-Agent"], url)

    # ---- cache
    def _arq_cache(self, url):
        return config.DIR_CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".json")

    def _ler_cache(self, url):
        arq = self._arq_cache(url)
        if self.usar_cache and arq.exists():
            d = json.loads(arq.read_text("utf-8"))
            if time.time() - d["obtido_em"] < self.ttl:
                return Resposta(d["url"], d["status"], d["texto"], d["obtido_em"], True)
        return None

    def _gravar_cache(self, r: Resposta):
        self._arq_cache(r.url).write_text(json.dumps(r.__dict__, ensure_ascii=False), "utf-8")

    # ---- limite por host
    def _esperar(self, host, intervalo):
        with self._lock:
            agora = time.time()
            prox = self._ultimo.get(host, 0) + intervalo
            espera = max(0.0, prox - agora)
            self._ultimo[host] = agora + espera
        if espera:
            time.sleep(espera)

    def get(self, url, intervalo=config.INTERVALO_MIN_POR_HOST_S):
        host = urlparse(url).netloc
        if host in self._bloqueados:
            log.info("host bloqueado nesta execução, pulando: %s", url)
            return None
        c = self._ler_cache(url)
        if c:
            return c
        if not self.permitido(url):
            log.warning("robots.txt não permite (ou indisponível): %s", url)
            return None
        for tentativa in range(1, config.TENTATIVAS + 1):
            self._esperar(host, intervalo)
            try:
                with self._sem:
                    r = self.sessao.get(url, timeout=config.TIMEOUT_S)
            except requests.RequestException as e:
                log.warning("erro de rede (%s/%s) %s: %s", tentativa, config.TENTATIVAS, url, e)
                time.sleep(2 ** tentativa)
                continue
            if r.status_code in (401, 403) or any(s in r.text[:5000].lower() for s in SINAIS_BLOQUEIO):
                log.error("acesso restrito/anti-bot em %s (HTTP %s). Não será contornado.", url, r.status_code)
                self._bloqueados.add(host)
                return None
            if r.status_code == 429 or r.status_code >= 500:
                pausa = int(r.headers.get("Retry-After", 2 ** (tentativa + 2)) or 8)
                log.warning("HTTP %s em %s; aguardando %ss", r.status_code, url, pausa)
                time.sleep(min(pausa, 120))
                continue
            resp = Resposta(r.url, r.status_code, r.text, time.time())
            if resp.ok:
                self._gravar_cache(resp)
            return resp
        return None
