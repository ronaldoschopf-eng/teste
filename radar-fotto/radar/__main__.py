"""Linha de comando: python -m radar <comando>."""
import argparse
import json
import logging
import sys

from . import config, exportar, fotto, geo, modelo
from .http import ClienteEducado


def _logs(verboso):
    config.DIR_LOGS.mkdir(exist_ok=True)
    logging.basicConfig(
        level=logging.DEBUG if verboso else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[logging.FileHandler(config.DIR_LOGS / "radar.log", encoding="utf-8"),
                  logging.StreamHandler(sys.stderr)])


def cmd_inspecionar(a):
    r = fotto.inspecionar(ClienteEducado(usar_cache=not a.sem_cache))
    print(json.dumps({u: {k: v for k, v in d.items() if k != "exemplos_album"} for u, d in r.items()},
                     ensure_ascii=False, indent=2))
    print(f"\nHTML e resumo completo em {config.DIR_INSPECAO}/")


def cmd_verificar(a):
    http = ClienteEducado(usar_cache=not a.sem_cache)
    eventos = modelo.carregar()
    indice, ok, falhos = fotto.coletar_indice(http)
    if not ok:
        logging.error("Nenhuma página da Fotto acessível; classificações mantidas.")
        return 1
    alvo = set(a.ids or [])
    for ev in eventos:
        if alvo and ev["id"] not in alvo:
            continue
        dist, _ = geo.distancia_centro(ev.get("cidade", ""), ev.get("lat"), ev.get("lon"))
        if dist is not None and dist > config.RAIO_KM:
            continue
        novo = fotto.verificar_evento(http, ev, indice, ok, falhos)
        anterior = ev.get("fotto", {})
        # Não rebaixa evidência manual mais forte (A/B) para D por falha de acesso.
        if novo["classe"] == "D" and anterior.get("classe") in ("A", "B"):
            anterior["notas"] = (anterior.get("notas", "") + f"; reverificação inconclusiva em {novo['verificado_em']}").strip("; ")
        else:
            ev["fotto"] = novo
        ev["ultima_verificacao"] = novo["verificado_em"]
        logging.info("%s -> %s", ev["id"], ev["fotto"]["classe"])
    modelo.salvar(eventos)
    return 0


def cmd_validar(a):
    erros = 0
    for ev in modelo.carregar():
        for p in modelo.validar(ev):
            print(f"{ev.get('id')}: {p}")
            erros += 1
    print(f"{erros} problema(s).")
    return 1 if erros and a.estrito else 0


def cmd_exportar(a):
    print(json.dumps(exportar.exportar(modelo.carregar()), ensure_ascii=False, indent=2))


def cmd_geocodificar(a):
    cidades = sorted({ev["cidade"] for ev in modelo.carregar() if ev.get("cidade")})
    print(json.dumps(geo.geocodificar(cidades, ClienteEducado()), ensure_ascii=False, indent=2))


def cmd_tudo(a):
    rc = cmd_verificar(a)
    cmd_exportar(a)
    return rc


def main(argv=None):
    p = argparse.ArgumentParser(prog="radar", description="Radar de Oportunidades Fotográficas — Santa Maria/RS")
    p.add_argument("-v", "--verboso", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("inspecionar", help="salva e resume a estrutura pública das páginas da Fotto")
    s.add_argument("--sem-cache", action="store_true")
    s.set_defaults(f=cmd_inspecionar)
    s = sub.add_parser("verificar", help="verifica álbuns na Fotto e atualiza data/eventos.json")
    s.add_argument("--ids", nargs="*")
    s.add_argument("--sem-cache", action="store_true")
    s.set_defaults(f=cmd_verificar)
    s = sub.add_parser("validar", help="checa evidências obrigatórias de cada evento")
    s.add_argument("--estrito", action="store_true")
    s.set_defaults(f=cmd_validar)
    sub.add_parser("exportar", help="gera CSV e Excel em saida/").set_defaults(f=cmd_exportar)
    sub.add_parser("geocodificar", help="refina coordenadas das cidades via OpenStreetMap").set_defaults(f=cmd_geocodificar)
    s = sub.add_parser("tudo", help="verificar + exportar (para agendamento)")
    s.add_argument("--ids", nargs="*")
    s.add_argument("--sem-cache", action="store_true")
    s.set_defaults(f=cmd_tudo)
    a = p.parse_args(argv)
    _logs(a.verboso)
    return a.f(a) or 0


if __name__ == "__main__":
    sys.exit(main())
