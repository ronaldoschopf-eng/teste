"""Efeitos sonoros do story "Fotos do vôlei" (fotos-volei/index.html).

Gera fotos-volei/sfx.wav (48 kHz, estéreo) com os sintetizadores de
tools/sfx_synth.py. Os tempos (ms) seguem a linha do tempo de render(t);
se mudar a animação, ajuste a lista CUES.

    python3 tools/sfx-fotos-volei.py           # → fotos-volei/sfx.wav
"""
import argparse
from pathlib import Path

from sfx_synth import ding, pop, receive, sent, shutter, tick, whoosh, write

TILE_AT, TILE_STEP, TILE_LOAD = 5650, 380, 1250   # mesmos valores do index.html

# (ms, som, pan -1..1) — espelha a linha do tempo de render(t)
CUES = [
    (0, whoosh(0.5, 300, 1800, 0.12), 0.0),                        # cabeçalho entra
    *[(750 + i * 140, tick(3200, 0.08), -0.2) for i in range(6)],  # digitando…
    (1500, receive(0.42), -0.15),                                  # "Suas fotos… te esperando"
    (2900, sent(0.32), 0.2),                                       # "Onde?"
    (3300, tick(4200, 0.07), 0.2),                                 # lida
    *[(3550 + i * 140, tick(3200, 0.08), -0.2) for i in range(5)], # digitando…
    (4300, receive(0.42), -0.15),                                  # "Clica no link aqui abaixo"
    (5300, receive(0.34), -0.1),                                   # álbum chega
    *[(TILE_AT + i * TILE_STEP, tick(2400 + i * 200, 0.07), -0.3 + 0.2 * i) for i in range(4)],  # baixando
    *[(TILE_AT + i * TILE_STEP + TILE_LOAD, shutter(0.55 + 0.05 * i), -0.3 + 0.2 * i) for i in range(4)],  # foto aparece
    (TILE_AT + 3 * TILE_STEP + TILE_LOAD + 250, pop(620), 0.3),    # "+24"
    (8500, ding(0.22), 0.0),                                       # álbum completo
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--length', type=float, default=13.0, help='duração em segundos (vídeo + tela final)')
    ap.add_argument('--out', default=str(Path(__file__).resolve().parent.parent / 'fotos-volei' / 'sfx.wav'))
    a = ap.parse_args()
    write(CUES, a.length, a.out)


if __name__ == '__main__':
    main()
