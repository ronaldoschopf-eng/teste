"""Gera CSV e Excel (abas EVENTOS, OPORTUNIDADES, REVISAR, FORA_DO_RAIO, FONTES, LEGENDA)."""
import csv
import json
from datetime import timedelta

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from . import config, geo
from .modelo import (CLASSES_FOTTO, COLUNAS, COLUNAS_EXTRAS, INSCRICOES, data_evento,
                     deduplicar, hoje, validar)

DIAS_APROVEITAVEL = 30  # evento passado há até N dias ainda pode render venda/oferta

TIPO_AUSENCIA = {
    "B": "AUSÊNCIA CONFIRMADA — a Fotto indica explicitamente que as fotos ainda não estão disponíveis",
    "C": "AUSÊNCIA DE RESULTADOS — nada encontrado nas fontes consultadas; não prova que não há fotógrafo",
}


def _linha(ev):
    f = ev.get("fotto", {})
    dist, origem = geo.distancia_centro(ev.get("cidade", ""), ev.get("lat"), ev.get("lon"))
    rod = ev.get("distancia_rodoviaria_km")
    dist_txt = (f"{dist:.1f} km em linha reta ({origem})" if dist is not None else "sem coordenada")
    dist_txt += f"; rodoviária: {rod} km ({ev.get('fonte_distancia_rodoviaria')})" if rod else "; rodoviária: não verificada"
    perfis = ", ".join(f.get("perfis", [])) or "nenhum encontrado"
    albuns = "; ".join(f"{a.get('titulo')} ({a.get('fotos') or '?'} fotos) {a.get('url')}" for a in f.get("albuns", []))
    insc = INSCRICOES.get(ev.get("inscricoes"), "")
    if ev.get("inscricoes_detalhe"):
        insc += " — " + ev["inscricoes_detalhe"]
    situ_fotos = CLASSES_FOTTO.get(f.get("classe"), "")
    if f.get("notas"):
        situ_fotos += " | " + f["notas"]
    base = {
        "Nome do evento": ev.get("nome"),
        "Modalidade": ev.get("modalidade"),
        "Data e horário": f"{ev.get('data', '')} {ev.get('horario') or ''}".strip(),
        "Cidade": ev.get("cidade"),
        "Local": ev.get("local"),
        "Distância de Santa Maria": dist_txt,
        "Organizador": ev.get("organizador"),
        "Situação das inscrições": insc,
        "Evidência de participantes": ev.get("evidencia_participantes"),
        "Situação das fotos na Fotto": situ_fotos,
        "Fotógrafos ou perfis encontrados": perfis + (f" | álbuns: {albuns}" if albuns else ""),
        "Link do evento": ev.get("link_evento"),
        "Link da inscrição": ev.get("link_inscricao"),
        "Link da fonte de confirmação": ev.get("link_confirmacao"),
        "Contato público do organizador": ev.get("contato_organizador") or "não coletado",
        "Data e hora da última verificação": ev.get("ultima_verificacao"),
        "Nível de confiança": ev.get("confianca"),
        "Observações comerciais": ev.get("obs_comerciais"),
        "ID": ev.get("id"),
        "Distância linha reta (km)": dist,
        "Distância rodoviária (km)": rod,
        "Fonte da distância rodoviária": ev.get("fonte_distancia_rodoviaria"),
        "Classe Fotto": f.get("classe"),
        "Evidência Fotto (URL)": f.get("evidencia_url"),
        "Data da evidência Fotto": f.get("evidencia_data"),
        "Método da verificação Fotto": f.get("metodo"),
    }
    return base, dist


def separar(eventos):
    eventos = deduplicar(eventos)
    hj = hoje()
    todos, oport, revisar, fora = [], [], [], []
    for ev in eventos:
        linha, dist = _linha(ev)
        if dist is not None and dist > config.RAIO_KM:
            fora.append(linha)
            continue
        problemas = validar(ev)
        todos.append(linha)
        d = data_evento(ev)
        aproveitavel = d is not None and d >= hj - timedelta(days=DIAS_APROVEITAVEL)
        classe = ev.get("fotto", {}).get("classe")
        if classe in ("B", "C") and aproveitavel and not problemas:
            oport.append({"Tipo de ausência": TIPO_AUSENCIA[classe], **linha})
        if classe == "D" or ev.get("confianca") == "baixa" or problemas or dist is None:
            motivo = []
            if classe == "D":
                motivo.append("Fotto não verificada")
            if ev.get("confianca") == "baixa":
                motivo.append("confiança baixa")
            if dist is None:
                motivo.append("sem coordenada")
            motivo += problemas
            if ev.get("conflitos"):
                motivo.append("conflito: " + ev["conflitos"])
            revisar.append({"Motivo da revisão": "; ".join(motivo), **linha})
    return todos, oport, revisar, fora


def _aba(wb, nome, linhas, colunas, primeira=False):
    ws = wb.active if primeira else wb.create_sheet()
    ws.title = nome
    ws.append(colunas)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="333333")
        c.alignment = Alignment(wrap_text=True, vertical="top")
    for l in linhas:
        ws.append([l.get(c) for c in colunas])
    for i, c in enumerate(colunas, 1):
        ws.column_dimensions[get_column_letter(i)].width = min(60, max(14, len(c) + 4))
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "B2"
    if linhas:
        ws.auto_filter.ref = ws.dimensions
    return ws


def exportar(eventos, prefixo="radar_fotto"):
    config.DIR_SAIDA.mkdir(exist_ok=True)
    todos, oport, revisar, fora = separar(eventos)
    cols = COLUNAS + COLUNAS_EXTRAS
    with open(config.DIR_SAIDA / f"{prefixo}.csv", "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, delimiter=";")
        w.writeheader()
        w.writerows(todos)
    wb = Workbook()
    _aba(wb, "EVENTOS", todos, cols, primeira=True)
    _aba(wb, "OPORTUNIDADES", oport, ["Tipo de ausência", *cols])
    _aba(wb, "REVISAR", revisar, ["Motivo da revisão", *cols])
    _aba(wb, "FORA_DO_RAIO", fora, cols)
    arq_fontes = config.DIR_DADOS / "fontes.json"
    if arq_fontes.exists():
        fontes = json.loads(arq_fontes.read_text("utf-8"))
        cf = ["Fonte", "URL", "Tipo", "Acesso nesta coleta", "Dados obtidos", "Observações"]
        _aba(wb, "FONTES", [{c: f.get(c) for c in cf} for f in fontes], cf)
    leg = [{"Item": v, "Significado": k} for k, v in CLASSES_FOTTO.items()]
    leg += [{"Item": "OPORTUNIDADES", "Significado":
             f"Classe B ou C, evento futuro ou ocorrido há até {DIAS_APROVEITAVEL} dias, sem pendências de validação."},
            {"Item": "REVISAR", "Significado": "Classe D, confiança baixa, dados conflitantes ou faltando evidência."},
            {"Item": "Distância", "Significado":
             f"Linha reta (haversine) até {config.CENTRO_NOME}. Rodoviária só quando há fonte confiável."},
            {"Item": "Gerado em", "Significado": str(hoje())}]
    _aba(wb, "LEGENDA", leg, ["Item", "Significado"])
    arq = config.DIR_SAIDA / f"{prefixo}.xlsx"
    wb.save(arq)
    return {"eventos": len(todos), "oportunidades": len(oport), "revisar": len(revisar),
            "fora_do_raio": len(fora), "xlsx": str(arq), "csv": str(config.DIR_SAIDA / f"{prefixo}.csv")}
