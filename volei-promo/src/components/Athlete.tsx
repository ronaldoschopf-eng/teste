// Silhueta de atleta articulada (SVG). Cada pose é um conjunto de juntas;
// as poses são interpoladas quadro a quadro, então a mesma figura salta,
// arma o braço, ataca, bloqueia e comemora. Não é fotografia: é uma
// representação gráfica, com luz de recorte (rim light) para ler no escuro.
import React from 'react';
import { COLORS } from '../config';

type Pt = [number, number];
export type Pose = {
  neck: Pt;
  head: Pt;
  // braço da frente (mais perto da câmera) e de trás
  fElbow: Pt;
  fHand: Pt;
  bElbow: Pt;
  bHand: Pt;
  fKnee: Pt;
  fFoot: Pt;
  bKnee: Pt;
  bFoot: Pt;
};

// Coordenadas em unidades da figura; origem no quadril, y para baixo.
export const POSES = {
  crouch: {
    neck: [34, -214], head: [52, -284],
    fElbow: [-70, -110], fHand: [-140, -40], bElbow: [-50, -120], bHand: [-118, -52],
    fKnee: [80, 104], fFoot: [12, 222], bKnee: [52, 116], bFoot: [-26, 226],
  },
  rise: {
    neck: [12, -232], head: [20, -304],
    fElbow: [-4, -342], fHand: [18, -448], bElbow: [56, -330], bHand: [92, -428],
    fKnee: [16, 150], fFoot: [-8, 300], bKnee: [-6, 148], bFoot: [-40, 294],
  },
  cocked: {
    neck: [-30, -226], head: [-24, -298],
    fElbow: [-112, -290], fHand: [-156, -378], bElbow: [34, -322], bHand: [74, -420],
    fKnee: [48, 128], fFoot: [-86, 220], bKnee: [62, 112], bFoot: [-58, 206],
  },
  contact: {
    neck: [40, -224], head: [62, -290],
    fElbow: [86, -346], fHand: [138, -452], bElbow: [64, -118], bHand: [24, -32],
    fKnee: [66, 138], fFoot: [-20, 246], bKnee: [42, 150], bFoot: [-54, 258],
  },
  block: {
    neck: [0, -232], head: [4, -302],
    fElbow: [24, -360], fHand: [40, -478], bElbow: [-22, -360], bHand: [-28, -476],
    fKnee: [30, 150], fFoot: [36, 300], bKnee: [-30, 150], bFoot: [-36, 300],
  },
  celebrate: {
    neck: [-10, -230], head: [-16, -302],
    fElbow: [72, -330], fHand: [112, -444], bElbow: [-96, -150], bHand: [-66, -236],
    fKnee: [74, 132], fFoot: [62, 300], bKnee: [-78, 118], bFoot: [-112, 290],
  },
  stand: {
    neck: [0, -232], head: [4, -304],
    fElbow: [26, -120], fHand: [40, -20], bElbow: [-24, -120], bHand: [-36, -24],
    fKnee: [14, 150], fFoot: [20, 300], bKnee: [-14, 150], bFoot: [-22, 300],
  },
} satisfies Record<string, Pose>;

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  });
  return out;
};

/** Sequência de poses: [[quadro, pose], …] → pose no quadro atual (com easing suave). */
export const poseAt = (frame: number, track: [number, Pose][]): Pose => {
  if (frame <= track[0][0]) return track[0][1];
  for (let i = 0; i < track.length - 1; i++) {
    const [f0, p0] = track[i];
    const [f1, p1] = track[i + 1];
    if (frame <= f1) {
      const t = (frame - f0) / (f1 - f0);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return mixPose(p0, p1, e);
    }
  }
  return track[track.length - 1][1];
};

// Membro afunilado: trapézio entre duas juntas com pontas arredondadas.
const limb = (a: Pt, b: Pt, wa: number, wb: number) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ra = wa / 2;
  const rb = wb / 2;
  return (
    `M ${a[0] + nx * ra} ${a[1] + ny * ra} L ${b[0] + nx * rb} ${b[1] + ny * rb} ` +
    `A ${rb} ${rb} 0 0 0 ${b[0] - nx * rb} ${b[1] - ny * rb} L ${a[0] - nx * ra} ${a[1] - ny * ra} ` +
    `A ${ra} ${ra} 0 0 0 ${a[0] + nx * ra} ${a[1] + ny * ra} Z`
  );
};

