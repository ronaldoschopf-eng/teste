"""Efeitos sonoros do story DEU BEACH (deu-beach/index.html).

Gera deu-beach/sfx.wav (48 kHz, estéreo) com sons sintetizados — nada de
bancos de som externos. Os tempos (ms) seguem a linha do tempo de render(t);
se mudar a animação, ajuste a lista CUES.

    python3 tools/sfx-deu-beach.py            # → deu-beach/sfx.wav
    python3 tools/sfx-deu-beach.py --length 18
"""
import argparse
from pathlib import Path

from sfx_synth import ball, ding, grow, pop, shutter, thud, tick, whoosh, write

# (ms, som, pan -1..1) — espelha a linha do tempo de render(t)
CUES = [
    (200, pop(420), -0.3),                                   # avatar
    *[(600 + i * 140, tick(3200, 0.10), -0.2) for i in range(6)],  # digitando…
    (1400, pop(560), -0.15),                                 # balão da pergunta
    (2700, whoosh(0.55, 250, 2600, 0.30), 0.0),              # balão → cartão
    *[(3250 + i * 170, tick(2400 + i * 180, 0.16), 0.0) for i in range(5)],  # linhas
    (4750, whoosh(0.5, 200, 1400, 0.16), 0.35),              # dedo entra
    (5450, shutter(0.9), 0.1),                              # toque = clique da câmera
    (6150, whoosh(0.7, 300, 3600, 0.34), 0.0),               # cartão gira → agenda
    *[(6600 + i * 140, tick(2000, 0.10), 0.0) for i in range(2)],
    (7450, grow(0.6), -0.25),                                # bloco de sábado
    (8050, grow(0.75), 0.25),                                # bloco de domingo
    (9050, ding(), 0.0),                                     # lembrete ativado
    (10150, whoosh(0.45, 300, 2000, 0.18), 0.0),             # agenda sai
    (10700, pop(470), 0.3),                                  # avatar da resposta
    (10900, pop(640), 0.2),                                  # "Quero as fotos!"
    (12100, whoosh(0.75, 160, 2200, 0.42), 0.0),             # tela fica rosa
    *[(12550 + i * 110, ball(0.30 + 0.04 * i), -0.4 + 0.2 * i) for i in range(5)],  # ícones
    (12850, thud(0.62), 0.0),                                # DEU
    (13000, thud(0.72), 0.0),                                # BEACH
    (13350, tick(2200, 0.14), 0.0),                          # chamada
    (13600, tick(2600, 0.16), -0.1),                         # sábado
    (13800, tick(3000, 0.16), 0.1),                          # domingo
    (14150, shutter(0.75), 0.0),                              # crédito do fotógrafo
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--length', type=float, default=18.0, help='duração em segundos (vídeo + tela final)')
    ap.add_argument('--out', default=str(Path(__file__).resolve().parent.parent / 'deu-beach' / 'sfx.wav'))
    a = ap.parse_args()
    write(CUES, a.length, a.out)


if __name__ == '__main__':
    main()
