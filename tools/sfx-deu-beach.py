"""Efeitos sonoros do story DEU BEACH (deu-beach/index.html).

Gera deu-beach/sfx.wav (48 kHz, estéreo) com sons sintetizados — nada de
bancos de som externos. Os tempos (ms) seguem a linha do tempo de render(t);
se mudar a animação, ajuste a lista CUES.

    python3 tools/sfx-deu-beach.py            # → deu-beach/sfx.wav
    python3 tools/sfx-deu-beach.py --length 18
"""
import argparse
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)  # determinístico: o mesmo arquivo sempre


def env(n, attack, decay):
    """Envelope de ataque linear e queda exponencial (em segundos)."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def lowpass(x, cutoff):
    """Passa-baixa de um polo; `cutoff` pode variar amostra a amostra."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    k = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += k[i] * (x[i] - acc)
        y[i] = acc
    return y


def sweep(f0, f1, dur, shape=4.0):
    """Senoide com glissando exponencial de f0 para f1."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * shape / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def pop(f=520, dur=0.16):
    """Balão surgindo: bolha curta que cai de tom."""
    s = sweep(f * 1.9, f, dur, 6) * env(int(dur * SR), 0.003, 0.05)
    return s * 0.55


def tick(f=2600, gain=0.18):
    """Tique seco de interface (linhas entrando, teclas)."""
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.012)
    s += rng.standard_normal(n) * env(n, 0.0002, 0.003) * 0.4
    return s * gain


def whoosh(dur=0.5, lo=300, hi=3200, gain=0.35):
    """Sopro de ar com filtro que abre e fecha (troca de cena)."""
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    shape = np.sin(np.pi * p) ** 2
    s = lowpass(rng.standard_normal(n), lo + (hi - lo) * shape)
    s -= lowpass(s, 120)  # tira o grave embolado
    return s / (np.abs(s).max() + 1e-9) * shape * gain


def shutter(gain=0.6):
    """Obturador de câmera: duas batidas mecânicas com o 'chhk' no meio."""
    out = np.zeros(int(0.22 * SR))
    for at, g, d in ((0.0, 1.0, 0.018), (0.075, 0.8, 0.028)):
        n = int(0.09 * SR)
        noise = rng.standard_normal(n)
        click = lowpass(noise, 5200) * env(n, 0.0004, d)
        body = np.sin(2 * np.pi * 180 * np.arange(n) / SR) * env(n, 0.0005, 0.02) * 0.6
        i = int(at * SR)
        out[i:i + n] += (click * 2.2 + body) * g
    return out * gain / (np.abs(out).max() + 1e-9)


def ding(gain=0.32):
    """Confirmação: sino suave de duas notas."""
    out = np.zeros(int(0.9 * SR))
    for at, f in ((0.0, 1318.5), (0.09, 1975.5)):
        n = int(0.8 * SR)
        t = np.arange(n) / SR
        s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2.01 * t)) * env(n, 0.002, 0.22)
        i = int(at * SR)
        out[i:i + n] += s
    return out * gain / (np.abs(out).max() + 1e-9)


def thud(gain=0.7):
    """Marca entrando: batida grave e curta."""
    n = int(0.35 * SR)
    s = sweep(160, 52, 0.35, 5) * env(n, 0.002, 0.09)
    s += lowpass(rng.standard_normal(n), 1800) * env(n, 0.0005, 0.01) * 0.8
    return s * gain


def grow(dur=0.6, gain=0.22):
    """Bloco da agenda crescendo: tom que sobe com um pouco de ar."""
    n = int(dur * SR)
    s = sweep(240, 620, dur, 3) * env(n, 0.04, dur * 0.45)
    return s * gain + whoosh(dur, 400, 2400, gain * 0.4)


def ball(gain=0.55):
    """Bolada de beach tennis: 'tok' oco e seco."""
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * 780 * t) * env(n, 0.0005, 0.02)
    s += np.sin(2 * np.pi * 1240 * t) * env(n, 0.0005, 0.012) * 0.5
    s += lowpass(rng.standard_normal(n), 3000) * env(n, 0.0002, 0.004)
    return s * gain


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

    mix = np.zeros((int(a.length * SR), 2))
    for ms, snd, pan in CUES:
        i = int(ms / 1000 * SR)
        j = min(len(mix), i + len(snd))
        l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        mix[i:j, 0] += snd[: j - i] * l
        mix[i:j, 1] += snd[: j - i] * r

    mix = np.tanh(mix * 1.1) * 0.89                           # cola leve, sem clipar
    fade = int(0.4 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

    pcm = (mix * 32767).astype('<i2')
    with wave.open(a.out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('✓', a.out)


if __name__ == '__main__':
    main()
