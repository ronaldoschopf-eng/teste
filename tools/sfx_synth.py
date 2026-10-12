"""Sintetizadores de efeitos sonoros para os stories (sem bancos de som).

Cada função devolve um array mono em SR Hz; write() mixa uma lista de
cues (ms, som, pan) num WAV estéreo de 16 bits.
"""
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


def receive(gain=0.4):
    """Mensagem chegando: duas notas curtas subindo, estilo app de conversa."""
    out = np.zeros(int(0.32 * SR))
    for at, f in ((0.0, 880.0), (0.085, 1318.5)):
        n = int(0.22 * SR)
        t = np.arange(n) / SR
        s = (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(2 * np.pi * f * 3 * t)) * env(n, 0.002, 0.06)
        i = int(at * SR)
        out[i:i + n] += s
    return out * gain / (np.abs(out).max() + 1e-9)


def sent(gain=0.3):
    """Mensagem enviada: 'swoop' curto que sobe."""
    n = int(0.18 * SR)
    s = sweep(500, 1500, 0.18, 2.5) * env(n, 0.01, 0.05)
    return s * gain + whoosh(0.18, 600, 3000, gain * 0.5)


# --- trilha: instrumentos (tudo vetorizado, só NumPy) ----------------------

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def adsr(n, attack, release, sustain_until=None):
    """Envelope com ataque e soltura lineares (segundos), sustentado no meio."""
    t = np.arange(n) / SR
    end = n / SR if sustain_until is None else sustain_until
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    r = np.clip((end + release - t) / max(release, 1e-4), 0, 1)
    return a * np.minimum(r, 1)


def pad(notes, dur, bright=2.0, bright_end=None, attack=0.5, release=0.8, gain=0.08):
    """Pad estéreo: 3 vozes desafinadas por nota, harmônicos que somem como
    num filtro passa-baixa. `bright` → `bright_end` abre o filtro no tempo."""
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    b = np.linspace(bright, bright if bright_end is None else bright_end, n)
    out = np.zeros((n, 2))
    for note in notes:
        f0 = midi(note)
        for cents, (l, r) in ((-9, (0.9, 0.3)), (0, (0.65, 0.65)), (9, (0.3, 0.9))):
            f = f0 * 2 ** (cents / 1200)
            ph = rng.uniform(0, 2 * np.pi)
            v = np.zeros(n)
            for h in range(1, 11):
                if f * h > 9000:
                    break
                v += np.sin(2 * np.pi * f * h * t + ph * h) * np.exp(-(h - 1) / b) / h
            out[:, 0] += v * l
            out[:, 1] += v * r
    e = adsr(n, attack, release, dur)
    return out * e[:, None] * gain / max(1, len(notes)) * 2


def bass(note, dur, gain=0.22):
    """Baixo redondo: senoide com um pouco de 2º harmônico."""
    n = int((dur + 0.15) * SR)
    t = np.arange(n) / SR
    f = midi(note)
    v = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return v * adsr(n, 0.012, 0.15, dur) * gain


def kick(gain=0.55):
    n = int(0.42 * SR)
    s = sweep(150, 46, 0.42, 7) * env(n, 0.001, 0.13)
    s += np.diff(rng.standard_normal(n + 1)) * env(n, 0.0002, 0.002) * 0.15
    return s * gain


def clap(gain=0.22):
    """Palma: três rajadas de ruído agudo e uma cauda curta."""
    out = np.zeros(int(0.25 * SR))
    for k, at in enumerate((0.0, 0.011, 0.023)):
        n = int(0.2 * SR)
        x = np.diff(rng.standard_normal(n + 1)) * env(n, 0.0005, 0.008 if k < 2 else 0.06)
        i = int(at * SR)
        out[i:i + n] += x
    return out * gain / (np.abs(out).max() + 1e-9)


def hat(gain=0.06, decay=0.025):
    n = int(0.08 * SR)
    x = np.diff(np.diff(rng.standard_normal(n + 2)))
    return x / 4 * env(n, 0.0005, decay) * gain


def pluck(note, gain=0.09, decay=0.22):
    """Pluck brilhante (arpejos e brilhos das fotos)."""
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = midi(note)
    v = np.zeros(n)
    for h, a in ((1, 1), (2, 0.45), (3, 0.22), (4, 0.12)):
        v += np.sin(2 * np.pi * f * h * t) * a * np.exp(-t * h / decay)
    return v * env(n, 0.002, 10) * gain


def riser(dur=0.76, gain=0.3):
    """Subida de tensão: ruído que abre e um tom que sobe, com corte seco."""
    n = int(dur * SR)
    p = np.linspace(0, 1, n)
    noise = lowpass(rng.standard_normal(n), 300 + 7000 * p ** 2)
    noise -= lowpass(noise, 200)
    noise /= np.abs(noise).max() + 1e-9
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * p)) / SR) * 0.35
    return (noise + tone) * p ** 2.2 * gain


def stereo(x, pan=0.0):
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    return np.stack([x * l, x * r], axis=1)


def delay(x, ms, feedback=0.35, taps=4):
    """Eco pingue-pongue para um sinal estéreo."""
    d = int(ms / 1000 * SR)
    out = np.zeros((len(x) + d * taps, 2))
    out[:len(x)] += x
    for k in range(1, taps + 1):
        g = feedback ** k
        side = k % 2
        out[d * k:d * k + len(x), side] += x[:, side] * g + x[:, 1 - side] * g * 0.3
    return out


def reverb(x, seconds=2.2, decay=0.55, mix=0.25):
    """Reverb por convolução com resposta sintética (ruído que decai), estéreo."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / decay)[:, None]
    k = np.ones(24) / 24                                       # escurece a cauda
    ir = np.stack([np.convolve(ir[:, c], k, 'same') for c in (0, 1)], axis=1)
    ir[:int(0.012 * SR)] = 0                                  # pré-delay
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], size) * np.fft.rfft(ir[:, c], size), size)[:len(x)]
                    for c in (0, 1)], axis=1)
    return x + wet * mix


def write(cues, length, out, fade_out=0.4, bed=None, wet=0.0):
    """Mixa os cues em `length` segundos e grava `out` (WAV estéreo 16 bits).

    Um cue pode ser mono (usa o pan) ou estéreo (n, 2). `bed` é uma trilha
    estéreo somada por baixo; `wet` > 0 passa os efeitos por um reverb.
    """
    mix = np.zeros((int(length * SR), 2))
    for ms, snd, pan in cues:
        i = int(ms / 1000 * SR)
        j = min(len(mix), i + len(snd))
        if snd.ndim == 2:
            mix[i:j] += snd[: j - i]
            continue
        l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        mix[i:j, 0] += snd[: j - i] * l
        mix[i:j, 1] += snd[: j - i] * r

    if wet > 0:
        mix = reverb(mix, mix=wet)
    if bed is not None:
        mix += bed[: len(mix)]

    mix = np.tanh(mix * 1.1) * 0.89                           # cola leve, sem clipar
    fade = int(fade_out * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

    pcm = (mix * 32767).astype('<i2')
    with wave.open(str(out), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('✓', out)
