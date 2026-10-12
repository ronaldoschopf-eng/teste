"""Trilha e efeitos sonoros do story "Fotos do vôlei" (fotos-volei/index.html).

Gera fotos-volei/sfx.wav (48 kHz, estéreo) só com síntese (tools/sfx_synth.py):
uma trilha chill-pop a 79 BPM que cresce até o álbum chegar — a batida entra
junto com as fotos — e os efeitos da conversa por cima, com reverb.

A animação foi travada no compasso (1 tempo = 760 ms):
mensagens em 1,50 · 3,02 · 4,54 s, álbum em 5,30 s (entra a batida) e as
fotos aparecem em colcheias: 6,82 · 7,20 · 7,58 · 7,96 s.

    python3 tools/sfx-fotos-volei.py           # → fotos-volei/sfx.wav
"""
import argparse
from pathlib import Path

import numpy as np

from sfx_synth import (SR, bass, clap, delay, ding, hat, kick, pad, pluck, pop, receive,
                       reverb, riser, sent, shutter, stereo, thud, tick, whoosh, write)

Q = 0.76                                  # um tempo (s) — 79 BPM
def beat(k): return -0.02 + k * Q         # beat(7) = 5,30 s, chegada do álbum
DROP, BAR2, OUTRO = beat(7), beat(11), beat(15)

TILE_AT, TILE_STEP, TILE_LOAD = 5650, 380, 1170   # mesmos valores do index.html
REVEALS = [TILE_AT + i * TILE_STEP + TILE_LOAD for i in range(4)]   # 6820…7960 ms

# acordes: (início s, fim s, notas do pad, baixo, brilho inicial → final)
CHORDS = [
    (0.00, beat(3), [57, 60, 64, 67], None, 0.9, 1.5),       # Am7 — introdução escura
    (beat(3), DROP, [53, 57, 60, 64, 69], 41, 1.5, 3.4),     # Fmaj7 — o filtro abre
    (DROP, beat(9), [60, 64, 67, 74], 36, 4.0, 4.0),         # Cadd9 — fotos chegando
    (beat(9), BAR2, [55, 59, 62, 67, 69], 35, 4.0, 4.0),     # G/B — fotos aparecendo
    (BAR2, beat(13), [57, 60, 64, 67, 71], 33, 3.6, 3.6),    # Am9
    (beat(13), OUTRO, [53, 57, 60, 64, 67], 41, 3.4, 3.0),   # Fmaj9
    (OUTRO, 14.5, [64, 67, 71, 74], 36, 3.0, 1.4),           # Cmaj9 — resolve e some
]


def place(track, sec, snd, pan=0.0):
    i = int(sec * SR)
    s = snd if snd.ndim == 2 else stereo(snd, pan)
    j = min(len(track), i + len(s))
    if j > i:
        track[i:j] += s[: j - i]


