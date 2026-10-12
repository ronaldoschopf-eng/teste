"""Trilha e efeitos sonoros do flyer "Registro Premiado" (registro/index.html).

Gera registro/sfx.wav (48 kHz, estéreo) só com síntese (tools/sfx_synth.py).
Mesma pegada do "Fotos do vôlei": chill-pop a 79 BPM, agora em ré maior, mais
festivo. A batida entra quando a imagem do prêmio aparece (5,30 s), some na
saída da conversa e volta com tudo quando FOTO GRÁTIS pousa (11,38 s).

    python3 tools/sfx-registro.py              # → registro/sfx.wav
"""
import argparse
from pathlib import Path

import numpy as np

from sfx_synth import (SR, bass, clap, crash, delay, ding, hat, kick, pad, place, pluck, pop,
                       receive, reverb, riser, sent, shutter, thud, tick, whoosh, write)

Q = 0.76                                  # um tempo (s) — 79 BPM
def beat(k): return -0.02 + k * Q
DROP, OUT, LAND, END = beat(7), beat(14), beat(15), beat(17)   # 5,30 · 10,62 · 11,38 · 12,90 s

# acordes: (início, fim, notas do pad, baixo, brilho inicial → final)
CHORDS = [
    (0.00, beat(3), [59, 62, 66, 69], None, 0.9, 1.5),        # Bm7 — introdução
    (beat(3), DROP, [55, 59, 62, 66, 71], 43, 1.5, 3.4),      # Gmaj7 — o filtro abre
    (DROP, beat(9), [62, 66, 69, 76], 38, 4.0, 4.0),          # Dadd9 — o prêmio aparece
    (beat(9), beat(11), [57, 61, 64, 69, 71], 37, 4.0, 4.0),  # A/C#
    (beat(11), beat(13), [59, 62, 66, 69, 73], 35, 3.6, 3.6), # Bm9
    (beat(13), LAND, [55, 59, 62, 66, 69], 43, 3.4, 4.2),     # Gmaj9 — tensão até o flyer
    (LAND, 15.5, [62, 66, 69, 73, 76], 38, 4.4, 1.6),         # Dmaj9 — FOTO GRÁTIS
]
GROOVE = [k for k in range(7, 17) if k not in (14,)]          # sem bateria na saída do chat


def music(length):
    n = int(length * SR)
    pads, low, drums, keys = (np.zeros((n, 2)) for _ in range(4))

    for a, b, notes, root, br0, br1 in CHORDS:
        att = 1.2 if a == 0 else (0.05 if a in (DROP, LAND) else 0.25)
        place(pads, a, pad(notes, b - a, br0, br1, attack=att, release=0.9 if b < 15 else 1.4, gain=0.085))
        if root is None:
            continue
        if a < DROP:
            place(low, a, bass(root, b - a - 0.12, 0.16))
            continue
        t = a
        while t < min(b, END) - 1e-3:
            if not (OUT <= t < LAND):
                place(low, t, bass(root, 0.55, 0.24))
                place(low, t + 1.5 * Q, bass(root + 12, 0.22, 0.14))
            t += 2 * Q
    place(low, OUT, bass(43, Q - 0.1, 0.18))                  # nota longa na pausa
    place(low, END, bass(38, 1.4, 0.22))

    for k in GROOVE:
        t = beat(k)
        pos = (k - 7) % 4
        if pos in (0, 2):
            place(drums, t, kick(0.62 if k in (7, 15) else 0.5))
        if pos == 1:
            place(drums, t + 0.5 * Q, kick(0.3))
        if pos in (1, 3):
            place(drums, t, clap(0.2), 0.05)
        for e in range(2):
            place(drums, t + e * Q / 2, hat(0.05 if e else 0.03), 0.3)
        if k == 13:                                           # virada antes da pausa
            for s in range(8):
                place(drums, t + s * Q / 8, hat(0.02 + 0.006 * s, 0.012), -0.25)

    for k in range(4, 7):                                     # preparação
        for e in range(2):
            place(drums, beat(k) + e * Q / 2, hat(0.022, 0.02), 0.3)
    for s in range(8):
        place(drums, beat(6) + s * Q / 8, hat(0.012 + 0.006 * s, 0.012), -0.2)
    place(drums, beat(6), riser(Q, 0.26))
    place(drums, OUT, riser(Q, 0.3))                          # a conversa sai: subida
    for at, g in ((DROP, 0.45), (LAND, 0.55)):
        place(drums, at, thud(g))
        place(drums, at, crash(0.07), 0.2)
    place(drums, END, kick(0.55))
    place(drums, END, crash(0.09, 1.2), -0.1)

    # arpejo em semicolcheias com eco
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    step = 0
    t = DROP
    while t < END - 1e-3:
        if not (OUT <= t < LAND):
            notes = next(c[2] for c in CHORDS if c[0] <= t < c[1])
            place(keys, t, pluck(notes[pattern[step % 8] % len(notes)] + 12, 0.035, 0.16), -0.35 if step % 2 else 0.35)
        t += Q / 4
        step += 1
    # "prêmio": arpejo rápido subindo nos dois impactos
    for at in (DROP, LAND):
        for d, note in enumerate((74, 78, 81, 86, 90)):
            place(keys, at + d * Q / 8, pluck(note, 0.075, 0.3), -0.4 + 0.2 * d)
    for d, note in enumerate((78, 81, 85, 90)):               # acorde final
        place(keys, END + d * 0.08, pluck(note, 0.06, 0.6), -0.3 + 0.2 * d)
    keys = delay(keys, Q / 2 * 1000, 0.38)[:n]

    duck = np.ones(n)
    for k in GROOVE:
        if (k - 7) % 2 == 0:
            i = int(beat(k) * SR)
            m = min(n - i, int(0.32 * SR))
            duck[i:i + m] = np.minimum(duck[i:i + m], 0.55 + 0.45 * np.linspace(0, 1, m) ** 0.6)
    pads *= duck[:, None]

    bed = reverb(pads + keys, seconds=2.6, decay=0.7, mix=0.3) + low + reverb(drums, 1.2, 0.3, 0.12)
    space = np.ones(n)
    for sec in (1.5, 3.02, 4.54, 6.06, 7.58, 9.10):           # abre espaço para as mensagens
        i = int(sec * SR)
        m = min(n - i, int(0.45 * SR))
        space[i:i + m] = np.minimum(space[i:i + m], 0.6 + 0.4 * np.linspace(0, 1, m))
    return bed * space[:, None] * 0.9