const along = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const Body: React.FC<{ pose: Pose; color: string; backColor: string; grow?: number }> = ({ pose, color, backColor, grow = 0 }) => {
  const p = pose;
  const hip: Pt = [0, 0];
  const g = grow * 2;
  // Tronco modelado: ombros largos, peito, cintura fina e quadril.
  const dx = p.neck[0] - hip[0];
  const dy = p.neck[1] - hip[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const at = (t: number, w: number, side: 1 | -1): string => {
    const c = along(p.neck, hip, t);
    return `${c[0] + nx * w * side} ${c[1] + ny * w * side}`;
  };
  const sw = 48 + grow;
  const torso =
    `M ${at(0.04, sw * 0.55, 1)} Q ${at(0.0, sw, 1)} ${at(0.14, sw, 1)} ` +
    `Q ${at(0.42, sw * 0.9, 1)} ${at(0.72, 33 + grow, 1)} Q ${at(0.92, 40 + grow, 1)} ${at(1.04, 36 + grow, 1)} ` +
    `L ${at(1.04, 36 + grow, -1)} Q ${at(0.92, 40 + grow, -1)} ${at(0.72, 33 + grow, -1)} ` +
    `Q ${at(0.42, sw * 0.9, -1)} ${at(0.14, sw, -1)} Q ${at(0.0, sw, -1)} ${at(0.04, sw * 0.55, -1)} Z`;
  const shoulder = along(p.neck, hip, 0.12);
  const shoulderF: Pt = [shoulder[0] + nx * 10, shoulder[1] + ny * 10];
  const shoulderB: Pt = [shoulder[0] - nx * 14, shoulder[1] - ny * 14];
  const hipF: Pt = [hip[0] + nx * 8, hip[1] + ny * 8];
  const hipB: Pt = [hip[0] - nx * 12, hip[1] - ny * 12];
  // Cabeça alinhada ao pescoço.
  const hAng = (Math.atan2(p.head[1] - p.neck[1], p.head[0] - p.neck[0]) * 180) / Math.PI + 90;
  // Pé apontando para a frente (+x) a partir do tornozelo.
  const foot = (ankle: Pt, col: string) => <path d={limb(ankle, [ankle[0] + 50, ankle[1] + 10], 26 + g, 18 + g)} fill={col} />;
  return (
    <g>
      {/* lado de trás */}
      <path d={limb(shoulderB, p.bElbow, 38 + g, 30 + g)} fill={backColor} />
      <path d={limb(p.bElbow, p.bHand, 30 + g, 20 + g)} fill={backColor} />
      <circle cx={p.bHand[0]} cy={p.bHand[1]} r={14 + grow} fill={backColor} />
      <path d={limb(hipB, p.bKnee, 66 + g, 40 + g)} fill={backColor} />
      <path d={limb(p.bKnee, p.bFoot, 40 + g, 24 + g)} fill={backColor} />
      {foot(p.bFoot, backColor)}
      {/* tronco, pescoço e cabeça */}
      <path d={torso} fill={color} />
      <path d={limb(along(p.neck, hip, 0.1), p.head, 30 + g, 28 + g)} fill={color} />
      <ellipse cx={p.head[0]} cy={p.head[1]} rx={33 + grow} ry={40 + grow} fill={color} transform={`rotate(${hAng} ${p.head[0]} ${p.head[1]})`} />
      {/* lado da frente */}
      <path d={limb(hipF, p.fKnee, 70 + g, 42 + g)} fill={color} />
      <path d={limb(p.fKnee, p.fFoot, 42 + g, 26 + g)} fill={color} />
      {foot(p.fFoot, color)}
      <path d={limb(shoulderF, p.fElbow, 42 + g, 32 + g)} fill={color} />
      <path d={limb(p.fElbow, p.fHand, 32 + g, 21 + g)} fill={color} />
      <circle cx={p.fHand[0]} cy={p.fHand[1]} r={15 + grow} fill={color} />
    </g>
  );
};

type Props = {
  pose: Pose;
  /** Posição do quadril na tela (px). */
  x: number;
  y: number;
  scale?: number;
  /** Espelha horizontalmente (atleta voltado para a esquerda). */
  flip?: boolean;
  /** Intensidade da luz de recorte (0–1). */
  rim?: number;
  rimColor?: string;
  fill?: string;
  opacity?: number;
  /** Desenha apenas o contorno (para rastros / múltipla exposição). */
  ghost?: boolean;
  ghostColor?: string;
};

export const Athlete: React.FC<Props> = ({
  pose,
  x,
  y,
  scale = 1,
  flip = false,
  rim = 1,
  rimColor = COLORS.white,
  fill = COLORS.black,
  opacity = 1,
  ghost = false,
  ghostColor = COLORS.accent,
}) => {
  const box = 1300;
  return (
    <svg
      width={box}
      height={box}
      viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
      style={{
        position: 'absolute',
        left: x - box / 2,
        top: y - box / 2,
        overflow: 'visible',
        transform: `scale(${(flip ? -1 : 1) * scale}, ${scale})`,
        transformOrigin: '50% 50%',
        opacity,
        pointerEvents: 'none',
      }}
    >
      {ghost ? (
        <g opacity={0.9}>
          <Body pose={pose} color={ghostColor} backColor={ghostColor} grow={0} />
        </g>
      ) : (
        <>
          {rim > 0 ? (
            <g style={{ filter: `blur(${10}px)` }} opacity={rim}>
              <Body pose={pose} color={rimColor} backColor={rimColor} grow={7} />
            </g>
          ) : null}
          {rim > 0 ? (
            <g opacity={rim * 0.9}>
              <Body pose={pose} color={rimColor} backColor={rimColor} grow={2.5} />
            </g>
          ) : null}
          <Body pose={pose} color={fill} backColor={COLORS.graphite} />
        </>
      )}
    </svg>
  );
};

/** Posição da mão de ataque (frente) em coordenadas de tela. */
export const handPosition = (pose: Pose, x: number, y: number, scale = 1, flip = false): { x: number; y: number } => ({
  x: x + pose.fHand[0] * scale * (flip ? -1 : 1),
  y: y + pose.fHand[1] * scale,
});
