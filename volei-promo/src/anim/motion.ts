// Curvas e utilitários de movimento. Tudo é função pura do quadro, então
// qualquer quadro pode ser renderizado isoladamente e sempre sai igual.
import { Easing, interpolate, random, spring } from 'remotion';

export const ease = {
  /** Arrancada rápida e pouso longo — entradas de texto e objetos. */
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
  /** Desaceleração suave. */
  outCubic: Easing.bezier(0.33, 1, 0.68, 1),
  /** Aceleração para saídas e "puxadas" de câmera. */
  inCubic: Easing.bezier(0.32, 0, 0.67, 0),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** Pequena ultrapassagem do valor final. */
  outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
};

/** interpolate com clamp nas duas pontas e easing opcional. */
export const tween = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing: (t: number) => number = ease.outCubic,
) =>
  interpolate(frame, input, output, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Interpolação com vários pontos e clamp. */
export const keys = (frame: number, input: number[], output: number[], easing?: (t: number) => number) =>
  interpolate(frame, input, output, { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Mola padrão para "pancadas" com leve ultrapassagem. */
export const punch = (frame: number, fps: number, delay = 0, stiffness = 180, damping = 13, mass = 0.7) =>
  spring({ frame: frame - delay, fps, config: { stiffness, damping, mass } });

/** Tremor de câmera determinístico que decai a partir de `start`. */
export const shake = (frame: number, start: number, amplitude: number, duration = 10, seed = 'shake') => {
  const t = frame - start;
  if (t < 0 || t > duration) return { x: 0, y: 0 };
  const decay = Math.pow(1 - t / duration, 2);
  return {
    x: (random(`${seed}-x-${t}`) * 2 - 1) * amplitude * decay,
    y: (random(`${seed}-y-${t}`) * 2 - 1) * amplitude * decay,
  };
};

/** Pulso curto de flash: sobe em `attack` quadros e decai em `decay`. */
export const flashCurve = (frame: number, at: number, attack = 1, decay = 7) => {
  if (frame < at - attack || frame > at + decay) return 0;
  if (frame <= at) return attack === 0 ? 1 : tween(frame, [at - attack, at], [0, 1], ease.inCubic);
  return tween(frame, [at, at + decay], [1, 0], ease.outCubic);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
