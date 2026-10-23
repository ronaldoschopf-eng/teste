"""Rótulos, classes e leitura/gravação da base de eventos (data/eventos.json)."""
import json
from datetime import date, datetime
from zoneinfo import ZoneInfo

from . import config

# Classificação das fotos na Fotto
CLASSES_FOTTO = {
    "A": "A. FOTOS PUBLICADAS",
    "B": "B. FOTOS AINDA NÃO DISPONÍVEIS — evidência explícita",
    "C": "C. NENHUM ÁLBUM ENCONTRADO — pesquisa realizada, sem confirmação absoluta",
    "D": "D. VERIFICAÇÃO PENDENTE",
}

# Situação das inscrições
INSCRICOES = {
    "abertas": "Inscrições abertas",
    "encerradas_futuro": "Inscrições encerradas, evento futuro",
    "numero_divulgado": "Número de inscritos divulgado",
    "confirmado_sem_evidencia": "Evento confirmado, sem evidência pública de inscritos",
    "passado_confirmado": "Evento passado com participação confirmada",
    "desconhecida": "Situação não confirmada",
}

CONFIANCA = ("alta", "média", "baixa")

COLUNAS = [
    "Nome do evento", "Modalidade", "Data e horário", "Cidade", "Local",
    "Distância de Santa Maria", "Organizador", "Situação das inscrições",
    "Evidência de participantes", "Situação das fotos na Fotto",
    "Fotógrafos ou perfis encontrados", "Link do evento", "Link da inscrição",
    "Link da fonte de confirmação", "Contato público do organizador",
    "Data e hora da última verificação", "Nível de confiança", "Observações comerciais",
]
COLUNAS_EXTRAS = [
    "ID", "Distância linha reta (km)", "Distância rodoviária (km)",
    "Fonte da distância rodoviária", "Classe Fotto",
    "Evidência Fotto (URL)", "Data da evidência Fotto", "Método da verificação Fotto",
]

ARQ_EVENTOS = config.DIR_DADOS / "eventos.json"


def agora_local() -> datetime:
    return datetime.now(ZoneInfo(config.FUSO))


def hoje() -> date:
    return agora_local().date()


def carregar():
    return json.loads(ARQ_EVENTOS.read_text("utf-8"))


def salvar(eventos):
    ARQ_EVENTOS.write_text(json.dumps(eventos, ensure_ascii=False, indent=2) + "\n", "utf-8")


def data_evento(ev):
    try:
        return date.fromisoformat(ev["data"])
    except (KeyError, TypeError, ValueError):
        return None


def chave_dedup(ev):
    """Mesmo evento = mesmo nome normalizado + mesma data + mesma cidade."""
    from .fotto import normalizar
    return (normalizar(ev.get("nome", "")), ev.get("data"), normalizar(ev.get("cidade", "")))


def deduplicar(eventos):
    vistos, saida = {}, []
    for ev in eventos:
        k = chave_dedup(ev)
        if k in vistos:
            base = vistos[k]
            for campo, valor in ev.items():
                if not base.get(campo) and valor:
                    base[campo] = valor
            continue
        vistos[k] = ev
        saida.append(ev)
    return saida


def validar(ev):
    """Regras que impedem resultados inventados. Devolve lista de problemas."""
    p = []
    if not ev.get("link_confirmacao"):
        p.append("sem link de fonte de confirmação")
    if ev.get("inscricoes") not in INSCRICOES:
        p.append(f"situação de inscrição inválida: {ev.get('inscricoes')}")
    if ev.get("inscricoes") == "numero_divulgado" and not ev.get("inscritos_fonte"):
        p.append("número de inscritos sem URL de fonte")
    f = ev.get("fotto", {})
    if f.get("classe") not in CLASSES_FOTTO:
        p.append("classe Fotto inválida")
    if f.get("classe") in ("A", "B") and not f.get("evidencia_url"):
        p.append(f"classe {f.get('classe')} sem URL de evidência")
    if f.get("classe") in ("A", "B", "C") and not f.get("evidencia_data"):
        p.append("classificação sem data da evidência")
    if ev.get("confianca") not in CONFIANCA:
        p.append("nível de confiança inválido")
    return p