def music(length):
    n = int(length * SR)
    pads, low, drums, keys = (np.zeros((n, 2)) for _ in range(4))

    for a, b, notes, root, br0, br1 in CHORDS:
        att = 1.2 if a == 0 else (0.06 if a == DROP else 0.25)
        place(pads, a, pad(notes, b - a, br0, br1, attack=att, release=0.9 if b < OUTRO else 1.6, gain=0.085))
        if root is None:
            continue
        if a < DROP:                                      # antes da batida: notas longas
            place(low, a, bass(root, b - a - 0.12, 0.16))
        else:                                             # depois: groove sincopado
            t = a
            while t < min(b, OUTRO) - 1e-3:
                place(low, t, bass(root, 0.55, 0.24))
                place(low, t + 1.5 * Q, bass(root + 12, 0.22, 0.14))
                t += 2 * Q
    place(low, OUTRO, bass(36, 1.4, 0.2))

    # batida: entra no álbum e para na resolução
    for k in range(7, 15):
        t = beat(k)
        bar_pos = (k - 7) % 4
        if bar_pos in (0, 2):
            place(drums, t, kick(0.62 if k == 7 else 0.5))
        if bar_pos == 1:
            place(drums, t + 0.5 * Q, kick(0.3))
        if bar_pos in (1, 3):
            place(drums, t, clap(0.2), 0.05)
        for e in range(2):                                # colcheias no chimbal
            place(drums, t + e * Q / 2, hat(0.05 if e else 0.03), 0.3)
        if k == 14:                                       # virada no fim
            for s in range(4):
                place(drums, t + s * Q / 4, hat(0.04 + 0.01 * s, 0.015), -0.3)

    # preparação: chimbal suave e riser até a batida entrar
    for k in range(4, 7):
        for e in range(2):
            place(drums, beat(k) + e * Q / 2, hat(0.022, 0.02), 0.3)
    for s in range(8):
        place(drums, beat(6) + s * Q / 8, hat(0.012 + 0.006 * s, 0.012), -0.2)
    place(drums, beat(6), riser(Q, 0.26))
    place(drums, DROP, thud(0.45))

    # arpejo em semicolcheias com eco, sobre o acorde da vez
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    t, step = DROP, 0
    while t < OUTRO - 1e-3:
        notes = next(c[2] for c in CHORDS if c[0] <= t < c[1])
        note = notes[pattern[step % 8] % len(notes)] + 12
        place(keys, t, pluck(note, 0.035, 0.16), -0.35 if step % 2 else 0.35)
        t += Q / 4
        step += 1
    # brilho de cada foto que aparece: arpejo subindo sobre G/B
    for ms, note in zip(REVEALS, (79, 83, 86, 91)):
        place(keys, ms / 1000, pluck(note, 0.11, 0.35), (note - 85) / 12)
    # final: acorde brilhante e uma estrela no alto
    for d, note in enumerate((76, 79, 83, 86)):
        place(keys, OUTRO + d * 0.09, pluck(note, 0.06, 0.6), -0.3 + 0.2 * d)
    keys = delay(keys, Q / 2 * 1000, 0.38)[:n]

    # sidechain: o pad "respira" com o bumbo
    duck = np.ones(n)
    for k in range(7, 15):
        if (k - 7) % 2 == 0:
            i = int(beat(k) * SR)
            m = min(n - i, int(0.32 * SR))
            duck[i:i + m] = np.minimum(duck[i:i + m], 0.55 + 0.45 * np.linspace(0, 1, m) ** 0.6)
    pads *= duck[:, None]

    bed = reverb(pads + keys, seconds=2.6, decay=0.7, mix=0.3) + low + reverb(drums, 1.2, 0.3, 0.12)

    # abre espaço para as mensagens chegarem
    space = np.ones(n)
    for sec in (1.5, 3.02, 4.54):
        i = int(sec * SR)
        m = min(n - i, int(0.45 * SR))
        space[i:i + m] = np.minimum(space[i:i + m], 0.6 + 0.4 * np.linspace(0, 1, m))
    return bed * space[:, None] * 0.9


# (ms, som, pan -1..1) — efeitos da conversa, espelhando render(t)
CUES = [
    (0, whoosh(0.5, 300, 1800, 0.12), 0.0),                        # cabeçalho entra
    *[(790 + i * 140, tick(3200, 0.08), -0.2) for i in range(6)],  # digitando…
    (1500, receive(0.42), -0.15),                                  # "Suas fotos… te esperando"
    (3020, sent(0.32), 0.2),                                       # "Onde?"
    (3400, tick(4200, 0.07), 0.2),                                 # lida
    *[(3830 + i * 140, tick(3200, 0.08), -0.2) for i in range(5)], # digitando…
    (4540, receive(0.42), -0.15),                                  # "Clica no link aqui abaixo"
    (5300, receive(0.3), -0.1),                                    # álbum chega (junto com a batida)
    *[(TILE_AT + i * TILE_STEP, tick(2400 + i * 200, 0.06), -0.3 + 0.2 * i) for i in range(4)],  # baixando
    *[(ms, shutter(0.5 + 0.05 * i), -0.3 + 0.2 * i) for i, ms in enumerate(REVEALS)],  # foto aparece
    (REVEALS[-1] + 190, pop(620), 0.3),                            # "+24"
    (int(BAR2 * 1000), ding(0.2), 0.0),                            # álbum completo
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--length', type=float, default=13.0, help='duração em segundos (vídeo + tela final)')
    ap.add_argument('--out', default=str(Path(__file__).resolve().parent.parent / 'fotos-volei' / 'sfx.wav'))
    a = ap.parse_args()
    write(CUES, a.length, a.out, fade_out=1.2, bed=music(a.length), wet=0.14)


if __name__ == '__main__':
    main()