def ms(sec):
    return int(round(sec * 1000))


# (ms, som, pan) — efeitos, espelhando render(t) do index.html
CUES = [
    (0, whoosh(0.5, 300, 1800, 0.12), 0.0),                          # cabeçalho
    *[(790 + i * 140, tick(3200, 0.08), -0.2) for i in range(6)],    # digitando…
    (1500, receive(0.42), -0.15),                                    # "Seu registro foi premiado"
    (3020, sent(0.32), 0.2),                                         # "Sério?!"
    (3400, tick(4200, 0.07), 0.2),                                   # lida
    *[(3830 + i * 140, tick(3200, 0.08), -0.2) for i in range(5)],   # digitando…
    (4540, receive(0.34), -0.1),                                     # chega a imagem
    *[(4700 + i * 150, tick(2200 + i * 120, 0.05), -0.2) for i in range(4)],  # baixando
    (5300, shutter(0.55), 0.0),                                      # a imagem aparece
    (6060, receive(0.4), -0.15),                                     # cupom
    (6820, tick(3000, 0.12), 0.0), (6840, pop(760, 0.12), 0.1),      # "Copiado"
    (7580, sent(0.32), 0.2),                                         # "Ganhei, e agora?"
    (7960, tick(4200, 0.07), 0.2),                                   # lida
    *[(8390 + i * 140, tick(3200, 0.08), -0.2) for i in range(5)],   # digitando…
    (9100, receive(0.42), -0.15),                                    # "Coloque um número par…"
    (ms(OUT), whoosh(0.7, 200, 3000, 0.34), 0.0),                    # conversa sai
    (10800, thud(0.35), 0.0),                                        # REGIS
    (11000, whoosh(0.35, 800, 4000, 0.12), 0.0),                     # PREMIADO: linhas abrem
    (11190, tick(2600, 0.12), 0.0),                                  # VOCÊ GANHOU UMA
    (11570, whoosh(0.6, 1500, 6000, 0.1), 0.25),                     # contorno do cupom
    (11760, tick(3000, 0.12), 0.0),                                  # GANHEI, E AGORA?
    (12000, pop(880, 0.1), 0.35),                                    # piscadinha do sorriso
    (ms(END) + 300, ding(0.16), 0.0),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--length', type=float, default=14.5, help='duração em segundos (vídeo + tela final)')
    ap.add_argument('--out', default=str(Path(__file__).resolve().parent.parent / 'registro' / 'sfx.wav'))
    a = ap.parse_args()
    write(CUES, a.length, a.out, fade_out=1.4, bed=music(a.length), wet=0.14)


if __name__ == '__main__':
    main()
