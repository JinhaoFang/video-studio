/**
 * 主角：树麻雀（#180 扩展）。体块用距离场捏（胸腹、臀、头三个椭球平滑并起来，喙、尾、两翼各自成块），按视角正交投影成线稿和赛璐璐色块，
 * 所以任意角度都是同一只鸟。色值全部取自 tokens-sparrow.ts，线条规格取自 tokens.ts 的 ink。
 * 状态参数化：wet（0..1，干湿程度：控制湿/干色板、瘦身顺流湿绺、暗缝与水光）与 ruffle（0..1，甩乱蓬松程度：覆盖瘦身蓬成约 1.4 倍圆球、三维羽簇朝各方向翘、收起水光）独立连续可调；
 * 头部特征（颊斑、喉斑、眼先、眼、喙）随头半径等比缩放且不受蓬松胸腔遮裁，保证任意状态和角度下比例稳定。
 * 姿势支持受惊瞪眼、起飞失败全套关键姿势、半闭眼晒太阳、抬头看光、近中景大展翅/屈腕上挥/下扑拖影与干笔速度线、展尾伸脚刹车落地；
 * 光照支持 sparrowLight(preset, direction) 直取雨色/夕光/低夕光/暮色色指定，以及 mixSparrowLight 在场间平滑过渡，同时完全兼容小样 S1/S2 的 backlight 与 sheetLight。
 * 局部坐标以"单位"计（身体半径约 1，全长约 3.3），x 朝前、y 朝左、z 朝上，原点是站立时的身体中心，脚踩在 z = FOOT_Z。
 * 近景按翼面排飞羽与覆羽，沿胸背和颊冠的羽流打散色界，半眯的眼睑在头部投影里取松弧。
 * 待定事项：无。
 */
import { createLayer, drawCel, placeLayer, tracePath } from "../../src/kit/engine/cel.ts";
import type { CelPart, Tone } from "../../src/kit/engine/cel.ts";
import {
  add,
  area as loopArea,
  contours,
  dot,
  ellipsoid,
  field,
  normalize,
  resample,
  roundCone,
  sample,
  smin,
  smooth,
  sub,
  toView,
  viewBasis,
} from "../../src/kit/engine/figure.ts";
import type { Basis, Point, Sampled, V3 } from "../../src/kit/engine/figure.ts";
import { boil, drawStrokes, strokes } from "../../src/kit/engine/ink.ts";
import type { Stroke, StrokeStyle } from "../../src/kit/engine/ink.ts";
import { hash, noise1 } from "../../src/kit/engine/random.ts";
import { ink } from "./tokens.ts";
import {
  mixHex,
  mixSparrowPalette,
  paletteForLight,
  sparrowCommon,
  sparrowRim,
} from "./tokens-sparrow.ts";
import type { SparrowLightPreset, SparrowPalette } from "./tokens-sparrow.ts";

export const FOOT_Z = -1.3;

export type Pose = {
  bodyPitch: number;
  lift: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  puff: number;
  wet: number;
  ruffle?: number;
  crouch: number;
  stretch: number;
  tailLift: number;
  tailSpread?: number;
  wingSpread: number;
  wingFlap: number;
  wingFold?: number;
  wingSweep?: number;
  wingSmear?: number;
  eyeOpen: number;
  eyeClosedCurve: number;
  sparkle: number;
  glint?: number;
  beakOpen: number;
  legs: boolean;
  legReach?: number;
  legExtend?: number;
  toeSpread?: number;
};

export const restPose: Pose = {
  bodyPitch: 0.42,
  lift: 0,
  headYaw: 0,
  headPitch: -0.1,
  headRoll: 0,
  puff: 0,
  wet: 0,
  ruffle: 0,
  crouch: 0,
  stretch: 0,
  tailLift: 0,
  tailSpread: 0,
  wingSpread: 0,
  wingFlap: 0,
  wingFold: 0,
  wingSweep: 0,
  wingSmear: 0,
  eyeOpen: 1,
  eyeClosedCurve: 0.6,
  sparkle: 0,
  beakOpen: 0,
  legs: true,
  legReach: 0,
  legExtend: 0,
  toeSpread: 0,
};

export const sparrowStates = {
  wet: { wet: 1, ruffle: 0, puff: 0 },
  ruffled: { wet: 1, ruffle: 1, puff: 0 },
  dry: { wet: 0, ruffle: 0, puff: 0 },
} as const;

export const transitionSparrowState = (
  from: { wet: number; ruffle: number; puff?: number },
  to: { wet: number; ruffle: number; puff?: number },
  t: number,
) => {
  const u = Math.max(0, Math.min(1, t));
  return {
    wet: from.wet + (to.wet - from.wet) * u,
    ruffle: from.ruffle + (to.ruffle - from.ruffle) * u,
    puff: (from.puff ?? 0) + ((to.puff ?? 0) - (from.puff ?? 0)) * u,
  };
};

export const sparrowPoses: Record<string, Pose> = {
  startled: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.56,
    crouch: 0.28,
    stretch: -0.07,
    headPitch: 0.14,
    headYaw: 0.12,
    tailLift: 0.18,
    tailSpread: 0.35,
    wingSpread: 0.22,
    wingFlap: 0.35,
    eyeOpen: 1.28,
    glint: 0.82,
    beakOpen: 0.45,
  },
  failCrouch: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.06,
    crouch: 1,
    stretch: -0.14,
    headPitch: 0.16,
    tailLift: 0.44,
    tailSpread: 0.25,
    wingSpread: 0.55,
    wingFlap: 0.52,
    wingSweep: -0.22,
    eyeOpen: 1.16,
    glint: 0.72,
  },
  failPush: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.62,
    crouch: -0.08,
    lift: 0.34,
    stretch: 0.18,
    headPitch: 0.06,
    tailLift: -0.12,
    tailSpread: 0.45,
    wingSpread: 0.94,
    wingFlap: 0.82,
    wingSweep: -0.05,
    eyeOpen: 1.18,
    glint: 0.72,
    legReach: -0.68,
    legExtend: 1,
  },
  failFlapDown: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.44,
    lift: 0.56,
    stretch: 0.06,
    headPitch: -0.04,
    tailLift: -0.18,
    tailSpread: 0.55,
    wingSpread: 1,
    wingFlap: -0.88,
    wingSweep: 0.22,
    wingSmear: 0.6,
    eyeOpen: 1.16,
    glint: 0.72,
    legs: false,
  },
  failHover: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.52,
    lift: 0.62,
    stretch: 0.02,
    headPitch: -0.12,
    tailLift: -0.24,
    tailSpread: 0.38,
    wingSpread: 0.98,
    wingFlap: 0.9,
    wingFold: 0.15,
    eyeOpen: 1.24,
    glint: 0.72,
    legs: true,
    legReach: -0.22,
    legExtend: 0.15,
  },
  failDrop: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.22,
    lift: 0.28,
    stretch: 0.2,
    headPitch: -0.24,
    tailLift: 0.38,
    tailSpread: 0.52,
    wingSpread: 0.96,
    wingFlap: 0.98,
    wingSweep: -0.28,
    eyeOpen: 1.26,
    glint: 0.68,
    legs: true,
    legReach: 0.32,
    legExtend: 0.28,
  },
  failTipForward: {
    ...restPose,
    wet: 1,
    bodyPitch: -0.78,
    crouch: 0.12,
    stretch: -0.04,
    headPitch: -0.26,
    tailLift: 0.52,
    tailSpread: 0.65,
    wingSpread: 0.9,
    wingFlap: 0.68,
    wingSweep: -0.35,
    eyeOpen: 1.22,
    glint: 0.68,
    legs: true,
    legReach: 0,
  },
  failRecover: {
    ...restPose,
    wet: 1,
    bodyPitch: 0.28,
    crouch: 0.34,
    puff: 0.14,
    headPitch: -0.18,
    tailLift: -0.06,
    wingSpread: 0.08,
    wingFlap: 0.05,
    eyeOpen: 0.72,
    glint: 0.55,
    beakOpen: 0.22,
  },
  sunbathe: {
    ...restPose,
    wet: 0.15,
    ruffle: 0.22,
    puff: 0.16,
    bodyPitch: 0.46,
    headPitch: 0.16,
    headYaw: 0.08,
    eyeOpen: 0.46,
    glint: 0.52,
    tailLift: -0.04,
  },
  lookUp: {
    ...restPose,
    wet: 0,
    ruffle: 0,
    bodyPitch: 0.54,
    headPitch: 0.56,
    headYaw: 0.14,
    eyeOpen: 1,
    sparkle: 1,
    glint: 1,
  },
  takeoffCrouch: {
    ...restPose,
    wet: 0,
    ruffle: 0,
    bodyPitch: 0.14,
    crouch: 0.88,
    stretch: -0.1,
    headPitch: 0.08,
    tailLift: 0.34,
    wingSpread: 0.28,
    wingFlap: 0.28,
    eyeOpen: 1,
    glint: 0.85,
  },
  flightDown: {
    ...restPose,
    wet: 0,
    ruffle: 0,
    bodyPitch: 0.08,
    lift: 0.35,
    stretch: 0.12,
    headPitch: -0.04,
    tailLift: 0.04,
    tailSpread: 0.32,
    wingSpread: 1,
    wingFlap: -0.92,
    wingSweep: 0.24,
    wingSmear: 0.78,
    eyeOpen: 1,
    glint: 0.8,
    legs: false,
  },
  flightUp: {
    ...restPose,
    wet: 0,
    ruffle: 0,
    bodyPitch: 0.18,
    lift: 0.42,
    stretch: 0.08,
    headPitch: -0.06,
    tailLift: 0.08,
    tailSpread: 0.18,
    wingSpread: 0.92,
    wingFlap: 0.92,
    wingFold: 0.74,
    wingSweep: -0.26,
    eyeOpen: 1,
    glint: 0.8,
    legs: false,
  },
  flightBound: {
    ...restPose,
    wet: 0,
    ruffle: 0,
    bodyPitch: 0.04,
    lift: 0.45,
    stretch: 0.18,
    headPitch: -0.08,
    tailLift: 0.14,
    tailSpread: 0,
    wingSpread: 0,
    wingFlap: 0,
    eyeOpen: 1,
    glint: 0.8,
    legs: false,
  },
  landingBrake: {
    ...restPose,
    wet: 0,
    ruffle: 0,
    bodyPitch: 0.88,
    lift: 0.28,
    stretch: -0.04,
    headPitch: -0.24,
    tailLift: -0.52,
    tailSpread: 0.95,
    wingSpread: 1,
    wingFlap: 0.78,
    wingSweep: 0.48,
    wingFold: 0.05,
    eyeOpen: 1,
    glint: 0.8,
    legs: true,
    legReach: 0.96,
    legExtend: 0.92,
    toeSpread: 1,
  },
};

export type Lighting = {
  direction: V3;
  preset?: SparrowLightPreset;
  blend?: { to: SparrowLightPreset; t: number };
  palette?: SparrowPalette;
  litTint?: { color: string; amount: number };
  shadeTint?: { color: string; amount: number };
  rim?: { color: string; alpha: number; mode?: "back" | "top" };
  threshold?: number;
};

export const sparrowLight = (
  preset: SparrowLightPreset,
  direction: V3,
  options?: { rimAlpha?: number; threshold?: number },
): Lighting => {
  const rimColor = sparrowRim[preset];
  const defaultRimAlpha =
    preset === "rain" ? 0.58 : preset === "twilight" ? 0 : 0.88;
  const rimAlpha = options?.rimAlpha ?? defaultRimAlpha;
  return {
    direction,
    preset,
    rim:
      rimColor && rimAlpha > 0
        ? {
            color: rimColor,
            alpha: rimAlpha,
            mode: preset === "rain" ? "top" : "back",
          }
        : undefined,
    threshold:
      options?.threshold ??
      (preset === "rain" ? -0.1 : preset === "twilight" ? 0.18 : 0.08),
  };
};

export const mixSparrowLight = (
  from: SparrowLightPreset,
  to: SparrowLightPreset,
  t: number,
  direction: V3,
  options?: { rimAlpha?: number; threshold?: number },
): Lighting => {
  const u = Math.max(0, Math.min(1, t));
  const a = sparrowLight(from, direction, options);
  const b = sparrowLight(to, direction, options);
  const rimColor =
    a.rim && b.rim
      ? mixHex(a.rim.color, b.rim.color, u)
      : (u < 0.5 ? a.rim?.color : b.rim?.color) ?? null;
  const rimAlpha = (a.rim?.alpha ?? 0) * (1 - u) + (b.rim?.alpha ?? 0) * u;
  return {
    direction,
    preset: from,
    blend: { to, t: u },
    rim:
      rimColor && rimAlpha > 0.02
        ? {
            color: rimColor,
            alpha: rimAlpha,
            mode: u < 0.5 ? a.rim?.mode ?? "back" : b.rim?.mode ?? "back",
          }
        : undefined,
    threshold:
      options?.threshold ??
      (a.threshold ?? 0.08) * (1 - u) + (b.threshold ?? 0.08) * u,
  };
};

export type SparrowView = {
  x: number;
  y: number;
  ppu: number;
  yaw: number;
  pitch: number;
  roll?: number;
  lighting: Lighting;
  drawing: number;
  seed?: number;
  silhouetteOnly?: string;
};

const NECK: V3 = [0.62, 0, 0.42];
const HEAD: V3 = [0.95, 0, 0.8];

type BakedCone = {
  ax: number;
  ay: number;
  az: number;
  bax: number;
  bay: number;
  baz: number;
  invDot: number;
  ra: number;
  dr: number;
  smooth: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

type Rig = {
  toBody: (p: V3) => V3;
  fromBody: (p: V3) => V3;
  toHead: (p: V3) => V3;
  fromHead: (p: V3) => V3;
  bodyHead: (p: V3) => number;
  headness: (p: V3) => number;
  beak: (p: V3) => number;
  tail: (p: V3) => number;
  wing: (side: number) => (p: V3) => number;
  wingFrame: (side: number, p: V3) => V3;
  wingToBody: (side: number, w: V3) => V3;
  wingCenter: (side: number) => V3;
  scaleBody: number;
  headScale: V3;
  sleekWet: number;
  ruffle: number;
  spreadWing: boolean;
  spanScale: number;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const mixV = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rotX = (p: V3, c: number, s: number): V3 => [
  p[0],
  p[1] * c - p[2] * s,
  p[1] * s + p[2] * c,
];

const rotY = (p: V3, c: number, s: number): V3 => [
  p[0] * c + p[2] * s,
  p[1],
  -p[0] * s + p[2] * c,
];

const rotZ = (p: V3, c: number, s: number): V3 => [
  p[0] * c - p[1] * s,
  p[0] * s + p[1] * c,
  p[2],
];

const bakeCone = (
  a: V3,
  b: V3,
  ra: number,
  rb: number,
  pad: number,
  smooth: number,
): BakedCone => {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const mr = Math.max(ra, rb) + pad;
  return {
    ax: a[0],
    ay: a[1],
    az: a[2],
    bax,
    bay,
    baz,
    invDot: 1 / (bax * bax + bay * bay + baz * baz || 1),
    ra,
    dr: rb - ra,
    smooth,
    minX: Math.min(a[0], b[0]) - mr,
    maxX: Math.max(a[0], b[0]) + mr,
    minY: Math.min(a[1], b[1]) - mr,
    maxY: Math.max(a[1], b[1]) + mr,
    minZ: Math.min(a[2], b[2]) - mr,
    maxZ: Math.max(a[2], b[2]) + mr,
  };
};

const evalBakedCone = (p: V3, c: BakedCone): number => {
  const pax = p[0] - c.ax;
  const pay = p[1] - c.ay;
  const paz = p[2] - c.az;
  let h = (pax * c.bax + pay * c.bay + paz * c.baz) * c.invDot;
  if (h < 0) h = 0;
  else if (h > 1) h = 1;
  const dx = pax - c.bax * h;
  const dy = pay - c.bay * h;
  const dz = paz - c.baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (c.ra + c.dr * h);
};

const capsuleFlat = (
  p: V3,
  a: V3,
  b: V3,
  ra: number,
  rb: number,
  flatZ: number,
): number => {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const pax = p[0] - a[0];
  const pay = p[1] - a[1];
  const paz = p[2] - a[2];
  const denom = bax * bax + bay * bay + baz * baz || 1;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / denom));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = (paz - baz * h) * flatZ;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
};

const RUFFLE_TUFTS: readonly [V3, V3, number, number][] = [
  [
    [0.86, 0.08, 1.38],
    [0.64, 0.14, 1.66],
    0.16,
    0.04,
  ],
  [
    [0.68, -0.14, 1.35],
    [0.42, -0.22, 1.62],
    0.15,
    0.038,
  ],
  [
    [0.4, 0.24, 1.14],
    [0.18, 0.44, 1.38],
    0.17,
    0.045,
  ],
  [
    [0.36, -0.26, 1.12],
    [0.14, -0.46, 1.34],
    0.17,
    0.045,
  ],
  [
    [-0.14, 0.36, 0.92],
    [-0.44, 0.56, 1.18],
    0.19,
    0.05,
  ],
  [
    [-0.18, -0.34, 0.9],
    [-0.48, -0.54, 1.14],
    0.19,
    0.05,
  ],
  [
    [-0.64, 0.26, 0.68],
    [-0.98, 0.44, 0.88],
    0.18,
    0.048,
  ],
  [
    [-0.66, -0.26, 0.66],
    [-1.0, -0.42, 0.84],
    0.18,
    0.048,
  ],
  [
    [0.52, 0.72, -0.16],
    [0.64, 1.06, -0.32],
    0.2,
    0.055,
  ],
  [
    [0.52, -0.72, -0.16],
    [0.64, -1.06, -0.32],
    0.2,
    0.055,
  ],
  [
    [-0.08, 0.76, -0.52],
    [-0.24, 1.04, -0.82],
    0.2,
    0.055,
  ],
  [
    [-0.08, -0.76, -0.52],
    [-0.24, -1.04, -0.82],
    0.2,
    0.055,
  ],
  [
    [0.36, 0.26, -0.82],
    [0.42, 0.38, -1.14],
    0.18,
    0.05,
  ],
  [
    [0.32, -0.28, -0.82],
    [0.36, -0.42, -1.12],
    0.18,
    0.05,
  ],
];

const WET_LOCKS: readonly [V3, V3, number, number][] = [
  [
    [0.4, 0.42, -0.48],
    [0.02, 0.46, -0.82],
    0.15,
    0.042,
  ],
  [
    [0.4, -0.42, -0.48],
    [0.02, -0.46, -0.82],
    0.15,
    0.042,
  ],
  [
    [-0.04, 0.48, -0.48],
    [-0.46, 0.45, -0.78],
    0.15,
    0.042,
  ],
  [
    [-0.04, -0.48, -0.48],
    [-0.46, -0.45, -0.78],
    0.15,
    0.042,
  ],
  [
    [-0.46, 0.32, -0.3],
    [-0.86, 0.28, -0.54],
    0.14,
    0.04,
  ],
  [
    [-0.46, -0.32, -0.3],
    [-0.86, -0.28, -0.54],
    0.14,
    0.04,
  ],
];

const rig = (pose: Pose): Rig => {
  const wet = clamp01(pose.wet);
  const ruffle = clamp01(pose.ruffle ?? 0);
  const sleekWet = wet * (1 - ruffle);
  const offset: V3 = [0, 0, -0.3 * pose.crouch + pose.lift];
  const sy = 1 + pose.stretch;
  const sx = 1 / Math.sqrt(Math.max(0.3, sy));
  const invSx = 1 / sx;
  const invSy = 1 / sy;

  const cBP = Math.cos(pose.bodyPitch);
  const sBP = Math.sin(pose.bodyPitch);
  const cHY = Math.cos(-pose.headYaw);
  const sHY = Math.sin(-pose.headYaw);
  const cHP = Math.cos(pose.headPitch);
  const sHP = Math.sin(pose.headPitch);
  const cHR = Math.cos(-pose.headRoll);
  const sHR = Math.sin(-pose.headRoll);

  const toBody = (p: V3): V3 => {
    const ox = p[0] - offset[0];
    const oy = p[1] - offset[1];
    const oz = p[2] - offset[2];
    const rx = ox * cBP + oz * sBP;
    const rz = -ox * sBP + oz * cBP;
    return [rx * invSx, oy * invSx, rz * invSy];
  };

  const fromBody = (p: V3): V3 => {
    const px = p[0] * sx;
    const py = p[1] * sx;
    const pz = p[2] * sy;
    return [
      px * cBP - pz * sBP + offset[0],
      py + offset[1],
      px * sBP + pz * cBP + offset[2],
    ];
  };

  const toHead = (p: V3): V3 => {
    let q: V3 = [p[0] - NECK[0], p[1] - NECK[1], p[2] - NECK[2]];
    q = rotZ(q, cHY, sHY);
    q = rotY(q, cHP, sHP);
    q = rotX(q, cHR, sHR);
    return [q[0] + NECK[0], q[1] + NECK[1], q[2] + NECK[2]];
  };

  const fromHead = (q: V3): V3 => {
    let p: V3 = [q[0] - NECK[0], q[1] - NECK[1], q[2] - NECK[2]];
    p = rotX(p, cHR, -sHR);
    p = rotY(p, cHP, -sHP);
    p = rotZ(p, cHY, -sHY);
    return [p[0] + NECK[0], p[1] + NECK[1], p[2] + NECK[2]];
  };

  const puffScale = 1 + 0.18 * pose.puff + 0.14 * ruffle - 0.12 * sleekWet;
  const roundBoost = 1 + 0.08 * ruffle;
  const chestR: V3 = [
    0.98 * puffScale,
    0.9 * puffScale * roundBoost,
    0.96 * puffScale * (1 + 0.03 * ruffle),
  ];
  const rearR: V3 = [
    0.86 * puffScale * (1 + 0.04 * ruffle),
    0.74 * puffScale * (1 + 0.12 * ruffle),
    0.7 * puffScale * (1 + 0.12 * ruffle),
  ];
  const headScale: V3 = [
    1 + 0.06 * pose.puff + 0.08 * ruffle - 0.05 * sleekWet,
    1 + 0.1 * pose.puff + 0.11 * ruffle - 0.06 * sleekWet,
    1 + 0.08 * pose.puff + 0.09 * ruffle - 0.05 * sleekWet,
  ];
  const headR: V3 = [
    0.74 * headScale[0],
    0.69 * headScale[1],
    0.67 * headScale[2],
  ];

  const bakedCones: BakedCone[] = [];
  if (sleekWet > 0) {
    const strength = (1 - ruffle) * Math.min(1, wet / 0.15);
    for (const [a, tip, ra, rb] of WET_LOCKS) {
      bakedCones.push(bakeCone(
        a, mixV(a, tip, sleekWet),
        ra * (0.72 + 0.28 * sleekWet) * strength, rb * strength,
        0.16, 0.1 * strength,
      ));
    }
  }
  if (ruffle > 0) {
    for (const [a, tip, ra, rb] of RUFFLE_TUFTS) {
      const core: V3 = a[2] > 1 ? HEAD : [0, 0, 0];
      const tucked = mixV(core, a, 0.65);
      bakedCones.push(bakeCone(
        mixV(tucked, a, ruffle), mixV(tucked, tip, ruffle),
        ra * ruffle, rb * ruffle, 0.2, 0.12 * ruffle,
      ));
    }
  }

  const bodyOnly = (b: V3) =>
    smin(
      ellipsoid(b, [0.22, 0, -0.02 - 0.02 * ruffle], chestR),
      ellipsoid(b, [-0.5 + 0.08 * ruffle, 0, 0.06 - 0.02 * ruffle], rearR),
      0.55 + 0.16 * ruffle,
    );
  const headOnly = (b: V3) => ellipsoid(toHead(b), HEAD, headR);
  const neckK = 0.5 - 0.16 * sleekWet + 0.22 * pose.puff + 0.3 * ruffle;

  const bodyHead = (p: V3) => {
    const b = toBody(p);
    let d = smin(bodyOnly(b), headOnly(b), neckK);
    const n = bakedCones.length;
    if (n > 0 && d < 0.46) {
      const bx = b[0];
      const by = b[1];
      const bz = b[2];
      for (let i = 0; i < n; i++) {
        const c = bakedCones[i];
        if (
          bx < c.minX ||
          bx > c.maxX ||
          by < c.minY ||
          by > c.maxY ||
          bz < c.minZ ||
          bz > c.maxZ
        ) {
          continue;
        }
        const td = evalBakedCone(b, c);
        if (td < d + c.smooth) d = smin(d, td, c.smooth);
      }
    }
    return d;
  };
  const headness = (p: V3) => {
    const b = toBody(p);
    return headOnly(b) - bodyOnly(b);
  };

  const open = pose.beakOpen;
  const cUp = Math.cos(-0.25 * open);
  const sUp = Math.sin(-0.25 * open);
  const cDn = Math.cos(0.45 * open);
  const sDn = Math.sin(0.45 * open);
  const beakX = HEAD[0] + 0.55 * headScale[0];
  const beakBase: V3 = [beakX, 0, HEAD[2] - 0.06 * headScale[2]];
  const beakTipClosed: V3 = [beakX + 0.38, 0, beakBase[2] - 0.08];
  const beakUpEnd = add(beakBase, rotY([0.4, 0, -0.04], cUp, sUp));
  const beakDnEnd = add(beakBase, rotY([0.34, 0, -0.12], cDn, sDn));
  const beak = (p: V3) => {
    const q = toHead(toBody(p));
    if (open < 0.05) return roundCone(q, beakBase, beakTipClosed, 0.165, 0.03);
    return Math.min(
      roundCone(q, [beakBase[0], 0, beakBase[2] + 0.05], beakUpEnd, 0.17, 0.03),
      roundCone(q, [beakBase[0], 0, beakBase[2] - 0.06], beakDnEnd, 0.13, 0.03),
    );
  };

  const tailBase: V3 = [-1.0, 0, -0.06];
  const tailAngle = 0.18 - pose.tailLift;
  const cT = Math.cos(tailAngle);
  const sT = Math.sin(tailAngle);
  const tailSpread = clamp01(pose.tailSpread ?? 0);
  const tail = (p: V3) => {
    const b = toBody(p);
    const t = rotY(
      [b[0] - tailBase[0], b[1] - tailBase[1], b[2] - tailBase[2]],
      cT,
      sT,
    );
    const a = ellipsoid(t, [-0.3, 0, 0.02], [0.45, 0.26 + 0.14 * tailSpread, 0.15]);
    if (tailSpread < 0.08) {
      const c = ellipsoid(t, [-0.72, 0, 0], [0.4, 0.3, 0.07]);
      return smin(a, c, 0.3);
    }
    const fanW = 0.3 + 0.56 * tailSpread;
    const fanMid = ellipsoid(t, [-0.78, 0, -0.01], [0.5, fanW, 0.055]);
    let d = smin(a, fanMid, 0.26);
    for (const fy of [-0.66, -0.33, 0, 0.33, 0.66]) {
      const tipY = fy * (0.48 + 0.76 * tailSpread);
      const tipX = -1.2 + Math.abs(fy) * 0.14;
      const fd = capsuleFlat(
        t,
        [-0.22, fy * 0.14, 0.01],
        [tipX, tipY, -0.02],
        0.095,
        0.065,
        2.6,
      );
      if (fd < d) d = smin(d, fd, 0.08);
    }
    return d;
  };

  const spread = clamp01(pose.wingSpread);
  const flap = pose.wingFlap;
  const fold = clamp01(pose.wingFold ?? 0);
  const sweep = Math.max(-1, Math.min(1, pose.wingSweep ?? 0));
  const smear = clamp01(pose.wingSmear ?? 0);
  const spreadWing = spread > 0.12;

  const cFoldY = Math.cos(0.12);
  const sFoldY = Math.sin(0.12);
  const cFoldZ = Math.cos(0.12);
  const sFoldZ = Math.sin(0.12);

  const wingAngle = 0.06 + 1.18 * flap;
  const wingPitch =
    -0.22 + 0.36 * Math.max(0, -flap) + 0.52 * Math.max(0, sweep) - 0.12 * fold;
  const wingYaw = -0.22 + 0.68 * sweep - 0.36 * fold;
  const spanScale = (0.45 + 0.85 * spread) * (1 - 0.24 * fold);
  const chordScale = 1 + 0.38 * smear;

  const sideCache = (side: number) => {
    const cFlap = Math.cos(-side * wingAngle);
    const sFlap = Math.sin(-side * wingAngle);
    const cYaw = Math.cos(-side * wingYaw);
    const sYaw = Math.sin(-side * wingYaw);
    const cPitch = Math.cos(wingPitch);
    const sPitch = Math.sin(wingPitch);
    const pivot: V3 = [
      0.24,
      side * (0.5 + 0.06 * ruffle - 0.05 * sleekWet),
      0.38,
    ];
    return { cFlap, sFlap, cYaw, sYaw, cPitch, sPitch, pivot };
  };
  const leftCache = sideCache(1);
  const rightCache = sideCache(-1);

  const wingFrame = (side: number, b: V3): V3 => {
    if (!spreadWing) {
      const fOff: V3 = [
        b[0] + 0.45,
        b[1] - side * (0.6 + 0.07 * ruffle - 0.07 * sleekWet),
        b[2] - 0.2,
      ];
      return rotZ(rotY(fOff, cFoldY, sFoldY), cFoldZ, side * sFoldZ);
    }
    const sc = side > 0 ? leftCache : rightCache;
    let o: V3 = [b[0] - sc.pivot[0], b[1] - sc.pivot[1], b[2] - sc.pivot[2]];
    o = rotX(o, sc.cFlap, sc.sFlap);
    o = rotZ(o, sc.cYaw, sc.sYaw);
    o = rotY(o, sc.cPitch, sc.sPitch);
    return [o[0], side * o[1], o[2]];
  };

  const wingToBody = (side: number, w: V3): V3 => {
    if (!spreadWing) {
      const unZ = rotZ(w, cFoldZ, -side * sFoldZ);
      const unY = rotY(unZ, cFoldY, -sFoldY);
      return [
        unY[0] - 0.45,
        unY[1] + side * (0.6 + 0.07 * ruffle - 0.07 * sleekWet),
        unY[2] + 0.2,
      ];
    }
    const sc = side > 0 ? leftCache : rightCache;
    let o: V3 = [w[0], side * w[1], w[2]];
    o = rotY(o, sc.cPitch, -sc.sPitch);
    o = rotZ(o, sc.cYaw, -sc.sYaw);
    o = rotX(o, sc.cFlap, -sc.sFlap);
    return [o[0] + sc.pivot[0], o[1] + sc.pivot[1], o[2] + sc.pivot[2]];
  };

  const primarySpecs: readonly [number, number, number, number, number][] = [
    [2.05, 0.16, 0.04, 0.145, 0.066],
    [1.94, -0.05, 0.01, 0.15, 0.066],
    [1.76, -0.26, -0.02, 0.155, 0.068],
    [1.54, -0.44, -0.04, 0.16, 0.07],
    [1.28, -0.58, -0.05, 0.165, 0.072],
  ];

  const wing = (side: number) => (p: V3) => {
    const b = toBody(p);
    const w = wingFrame(side, b);
    if (!spreadWing) {
      const s = spread / 0.12;
      const ra: V3 = [
        0.88 - 0.04 * sleekWet,
        0.13 + 0.02 * ruffle,
        0.5 - 0.04 * sleekWet,
      ];
      const rb: V3 = [0.5, 0.09, 0.22];
      const d = smin(
        ellipsoid(w, [0, 0, 0], ra),
        ellipsoid(w, [-0.72, side * -0.1, -0.04], rb),
        0.3,
      );
      return d - 0.015 * s;
    }
    const u = w[1] / spanScale;
    const foldBend = u > 0.7 ? (u - 0.7) * fold : 0;
    const vRaw = w[0] + foldBend * 0.65;
    const v = vRaw / chordScale;
    const camber = -0.14 * Math.max(0, Math.min(1, u / 1.9)) * (1 - 0.4 * fold);
    const z = w[2] - camber - foldBend * 0.2;

    const uDist = u < -0.35 ? -0.35 - u : u > 2.4 ? u - 2.4 : 0;
    const vDist = v < -1.15 ? -1.15 - v : v > 0.8 ? v - 0.8 : 0;
    if (uDist > 0.35 || vDist > 0.35 || Math.abs(z) > 0.45) {
      return Math.hypot(uDist, vDist, z) * Math.min(1, spanScale);
    }

    const q: V3 = [v, u, z];
    const arm = ellipsoid(q, [0.08, 0.6, 0.01], [0.48, 0.72, 0.09]);
    const sec = ellipsoid(q, [-0.28, 0.76, -0.02], [0.46, 0.72, 0.072]);
    let d = smin(arm, sec, 0.22);

    const lead = capsuleFlat(
      q,
      [0.26, 0.04, 0.02],
      [0.34 - 0.18 * fold, 1.08, 0.04],
      0.12,
      0.085,
      1.7,
    );
    d = smin(d, lead, 0.14);

    for (let i = 0; i < primarySpecs.length; i++) {
      const [pu, pv, pz, ra, rb] = primarySpecs[i];
      const smearTip = smear * (0.2 + 0.24 * (1 - i / primarySpecs.length));
      const fd = capsuleFlat(
        q,
        [0.08 - i * 0.09, 0.8 - i * 0.04, 0.01],
        [pv - smearTip, pu, pz],
        ra,
        rb,
        1.65,
      );
      d = smin(d, fd, 0.085);
    }
    return d * Math.min(1, spanScale);
  };

  const wingCenter = (side: number): V3 => {
    if (!spreadWing) {
      return fromBody([-0.55, side * (0.62 + 0.06 * ruffle), 0.12]);
    }
    return fromBody(wingToBody(side, [-0.14, 1.08 * spanScale, 0.0]));
  };

  return {
    toBody,
    fromBody,
    toHead,
    fromHead,
    bodyHead,
    headness,
    beak,
    tail,
    wing,
    wingFrame,
    wingToBody,
    wingCenter,
    scaleBody: puffScale,
    headScale,
    sleekWet,
    ruffle,
    spreadWing,
    spanScale,
  };
};

export const sparrowPlumageField = (pose: Pose) => rig(pose).bodyHead;

const segmentDistance = (p: V3, a: V3, b: V3) => {
  const ba = sub(b, a);
  const pa = sub(p, a);
  const h = Math.min(1, Math.max(0, dot(pa, ba) / dot(ba, ba)));
  const d = sub(pa, [ba[0] * h, ba[1] * h, ba[2] * h]);
  return Math.sqrt(dot(d, d));
};

const loopsOf = (
  values: Float32Array,
  s: Sampled,
  spacing: number,
  minArea: number,
  seed: number,
  amp: number,
) =>
  contours(values, s.grid)
    .map((loop) => resample(smooth(loop, 2), spacing))
    .filter((loop) => Math.abs(loopArea(loop)) >= minArea)
    .map((loop) => boil(loop, seed, amp));

const softContour = (
  loop: Point[],
  faceWeight: (p: Point) => number,
  ppu: number,
  puff: number,
  ruffle: number,
  seed: number,
): Point[] => {
  const ampBase = ppu * (0.022 * puff + 0.014 * ruffle + 0.007);
  if (ampBase < 0.25) return loop;
  const n = loop.length;
  const flip = loopArea(loop) < 0 ? -1 : 1;
  const period = ppu * (ppu > 60 ? 0.1 : 0.24);
  let s = 0;
  let clumpStart = 0;
  let clump = 0;
  let clumpLen = period * (0.75 + 0.55 * hash(seed, 0));
  let clumpAmp = 0.6 + 0.75 * hash(seed, 1);
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p = loop[i];
    const prev = loop[(i - 1 + n) % n];
    const next = loop[(i + 1) % n];
    if (i > 0) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    while (s - clumpStart > clumpLen) {
      clumpStart += clumpLen;
      clump++;
      clumpLen = period * (0.75 + 0.55 * hash(seed, clump * 2));
      clumpAmp = 0.55 + 0.85 * hash(seed, clump * 2 + 1);
    }
    const u = (s - clumpStart) / clumpLen;
    const shape = ppu > 60
      ? 1.8 * (u < 0.77 ? u / 0.77 : (1 - u) / 0.23) ** 1.6
      : Math.sqrt(Math.max(0, Math.sin(Math.PI * u)));
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const l = Math.hypot(tx, ty) || 1;
    const nx = (ty / l) * flip;
    const ny = (-tx / l) * flip;
    const nap = ppu > 60 ? shape * (0.3 + 0.38 * hash(seed, clump, 8)) - 0.65 : shape - 0.35;
    const d = ampBase * faceWeight(p) * clumpAmp * nap;
    out.push([p[0] + nx * d, p[1] + ny * d]);
  }
  return out;
};

const ellipseOnSurface = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  a: Point,
  b: Point,
  draw: () => void,
) => {
  ctx.save();
  ctx.transform(a[0], a[1], b[0], b[1], center[0], center[1]);
  draw();
  ctx.restore();
};

const resolvePalette = (lighting: Lighting, wetness: number): SparrowPalette => {
  if (lighting.palette) return lighting.palette;
  if (lighting.preset) {
    const a = paletteForLight(lighting.preset, wetness);
    if (lighting.blend) {
      const b = paletteForLight(lighting.blend.to, wetness);
      return mixSparrowPalette(a, b, lighting.blend.t);
    }
    return a;
  }
  return paletteForLight("dusk", wetness);
};

const tintTone = (base: Tone, l: Lighting): Tone => ({
  lit: l.litTint ? mixHex(base.lit, l.litTint.color, l.litTint.amount) : base.lit,
  shade: l.shadeTint
    ? mixHex(base.shade, l.shadeTint.color, l.shadeTint.amount)
    : base.shade,
});

export const drawApproachingBody = (ctx: CanvasRenderingContext2D, view: SparrowView, pose: Pose) => {
  const p = resolvePalette(view.lighting, pose.wet);
  const shape = (path: string, color: string) => {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(path));
  };
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.rotate((view.roll ?? 0) - 0.04 * pose.wingFlap);
  const bodyScale = view.ppu / 66;
  ctx.scale(bodyScale, bodyScale);
  shape("M-37,-10 Q-66,15 -89,51 Q-78,55 -58,40 L-65,52 Q-32,40 -17,17 Z", p.streak.shade);
  shape("M-41,-24 C-78,-6 -78,33 -51,46 C-32,56 -7,42 11,30 C38,17 57,-12 56,-48 C47,-83 -10,-74 -41,-24Z", p.mantle.shade);
  const breast = new Path2D("M-36,-53 C-61,-35 -66,-5 -61,16 Q-65,21 -60,27 Q-57,25 -55,26 C-46,49 -17,49 6,36 Q27,26 39,9 Q49,1 53,-13 L51,-11 C65,-38 55,-60 37,-72Z");
  ctx.fillStyle = p.belly.shade;
  ctx.fill(breast);
  ctx.save();
  ctx.clip(breast);
  shape("M-59,-63 Q-70,-26 -58,-17 L-55,-22 Q-48,-8 -44,-11 Q-45,3 -38,4 L-39,-1 Q-26,21 -5,22 L-9,19 Q15,29 41,4 L62,-16 80,-80Z", p.belly.lit);
  for (let i = 0; i < 22; i++) {
    const x = -48 + hash(i, 180) * 93;
    const y = -18 + hash(i, 203) * 55;
    ctx.fillStyle = i % 3 ? p.belly.shade : p.cheek.lit;
    ctx.globalAlpha = 0.23;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 1, y + 3.6, x - 4.6, y + 7.4);
    ctx.quadraticCurveTo(x - 0.5, y + 4, x, y);
    ctx.fill();
  }
  ctx.restore();
  shape("M-47,-52 C-51,-77 -39,-103 -15,-110 C13,-122 44,-115 57,-96 Q68,-81 61,-64 Q61,-42 41,-30 Q23,-20 3,-26 L7,-23 Q-22,-24 -37,-41 L-36,-36 Q-46,-41 -47,-52Z", p.cheek.shade);
  shape("M-38,-65 Q-35,-93 -8,-100 Q26,-110 53,-92 Q66,-78 57,-58 Q55,-41 37,-35 Q17,-26 -2,-31 L0,-28 Q-29,-33 -38,-51Z", p.cheek.lit);
  shape("M-47,-58 C-55,-88 -37,-111 -11,-117 C19,-125 51,-115 59,-96 L62,-84 Q52,-88 45,-88 Q32,-93 19,-88 L22,-91 Q4,-90 -5,-82 Q-18,-82 -26,-70 L-24,-77 Q-40,-67 -44,-52Z", p.crown.lit);
  shape("M-48,-59 Q-50,-87 -34,-100 Q-43,-81 -29,-84 L-32,-77 Q-21,-85 -10,-82 Q-32,-69 -40,-55 L-44,-49Z", p.crown.shade);
  shape("M-28,-58 Q-23,-65 -12,-61 Q-5,-56 -10,-47 Q-13,-42 -17,-44 L-20,-42 Q-34,-44 -28,-58Z", p.patch.lit);
  shape("M19,-54 Q29,-59 44,-58 Q49,-50 40,-41 L36,-35 Q28,-39 23,-45 L24,-41Z", p.patch.shade);
  shape("M-2,-81 Q6,-90 14,-82 Q18,-74 11,-69 Q2,-65 -4,-73Z", sparrowCommon.eye);
  shape("M44,-88 Q50,-93 53,-86 Q55,-80 49,-78 Q44,-79 44,-88Z", p.patch.shade);
  shape("M3,-80 Q4,-84 7,-83 Q10,-81 7,-78 Q4,-76 3,-80Z", sparrowCommon.glint);
  shape("M20,-73 Q31,-82 41,-79 L59,-68 Q53,-60 37,-55 Q28,-60 20,-73Z", p.beak.shade);
  shape("M20,-73 Q30,-83 42,-80 Q52,-75 59,-68 L38,-66Z", p.beak.lit);
  shape("M28,-76 Q35,-80 41,-78 L53,-71 Q40,-76 28,-76Z", mixHex(p.beak.lit, p.wingBar.lit, 0.48));
  if (view.lighting.rim) shape("M-6,-117 Q27,-129 52,-104 Q23,-124 -6,-117Z", view.lighting.rim.color);
  ctx.restore();
};

export const drawSparrow = (
  target: CanvasRenderingContext2D,
  view: SparrowView,
  pose: Pose,
) => {
  const seed = view.seed ?? 152;
  const r = rig(pose);
  const basis: Basis = viewBasis(view.yaw, view.pitch, view.roll ?? 0);
  const L = normalize(view.lighting.direction);
  const threshold = view.lighting.threshold ?? 0.06;
  const ppu = view.ppu;
  const near = ppu > 60;
  const featherBreak = (p: V3) => {
    if (!near) return 0;
    const along = p[0] * 6 + p[2] * 3;
    const across = p[1] * 24 + p[2] * 18 - p[0] * 11;
    return 0.06 * Math.sin(along + 1.6 * Math.sin(across)) + 0.024 * Math.sin(2.2 * across + along);
  };
  const cell = Math.min(6, Math.max(1.3, ppu * 0.048));
  const spacing = Math.max(1.3, Math.min(3.2, ppu * 0.022));
  const drawingSeed = Math.floor(hash(seed, view.drawing) * 1e6);
  const boilAmp =
    ink.boilMinPx + (ink.boilMaxPx - ink.boilMinPx) * hash(seed, view.drawing, 3);
  const light2d: Point = (() => {
    const l = Math.hypot(L[0], L[1]) || 1;
    return [L[0] / l, L[1] / l];
  })();
  const lineBase = Math.max(ink.minPx, Math.min(ink.maxPx, 1.7 + ppu * 0.011));
  const style = (k: number, base = lineBase): StrokeStyle => ({
    seed: drawingSeed + k * 7919,
    base,
    min: ink.minPx * 0.85,
    max: ink.maxPx,
    light: light2d,
    breakEvery: [ppu * 1.1, ppu * 2.6],
    cornerAngle: 0.9,
    gap: [-1.5, 1.4],
    litThin: 0.72,
    dropLit: 0.15,
    minLength: Math.max(10, ppu * 0.22),
  });
  const screen = (p: V3): Point => {
    const v = toView(basis, p);
    return [view.x + v[0] * ppu, view.y + v[1] * ppu];
  };
  const depthOf = (p: V3) => toView(basis, p)[2];
  const vec = (p: V3): Point => {
    const v = toView(basis, p);
    return [v[0] * ppu, v[1] * ppu];
  };
  const shadowField = (s: Sampled, bias = 0) =>
    field(s, (p, n) => {
      const d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
      const wave = (noise1(p[0] * 2.3 + p[2] * 1.7, seed + 7) - 0.5) * 0.16;
      return d - threshold - bias + wave + featherBreak(p) * 0.65;
    });
  const rimMode = view.lighting.rim?.mode ?? "back";
  const rimField = (s: Sampled) =>
    field(
      s,
      (_, n) => {
        if (rimMode === "top") {
          return -Math.min(-n[1] - 0.52, 0.36 - Math.abs(n[2]));
        }
        const facing =
          (n[0] * L[0] + n[1] * L[1]) / (Math.hypot(L[0], L[1]) || 1);
        return -Math.min(facing - 0.3, 0.4 - Math.abs(n[2]));
      },
      1e3,
    );
  const minArea = Math.max(4, ppu * ppu * 0.002);
  const activePalette = resolvePalette(view.lighting, pose.wet);
  const T = (t: Tone) => tintTone(t, view.lighting);

  const sampleOpts = (
    center: V3,
    radius: number,
    round?: { center: (p: V3) => V3; amount: number },
  ) => ({
    originX: view.x,
    originY: view.y,
    ppu,
    basis,
    center,
    radius,
    cell,
    roundness: round,
  });

  type Built = {
    depth: number;
    part: CelPart;
    after?: (ctx: CanvasRenderingContext2D) => void;
  };
  const parts: Built[] = [];

  const bodyCenter = r.fromBody([0.15, 0, 0.25]);
  const headCenterStage = r.fromBody(r.fromHead(HEAD));
  const bodyRound = r.fromBody([0.05, 0, 0.0]);
  const sBody = sample(
    r.bodyHead,
    sampleOpts(bodyCenter, 2.48 * Math.max(1, r.scaleBody), {
      center: (p) => {
        const t = Math.min(1, Math.max(0, 0.5 - r.headness(p) * 4));
        return [
          bodyRound[0] + (headCenterStage[0] - bodyRound[0]) * t,
          bodyRound[1] + (headCenterStage[1] - bodyRound[1]) * t,
          bodyRound[2] + (headCenterStage[2] - bodyRound[2]) * t,
        ];
      },
      amount: 0.5,
    }),
  );

  {
    const sil = loopsOf(sBody.silhouette, sBody, spacing, minArea, drawingSeed, boilAmp);
    const beakDir = vec(
      sub(r.fromBody(r.fromHead([1.7, 0, 0.7])), headCenterStage),
    );
    const hc = screen(headCenterStage);
    const bl = Math.hypot(beakDir[0], beakDir[1]) || 1;
    const faceWeight = (p: Point) => {
      const toP: Point = [p[0] - hc[0], p[1] - hc[1]];
      const pl = Math.hypot(toP[0], toP[1]) || 1;
      const facing = (toP[0] * beakDir[0] + toP[1] * beakDir[1]) / (bl * pl);
      const fx = (p[0] - view.x) / ppu;
      const fy = (p[1] - view.y) / ppu;
      return (
        Math.max(0, Math.min(1, 1.18 - Math.max(0, facing) * 1.65)) *
        (0.65 + 0.35 * noise1(fx * 3 + fy * 5, seed))
      );
    };

    const tufted = sil.map((loop, k) =>
      softContour(loop, faceWeight, ppu, pose.puff, r.ruffle, seed + k * 17),
    );
    const totalBodyArea = tufted.reduce((sum, lp) => sum + Math.abs(loopArea(lp)), 0);

    const hs = r.headScale;
    const headLocal = (p: V3): V3 => {
      const d = sub(r.toHead(r.toBody(p)), HEAD);
      return [d[0] / hs[0], d[1] / hs[1], d[2] / hs[2]];
    };
    const headBias = 0.04 + 0.62 * r.ruffle;
    const headMask = (p: V3) => {
      const q = headLocal(p);
      const sphereGate = Math.hypot(q[0] / 0.88, q[1] / 0.84, q[2] / 0.82) - 1;
      const neck = r.headness(p) * 3 - headBias;
      return neck + r.ruffle * Math.min(0, sphereGate * 2.2 - neck) + featherBreak(q) * 2;
    };
    const headF = field(sBody, (p) => headMask(p));
    const gate = (p: V3, m: number) => Math.max(m, headMask(p) - 0.06);
    const cap = field(sBody, (p) => {
      const q = headLocal(p);
      const zb = 0.05 + 0.13 * (q[0] / 0.72) + 0.03 * Math.sin(q[1] * 9);
      return gate(p, zb - q[2] + featherBreak(q) * 0.65);
    });
    const spot = field(sBody, (p) => {
      const q = headLocal(p);
      const side = q[1] >= 0 ? 1 : -1;
      const cy = side * (0.6 + 0.18 * r.ruffle);
      const c: V3 = [-0.06, cy, -0.14];
      const d =
        Math.hypot(q[0] - c[0], (q[1] - c[1]) * 0.35, (q[2] - c[2]) * 0.95) -
        0.172;
      return Math.max(d + featherBreak(q) * 0.16, 0.34 - Math.abs(q[1]));
    });
    const bib = field(sBody, (p) => {
      const q = headLocal(p);
      const zc = -0.3;
      const width =
        0.23 * (1 - 0.3 * Math.max(0, Math.min(1, (q[2] - zc) / 0.16)));
      const m = Math.hypot(q[1] / width, (q[2] - zc) / 0.15) - 1;
      return Math.max(m, 0.22 - q[0]);
    });
    const lore = field(sBody, (p) => {
      const q = headLocal(p);
      const side = q[1] >= 0 ? 1 : -1;
      return gate(
        p,
        segmentDistance(q, [0.6, side * 0.2, -0.02], [0.33, side * 0.5, 0.06]) -
          0.055,
      );
    });
    const back = field(sBody, (p) => {
      const b = r.toBody(p);
      const n = normalize(sub(b, [0, 0, -0.05]));
      const m =
        0.12 - (n[2] - 0.62 * n[0]) + 0.04 * Math.sin(b[1] * 7 + b[0] * 3);
      return Math.max(m + featherBreak(b), -headMask(p));
    });
    const streakCenters: [V3, V3][] = [
      [
        [-0.15, 0.22, 0.9],
        [0.42, 0.07, 0.2],
      ],
      [
        [-0.2, -0.24, 0.88],
        [0.4, 0.07, 0.2],
      ],
      [
        [-0.62, 0.3, 0.68],
        [0.36, 0.06, 0.2],
      ],
      [
        [-0.66, -0.32, 0.66],
        [0.34, 0.06, 0.2],
      ],
      [
        [0.08, 0.02, 0.98],
        [0.3, 0.06, 0.18],
      ],
    ];
    const streaks = field(sBody, (p) => {
      const b = r.toBody(p);
      const bs = r.scaleBody;
      const bx = b[0] / bs;
      const by = b[1] / bs;
      const bz = b[2] / bs;
      let m = Infinity;
      for (const [c, rad] of streakCenters) {
        const d =
          Math.hypot(
            (bx - c[0]) / rad[0],
            (by - c[1]) / rad[1],
            (bz - c[2]) / rad[2],
          ) - 1;
        if (d < m) m = d;
      }
      return Math.max(m * 0.3, -headMask(p));
    });
    const isSil = Boolean(view.silhouetteOnly);
    const shadow = isSil
      ? []
      : loopsOf(shadowField(sBody), sBody, spacing, minArea, drawingSeed, boilAmp);
    const rimLoops =
      !isSil && view.lighting.rim
        ? loopsOf(rimField(sBody), sBody, spacing, minArea * 0.3, drawingSeed, boilAmp)
        : [];
    const lines = tufted.reduce<Stroke[]>(
      (all, loop, k) => all.concat(strokes(loop, true, style(k))),
      [],
    );
    const regions = isSil
      ? []
      : [
          {
            loops: loopsOf(back, sBody, spacing, minArea, drawingSeed, boilAmp),
            tone: T(activePalette.mantle),
          },
          {
            loops: loopsOf(streaks, sBody, spacing, minArea * 0.3, drawingSeed, boilAmp),
            tone: T(activePalette.streak),
          },
          {
            loops: loopsOf(headF, sBody, spacing, minArea, drawingSeed, boilAmp),
            tone: T(activePalette.cheek),
          },
          {
            loops: loopsOf(cap, sBody, spacing, minArea, drawingSeed, boilAmp),
            tone: T(activePalette.crown),
          },
          {
            loops: loopsOf(spot, sBody, spacing, minArea * 0.22, drawingSeed, boilAmp),
            tone: T(activePalette.patch),
          },
          {
            loops: loopsOf(bib, sBody, spacing, minArea * 0.22, drawingSeed, boilAmp),
            tone: T(activePalette.patch),
          },
          {
            loops: loopsOf(lore, sBody, spacing, minArea * 0.18, drawingSeed, boilAmp),
            tone: T(activePalette.patch),
          },
        ];

    parts.push({
      depth: depthOf(bodyCenter),
      part: {
        silhouette: tufted,
        base: T(activePalette.belly),
        regions,
        shadow,
        rim: view.lighting.rim
          ? {
              loops: rimLoops,
              color: view.lighting.rim.color,
              alpha: view.lighting.rim.alpha,
            }
          : undefined,
        lines,
        lineColor: ink.color,
      },
      after: (ctx) => {
        ctx.save();
        tracePath(ctx, tufted);
        ctx.clip("evenodd");

        if (near) {
          for (let k = 0; k < 380; k++) {
            const angle = hash(180, k, 1) * 2 * Math.PI;
            const h = 2 * hash(180, k, 2) - 1;
            const ring = Math.sqrt(1 - h * h);
            const local: V3 = [0.22 + 0.98 * ring * Math.cos(angle) * r.scaleBody,
              0.91 * ring * Math.sin(angle) * r.scaleBody, -0.02 + h * 0.96 * r.scaleBody];
            const point = r.fromBody(local);
            const normal = normalize(sub(point, r.fromBody([0.22, 0, -0.02])));
            const n = toView(basis, normal);
            if (n[2] > -0.06 || r.headness(point) < 0.06) continue;
            const p = screen(point);
            const tailward = 0.034 + 0.096 * hash(180, k, 3);
            const length = tailward * (1 + 0.4 * r.sleekWet);
            const tip = screen(r.fromBody([local[0] - length * (0.7 + h * 0.35), local[1], local[2] - length * (0.78 - h * 0.6)]));
            const width = ppu * (0.004 + 0.014 * hash(180, k, 4));
            const tone = local[2] - 0.62 * local[0] > 0.12 ? activePalette.mantle : activePalette.belly;
            ctx.save();
            ctx.globalAlpha *= 0.14 + hash(180, k, 5) * 0.22;
            ctx.fillStyle = dot(n, L) > threshold ? tone.shade : tone.lit;
            ctx.beginPath();ctx.moveTo(...p);
            ctx.quadraticCurveTo(tip[0] + width, tip[1] - width, tip[0], tip[1]);
            ctx.quadraticCurveTo(tip[0] - width, tip[1] - width, p[0], p[1]);ctx.fill();
            ctx.restore();
          }
        }

        if (r.sleekWet > 0) {
          ctx.save();
          ctx.globalAlpha *= Math.min(1, r.sleekWet / 0.2);
          const clumpSeeds: [V3, V3, string][] = [
            [
              [0.24, 0.48, -0.34],
              [-0.08, 0.47, -0.76],
              T(activePalette.belly).shade,
            ],
            [
              [0.24, -0.48, -0.34],
              [-0.08, -0.47, -0.76],
              T(activePalette.belly).shade,
            ],
            [
              [-0.18, 0.44, -0.32],
              [-0.5, 0.42, -0.68],
              T(activePalette.belly).shade,
            ],
            [
              [-0.18, -0.44, -0.32],
              [-0.5, -0.42, -0.68],
              T(activePalette.belly).shade,
            ],
            [
              [-0.14, 0.34, 0.62],
              [-0.58, 0.34, 0.14],
              T(activePalette.mantle).shade,
            ],
            [
              [-0.14, -0.34, 0.62],
              [-0.58, -0.34, 0.14],
              T(activePalette.mantle).shade,
            ],
            [
              [0.54, 0.3, 0.96],
              [0.24, 0.38, 0.58],
              T(activePalette.crown).shade,
            ],
            [
              [0.54, -0.3, 0.96],
              [0.24, -0.38, 0.58],
              T(activePalette.crown).shade,
            ],
          ];
          for (let ci = 0; ci < clumpSeeds.length; ci++) {
            const [aB, bB, col] = clumpSeeds[ci];
            const midB = mixV(aB, bB, 0.5);
            const nLocal = normalize(sub(midB, [0.1, 0, 0.15]));
            const nStage = normalize(
              sub(r.fromBody(add(midB, nLocal)), r.fromBody(midB)),
            );
            if (-toView(basis, nStage)[2] < 0.14) continue;
            const pts: Point[] = [];
            for (let j = 0; j <= 5; j++) {
              const t = j / 5;
              const bend = Math.sin(Math.PI * t) * 0.05;
              pts.push(
                screen(
                  r.fromBody([
                    aB[0] + (bB[0] - aB[0]) * t - bend,
                    aB[1] + (bB[1] - aB[1]) * t,
                    aB[2] + (bB[2] - aB[2]) * t,
                  ]),
                ),
              );
            }
            const boiled = boil(
              resample(pts, spacing, false),
              drawingSeed + 410 + ci,
              boilAmp,
            );
            drawStrokes(
              ctx,
              strokes(boiled, false, {
                ...style(410 + ci, Math.max(1.2, ppu * 0.025 * r.sleekWet)),
                min: 0.8,
                max: Math.max(1.8, ppu * 0.04),
                breakEvery: [1e4, 1e4],
                dropLit: 0,
                litThin: 0.9,
                minLength: 4,
              }),
              col,
            );
          }

          const sheenBudget = totalBodyArea * 0.014 * r.sleekWet;
          let sheenUsed = 0;
          const sheenArcs: [V3, V3, V3, boolean][] = [
            [
              add(HEAD, [0.22 * hs[0], 0.14 * hs[1], 0.54 * hs[2]]),
              add(HEAD, [-0.06 * hs[0], 0.18 * hs[1], 0.57 * hs[2]]),
              add(HEAD, [-0.34 * hs[0], 0.14 * hs[1], 0.48 * hs[2]]),
              true,
            ],
            [
              add(HEAD, [0.16 * hs[0], -0.2 * hs[1], 0.53 * hs[2]]),
              add(HEAD, [-0.14 * hs[0], -0.24 * hs[1], 0.54 * hs[2]]),
              add(HEAD, [-0.36 * hs[0], -0.2 * hs[1], 0.44 * hs[2]]),
              true,
            ],
            [
              [0.16, 0.22, 0.78],
              [-0.14, 0.26, 0.76],
              [-0.44, 0.22, 0.64],
              false,
            ],
            [
              [0.06, -0.26, 0.75],
              [-0.24, -0.28, 0.72],
              [-0.5, -0.22, 0.58],
              false,
            ],
          ];
          for (let si = 0; si < sheenArcs.length; si++) {
            const [p0, p1, p2, isHead] = sheenArcs[si];
            const toSt = (q: V3) =>
              isHead ? r.fromBody(r.fromHead(q)) : r.fromBody(q);
            const midSt = toSt(p1);
            const nBase = isHead ? HEAD : ([0, 0, 0] as V3);
            const nL = normalize(sub(p1, nBase));
            const nSt = normalize(sub(toSt(add(p1, nL)), midSt));
            const nV = toView(basis, nSt);
            const litDot = nV[0] * L[0] + nV[1] * L[1] + nV[2] * L[2];
            if (-nV[2] < 0.18 || litDot < -0.15) continue;
            const pts: Point[] = [];
            let arcLen = 0;
            for (let j = 0; j <= 6; j++) {
              const t = j / 6;
              const mt = 1 - t;
              const q: V3 = [
                mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
                mt * mt * p0[2] + 2 * mt * t * p1[2] + t * t * p2[2],
              ];
              const pt = screen(toSt(q));
              if (j > 0)
                arcLen += Math.hypot(
                  pt[0] - pts[j - 1][0],
                  pt[1] - pts[j - 1][1],
                );
              pts.push(pt);
            }
            const maxW = Math.min(
              ppu * 0.026,
              (sheenBudget - sheenUsed) / Math.max(1, arcLen * 0.65),
            );
            if (maxW < 1.0 || sheenUsed >= sheenBudget) continue;
            sheenUsed += arcLen * maxW * 0.65;
            const boiled = boil(
              resample(pts, spacing, false),
              drawingSeed + 510 + si,
              boilAmp * 0.5,
            );
            drawStrokes(
              ctx,
              strokes(boiled, false, {
                ...style(510 + si, maxW),
                min: 0.6,
                max: maxW * 1.1,
                breakEvery: [1e4, 1e4],
                dropLit: 0,
                litThin: 1,
                minLength: 4,
              }),
              sparrowCommon.glint,
            );
          }
          ctx.restore();
        }

        if (r.ruffle > 0) {
          ctx.save();
          ctx.globalAlpha *= Math.min(1, r.ruffle / 0.35);
          const fluffs: [V3, V3][] = [
            [
              [0.36, 0.58, 0.12],
              [0.14, 0.72, -0.1],
            ],
            [
              [0.36, -0.58, 0.12],
              [0.14, -0.72, -0.1],
            ],
            [
              [-0.02, 0.72, -0.22],
              [-0.3, 0.7, -0.36],
            ],
            [
              [-0.02, -0.72, -0.22],
              [-0.3, -0.7, -0.36],
            ],
          ];
          for (let fi = 0; fi < fluffs.length; fi++) {
            const [aB, bB] = fluffs[fi];
            const midB = mixV(aB, bB, 0.5);
            const nL = normalize(sub(midB, [0, 0, 0]));
            const nSt = normalize(
              sub(r.fromBody(add(midB, nL)), r.fromBody(midB)),
            );
            if (-toView(basis, nSt)[2] < 0.25) continue;
            const aS = screen(r.fromBody(aB));
            const bS = screen(r.fromBody(bB));
            const mS: Point = [
              (aS[0] + bS[0]) * 0.5,
              (aS[1] + bS[1]) * 0.5 + ppu * 0.05 * r.ruffle,
            ];
            const pts = boil(
              resample([aS, mS, bS], spacing, false),
              drawingSeed + 620 + fi,
              boilAmp,
            );
            drawStrokes(
              ctx,
              strokes(pts, false, {
                ...style(620 + fi, lineBase * 0.62),
                breakEvery: [1e4, 1e4],
                dropLit: 0,
                minLength: 4,
              }),
              ink.color,
            );
          }
          ctx.restore();
        }

        const eyeLocal: V3 = [0.31 * hs[0], 0.5 * hs[1], 0.1 * hs[2]];
        for (const side of [1, -1]) {
          const eHead: V3 = add(HEAD, [
            eyeLocal[0],
            side * eyeLocal[1],
            eyeLocal[2],
          ]);
          const nHead = normalize([
            eyeLocal[0] * 0.8,
            side * eyeLocal[1],
            eyeLocal[2],
          ]);
          const toStage = (q: V3) => r.fromBody(r.fromHead(q));
          const eStage = toStage(eHead);
          const nStage = normalize(sub(toStage(add(eHead, nHead)), eStage));
          const nView = toView(basis, nStage);
          const facing = -nView[2];
          if (facing < 0.08) continue;
          const upHead = normalize(
            sub(
              [0, 0, 1],
              [nHead[0] * nHead[2], nHead[1] * nHead[2], nHead[2] * nHead[2]],
            ),
          );
          const fwdHead = normalize([
            nHead[1] * upHead[2] - nHead[2] * upHead[1],
            nHead[2] * upHead[0] - nHead[0] * upHead[2],
            nHead[0] * upHead[1] - nHead[1] * upHead[0],
          ]);
          const wideBoost =
            pose.eyeOpen > 1 ? 1 + Math.min(0.24, (pose.eyeOpen - 1) * 0.8) : 1;
          const radius =
            0.15 * (1 + 0.04 * pose.puff + 0.03 * r.ruffle) * wideBoost;
          const upS = vec(
            sub(
              toStage(
                add(eHead, [
                  upHead[0] * radius,
                  upHead[1] * radius,
                  upHead[2] * radius,
                ]),
              ),
              eStage,
            ),
          );
          const fwdS = vec(
            sub(
              toStage(
                add(eHead, [
                  fwdHead[0] * radius,
                  fwdHead[1] * radius,
                  fwdHead[2] * radius,
                ]),
              ),
              eStage,
            ),
          );
          const c = screen(eStage);
          const b = boil([c], drawingSeed + 31, boilAmp)[0];
          const openRaw = Math.max(0, Math.min(1.35, pose.eyeOpen));
          const open = Math.min(1, openRaw);
          ctx.save();
          if (openRaw > 0.12) {
            if (open < 0.78) {
              const radiusX = Math.hypot(...fwdS);
              const radiusY = Math.hypot(...upS);
              const lidAxis: Point = [Math.sign(fwdS[0]) * radiusX, fwdS[1] * 0.14];
              const lidUp: Point = [0, -radiusY];
              ellipseOnSurface(ctx, b, lidAxis, lidUp, () => {
                ctx.beginPath();
                ctx.moveTo(-1, 0);
                ctx.bezierCurveTo(-0.56, 0.24, 0.52, 0.28, 1, 0.06);
                ctx.bezierCurveTo(0.6, -open * 1.48, -0.5, -open * 1.6, -1, 0);
                ctx.closePath();
                ctx.fillStyle = sparrowCommon.eye;
                ctx.fill();
                ctx.clip();
                ctx.globalAlpha *= pose.glint ?? 0.52;
                ctx.beginPath();
                ctx.ellipse(0.28, -0.02, 0.16, 0.1, 0, 0, Math.PI * 2);
                ctx.fillStyle = sparrowCommon.glint;
                ctx.fill();
              });
            } else {
              ellipseOnSurface(ctx, b, fwdS, upS, () => {
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, Math.PI * 2);
                ctx.fillStyle = sparrowCommon.eye;
                ctx.fill();
              });
              const glintStrength =
                pose.glint !== undefined
                  ? clamp01(pose.glint)
                  : 0.7 + 0.3 * clamp01(pose.sparkle);
              if (glintStrength > 0.04) {
                const upLen = Math.hypot(upS[0], upS[1]);
                const fwdLen = Math.hypot(fwdS[0], fwdS[1]);
                const gScale =
                  (0.18 + 0.22 * glintStrength) * (openRaw > 1.06 ? 1.15 : 1);
                const gx = b[0] + light2d[0] * fwdLen * 0.28;
                const gy = b[1] + (light2d[1] - 0.24) * upLen * 0.3;
                const gr = Math.max(
                  1.1,
                  upLen * gScale * Math.min(1, facing * 1.4),
                );
                ctx.save();
                ctx.globalAlpha = 0.45 + 0.55 * glintStrength;
                ctx.fillStyle = sparrowCommon.glint;
                ctx.beginPath();
                ctx.arc(gx, gy, gr, 0, Math.PI * 2);
                ctx.fill();
                if (pose.sparkle > 0.05 || glintStrength > 0.88) {
                  const secStrength = Math.max(
                    pose.sparkle,
                    (glintStrength - 0.85) / 0.15,
                  );
                  const sr = gr * (0.42 + 0.38 * clamp01(secStrength));
                  ctx.beginPath();
                  ctx.arc(
                    b[0] - light2d[0] * gr * 1.25,
                    b[1] + gr * 1.15,
                    sr,
                    0,
                    Math.PI * 2,
                  );
                  ctx.fill();
                }
                ctx.restore();
              }
              const lid = strokes(
                Array.from({ length: 9 }, (_, k): Point => {
                  const a = Math.PI * (1.06 + (k / 8) * 0.88);
                  const radScale = openRaw > 1.06 ? 1.18 : 1.08;
                  return [
                    b[0] +
                      fwdS[0] * Math.cos(a) * radScale -
                      upS[0] * Math.sin(a) * radScale,
                    b[1] +
                      fwdS[1] * Math.cos(a) * radScale -
                      upS[1] * Math.sin(a) * radScale,
                  ];
                }),
                false,
                {
                  ...style(91, lineBase * (openRaw > 1.06 ? 1.15 : 0.9)),
                  breakEvery: [1e4, 1e4],
                  dropLit: 0,
                },
              );
              drawStrokes(ctx, lid, ink.color);
            }
          } else {
            const curve = pose.eyeClosedCurve;
            const relaxed = near && pose.wet < 1 && pose.crouch < 0.2;
            const pts = Array.from({ length: 9 }, (_, k): Point => {
              const t = k / 8 - 0.5;
              const bend = (1 - 4 * t * t) * curve * 0.45;
              return [
                b[0] + fwdS[0] * t * 2.5 + upS[0] * bend,
                b[1] + fwdS[1] * t * (relaxed ? 0.32 : 2.5) + upS[1] * bend,
              ];
            });
            const thick = Math.hypot(upS[0], upS[1]) * 0.6;
            const upN: Point = (() => {
              const l = Math.hypot(upS[0], upS[1]) || 1;
              return [upS[0] / l, upS[1] / l];
            })();
            const rim = (sign: number) =>
              pts.map((p, k): Point => {
                const t = k / 8 - 0.5;
                const h = (1 - 4 * t * t) * thick * 0.5 * sign;
                return [p[0] + upN[0] * h, p[1] + upN[1] * h];
              });
            const lens = [...rim(1), ...rim(-1).reverse()];
            ctx.beginPath();
            lens.forEach((p, k) =>
              k === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]),
            );
            ctx.closePath();
            ctx.fillStyle = sparrowCommon.eye;
            ctx.fill();
            drawStrokes(
              ctx,
              strokes(pts, false, {
                ...style(92, lineBase * 1.4),
                litThin: 1,
                breakEvery: [1e4, 1e4],
                dropLit: 0,
                minLength: 4,
              }),
              ink.color,
            );
          }
          ctx.restore();
        }
        ctx.restore();
      },
    });
  }

  const simplePart = (
    sdf: (p: V3) => number,
    center: V3,
    radius: number,
    base: Tone,
    k: number,
    extra?: (s: Sampled) => { loops: Point[][]; tone: Tone }[],
    innerLines?: () => Point[][],
    roundAmount = 0.2,
    afterDraw?: (ctx: CanvasRenderingContext2D) => void,
  ): Built => {
    const s = sample(
      sdf,
      sampleOpts(center, radius, { center: () => center, amount: roundAmount }),
    );
    const sil = loopsOf(s.silhouette, s, spacing, minArea * 0.16, drawingSeed + k, boilAmp);
    const isSil = Boolean(view.silhouetteOnly);
    const shadow = isSil
      ? []
      : loopsOf(shadowField(s), s, spacing, minArea * 0.16, drawingSeed + k, boilAmp);
    const rimLoops =
      !isSil && view.lighting.rim
        ? loopsOf(rimField(s), s, spacing, minArea * 0.16, drawingSeed + k, boilAmp)
        : [];
    let lines = sil.reduce<Stroke[]>(
      (all, loop, i) => all.concat(strokes(loop, true, style(k * 10 + i))),
      [],
    );
    if (!isSil && innerLines) {
      for (const line of innerLines()) {
        if (line.length < 2) continue;
        const pts = boil(resample(line, spacing, false), drawingSeed + k, boilAmp);
        lines = lines.concat(
          strokes(pts, false, {
            ...style(k * 10 + 5, lineBase * 0.72),
            breakEvery: [1e4, 1e4],
            dropLit: 0.15,
            minLength: 4,
          }),
        );
      }
    }
    return {
      depth: depthOf(center),
      part: {
        silhouette: sil,
        base: T(base),
        regions: !isSil && extra ? extra(s) : [],
        shadow,
        rim:
          !isSil && view.lighting.rim
            ? {
                loops: rimLoops,
                color: view.lighting.rim.color,
                alpha: view.lighting.rim.alpha,
              }
            : undefined,
        lines,
        lineColor: ink.color,
      },
      after: isSil ? undefined : afterDraw,
    };
  };

  const beakCenter = r.fromBody(
    r.fromHead([HEAD[0] + 0.73 * r.headScale[0], 0, HEAD[2] - 0.09 * r.headScale[2]]),
  );
  parts.push(
    simplePart(r.beak, beakCenter, 0.45, activePalette.beak, 2, undefined, () => {
      if (pose.beakOpen > 0.05) return [];
      const bx = HEAD[0] + 0.55 * r.headScale[0];
      const bz = HEAD[2] - 0.06 * r.headScale[2];
      const a = screen(r.fromBody(r.fromHead([bx + 0.02, 0, bz - 0.04])));
      const b = screen(r.fromBody(r.fromHead([bx + 0.36, 0, bz - 0.075])));
      const sideAxis = sub(
        r.fromBody(r.fromHead([0, 1, 0])),
        r.fromBody(r.fromHead([0, 0, 0])),
      );
      const facingSide = Math.abs(toView(basis, sideAxis)[2]);
      return facingSide > 0.35 ? [[a, b]] : [];
    }),
  );

  const tailSpread = clamp01(pose.tailSpread ?? 0);
  const tailCenter = r.fromBody([-1.55, 0, -0.32 + 0.3 * pose.tailLift]);
  parts.push(
    simplePart(
      r.tail,
      tailCenter,
      1.05 + 0.48 * tailSpread,
      activePalette.streak,
      3,
      undefined,
      () => {
        const lines: Point[][] = [];
        const ys =
          tailSpread > 0.25 ? [-0.42, -0.2, 0, 0.2, 0.42] : [-0.12, 0.12];
        const ta = -(0.18 - pose.tailLift);
        const cTa = Math.cos(ta);
        const sTa = Math.sin(ta);
        for (const y of ys) {
          const pts: Point[] = [];
          for (let i = 0; i <= 6; i++) {
            const t = i / 6;
            const ySpread = y * (1 + t * (0.5 + 1.2 * tailSpread));
            const tb = rotY(
              [-0.38 - (0.68 + 0.14 * tailSpread) * t, ySpread, 0.08 - 0.03 * t],
              cTa,
              sTa,
            );
            pts.push(screen(r.fromBody(add([-1.0, 0, -0.06], tb))));
          }
          lines.push(pts);
        }
        return lines;
      },
    ),
  );

  const smear = clamp01(pose.wingSmear ?? 0);
  const fold = clamp01(pose.wingFold ?? 0);
  const spanScale = r.spanScale;

  for (const side of [1, -1]) {
    const wc = r.wingCenter(side);
    const wingSdf = r.wing(side);
    const wingSmearAfter =
      smear > 0.15 && r.spreadWing
        ? (ctx: CanvasRenderingContext2D) => {
            const dirZ = pose.wingFlap < 0 ? 1 : -1;
            for (let k = 0; k < 3; k++) {
              const u = (1.15 + k * 0.38) * spanScale;
              const pts: Point[] = [];
              for (let i = 0; i <= 5; i++) {
                const t = i / 5;
                const wPos: V3 = [
                  -0.06 - 0.34 * t * smear,
                  u + 0.1 * Math.sin(t * Math.PI),
                  dirZ * (0.24 + 0.72 * t * smear),
                ];
                pts.push(screen(r.fromBody(r.wingToBody(side, wPos))));
              }
              const boiled = boil(
                resample(pts, 2.2, false),
                drawingSeed + 700 + side * 13 + k,
                boilAmp,
              );
              drawStrokes(
                ctx,
                strokes(boiled, false, {
                  ...style(700 + side * 7 + k, lineBase * (0.82 - k * 0.1)),
                  breakEvery: [1e4, 1e4],
                  dropLit: 0,
                  minLength: 4,
                }),
                ink.color,
              );
            }
          }
        : undefined;

    parts.push(
      simplePart(
        wingSdf,
        wc,
        r.spreadWing ? Math.max(2.35, 1.85 * spanScale + 0.55 * smear) : 1.35,
        activePalette.mantle,
        4 + (side > 0 ? 0 : 1),
        (s) => {
          const wingLocal = (p: V3) => r.wingFrame(side, r.toBody(p));
          if (!r.spreadWing && near) {
            const regions: CelPart["regions"] = [];
            const feather = (x: number, z: number, length: number, width: number, fall: number, color: Tone, edge: number) => {
              const vane = (inset: number) => Array.from({ length: 32 }, (_, k) => {
                const angle = (k / 32) * Math.PI * 2;
                const t = (1 - Math.cos(angle)) / 2;
                const breadth = Math.sin(angle) * width * (0.45 + 0.8 * t);
                const at = t * (1 - inset * (0.6 + 0.45 * Math.sin(angle)));
                return screen(r.fromBody(r.wingToBody(side, [
                  x - length * at, side * 0.12,
                  z - fall * at + 0.04 * Math.sin(at * Math.PI) + breadth * (1 - inset),
                ])));
              });
              regions.push({ loops: [vane(0)], tone: T({
                lit: mixHex(color.lit, activePalette.wingBar.lit, edge),
                shade: mixHex(color.shade, activePalette.wingBar.shade, edge),
              }) }, { loops: [vane(0.055)], tone: T(color) });
            };
            for (let k = 0; k < 6; k++) {
              feather(0.32 - k * 0.058, -0.28 + k * 0.12, 1.34 + k * 0.038, 0.115, 0.08 + k * 0.055, activePalette.streak, 0.38);
            }
            for (let k = 0; k < 6; k++) {
              feather(0.78 - k * 0.032, -0.14 + k * 0.1, 0.83 + k * 0.056 + 0.095 * hash(180,k), 0.11 + 0.03 * hash(k,4), 0.16 + k * 0.028, activePalette.mantle, 0.34);
            }
            for (let k = 0; k < 4; k++) {
              feather(0.8 - k * 0.07, 0.14 + k * 0.078, 0.48 + k * 0.06, 0.12, 0.14, activePalette.crown, 0.21);
            }
            return regions;
          }
          if (!r.spreadWing) {
            const bar = (v0: number, u0: number, u1: number) =>
              field(s, (p) => {
                const w = wingLocal(p);
                const u = w[0] / 0.88;
                const v = w[2] / 0.5;
                return (
                  Math.max(
                    Math.abs(v - (v0 + 0.22 * u)) - 0.075,
                    Math.abs(u - (u0 + u1) / 2) - (u1 - u0) / 2,
                  ) * 0.5
                );
              });
            const flight = field(s, (p) => {
              const w = wingLocal(p);
              return w[0] / 0.88 + 0.1 - 0.12 * (w[2] / 0.5);
            });
            const shoulder = field(s, (p) => {
              const w = wingLocal(p);
              return Math.hypot((w[0] - 0.5) / 0.48, (w[2] - 0.3) / 0.3) - 1;
            });
            return [
              {
                loops: loopsOf(flight, s, spacing, minArea * 0.3, drawingSeed, boilAmp),
                tone: T(activePalette.streak),
              },
              {
                loops: loopsOf(shoulder, s, spacing, minArea * 0.2, drawingSeed, boilAmp),
                tone: T(activePalette.crown),
              },
              {
                loops: loopsOf(bar(0.42, -0.05, 0.62), s, spacing, minArea * 0.05, drawingSeed, boilAmp),
                tone: T(activePalette.wingBar),
              },
              {
                loops: loopsOf(bar(0.12, -0.25, 0.4), s, spacing, minArea * 0.05, drawingSeed, boilAmp),
                tone: T(activePalette.wingBar),
              },
            ];
          }
          const primaries = field(s, (p) => {
            const w = wingLocal(p);
            const u = w[1] / spanScale;
            return 0.78 - u - w[0] * 0.55;
          });
          const coverts = field(s, (p) => {
            const w = wingLocal(p);
            const u = w[1] / spanScale;
            return Math.hypot((u - 0.48) / 0.54, (w[0] - 0.16) / 0.25) - 1;
          });
          const wingBarBand = field(s, (p) => {
            const w = wingLocal(p);
            const u = w[1] / spanScale;
            return (
              Math.max(
                Math.abs(w[0] - (0.02 - 0.09 * u)) - 0.055,
                Math.abs(u - 0.6) - 0.44,
              ) * 0.5
            );
          });
          return [
            {
              loops: loopsOf(primaries, s, spacing, minArea * 0.2, drawingSeed, boilAmp),
              tone: T(activePalette.streak),
            },
            {
              loops: loopsOf(coverts, s, spacing, minArea * 0.2, drawingSeed, boilAmp),
              tone: T(activePalette.crown),
            },
            {
              loops: loopsOf(wingBarBand, s, spacing, minArea * 0.06, drawingSeed, boilAmp),
              tone: T(activePalette.wingBar),
            },
          ];
        },
        () => {
          const lines: Point[][] = [];
          if (!r.spreadWing) {
            const sideFacing = toView(
              basis,
              sub(r.fromBody([0, side, 0]), r.fromBody([0, 0, 0])),
            )[2];
            if (sideFacing > -0.2 || near) return [];
            for (let f = 0; f < 4; f++) {
              const pts: Point[] = [];
              const v0 = -0.5 + f * 0.22;
              for (let i = 0; i <= 5; i++) {
                const t = i / 5;
                const u = -0.12 - 0.9 * t;
                const wl: V3 = [u * 0.88, side * 0.14, (v0 + 0.1 * t) * 0.5];
                pts.push(screen(r.fromBody(r.wingToBody(side, wl))));
              }
              lines.push(pts);
            }
            return lines;
          }
          const featherTips: [number, number][] = [
            [1.92, 0.12],
            [1.82, -0.07],
            [1.64, -0.26],
            [1.42, -0.43],
            [1.16, -0.54],
          ];
          for (let f = 0; f < featherTips.length; f++) {
            const [tu, tv] = featherTips[f];
            const pts: Point[] = [];
            for (let i = 0; i <= 4; i++) {
              const t = i / 4;
              const u = (0.72 + (tu - 0.72) * t) * spanScale;
              const foldShift =
                u / spanScale > 0.7 ? (u / spanScale - 0.7) * fold * 0.58 : 0;
              const v = (0.04 - f * 0.06) * (1 - t) + tv * t - foldShift;
              pts.push(screen(r.fromBody(r.wingToBody(side, [v, u, 0.03]))));
            }
            lines.push(pts);
          }
          return lines;
        },
        0.15,
        wingSmearAfter,
      ),
    );
  }

  const order = parts.slice().sort((a, b) => b.depth - a.depth);
  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const b of order)
    for (const loop of b.part.silhouette)
      for (const p of loop) {
        bounds.x0 = Math.min(bounds.x0, p[0]);
        bounds.y0 = Math.min(bounds.y0, p[1]);
        bounds.x1 = Math.max(bounds.x1, p[0]);
        bounds.y1 = Math.max(bounds.y1, p[1]);
      }
  const footY = screen([0, 0, FOOT_Z])[1];
  const legReach = pose.legReach ?? 0;
  bounds.y1 = Math.max(
    bounds.y1,
    footY + ppu * (0.35 + 0.35 * Math.abs(legReach)),
  );
  const smearPad = smear > 0 ? ppu * 0.8 * smear : 0;
  const pad = Math.max(12, Math.ceil(smearPad) + 10);
  const layer = createLayer(
    bounds.x0 - pad,
    bounds.y0 - pad,
    bounds.x1 - bounds.x0 + 2 * pad,
    bounds.y1 - bounds.y0 + 2 * pad,
    ink.supersample,
  );

  if (pose.legs) {
    drawLegs(
      layer.ctx,
      pose,
      r,
      screen,
      style,
      lineBase,
      T(activePalette.foot),
      drawingSeed,
      boilAmp,
    );
  }
  for (const b of order) {
    drawCel(layer.ctx, b.part);
    if (b.after) b.after(layer.ctx);
  }

  if (view.silhouetteOnly) {
    layer.ctx.save();
    layer.ctx.setTransform(1, 0, 0, 1, 0, 0);
    layer.ctx.globalCompositeOperation = "source-in";
    layer.ctx.fillStyle = view.silhouetteOnly;
    layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.restore();
  }

  placeLayer(target, layer);
};

const drawLegs = (
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  r: Rig,
  screen: (p: V3) => Point,
  style: (k: number, base?: number) => StrokeStyle,
  lineBase: number,
  foot: Tone,
  seed: number,
  amp: number,
) => {
  const reach = pose.legReach ?? 0;
  const extend = clamp01(pose.legExtend ?? 0);
  const toeSpread = clamp01(pose.toeSpread ?? 0);
  const perched = Math.abs(reach) < 0.05 && extend < 0.05 && pose.lift < 0.05;

  for (const side of [1, -1]) {
    const hip = r.fromBody([0.12, side * 0.3, -0.62]);
    const footAnchorX = perched ? 0.08 : hip[0] + reach * 0.92;
    const footAnchorZ = perched
      ? FOOT_Z
      : FOOT_Z +
        pose.lift -
        0.14 * extend +
        Math.max(0, reach) * 0.18 +
        (1 - extend) * 0.18;
    const kneeBendX = perched
      ? -0.1 * pose.crouch
      : -0.16 * (1 - extend) + (reach < 0 ? 0.12 : -0.08);
    const ankle: V3 = [
      (hip[0] + footAnchorX) * 0.5 + kneeBendX + 0.04,
      side * (0.32 + 0.05 * toeSpread),
      (hip[2] + footAnchorZ) * 0.5 - 0.04 + 0.06 * extend,
    ];
    const footPos: V3 = [
      footAnchorX,
      side * (0.33 + 0.07 * toeSpread),
      footAnchorZ,
    ];
    const toeDip = perched ? -0.02 : -0.1 * (1 - toeSpread);
    const toeFwd: V3 = [
      footPos[0] + 0.32 + 0.12 * toeSpread,
      footPos[1] + side * (0.06 + 0.14 * toeSpread),
      footPos[2] + toeDip,
    ];
    const toeSide: V3 = [
      footPos[0] + 0.26 + 0.1 * toeSpread,
      footPos[1] - side * (0.07 + 0.14 * toeSpread),
      footPos[2] + toeDip,
    ];
    const toeBack: V3 = [
      footPos[0] - 0.22 - 0.08 * toeSpread,
      footPos[1],
      footPos[2] + 0.02 + 0.08 * toeSpread,
    ];

    const pts = boil(
      [screen(hip), screen(ankle), screen(footPos), screen(toeFwd)],
      seed + side,
      amp,
    );
    const ts = boil([screen(toeSide)], seed + side * 5, amp)[0];
    const bk = boil([screen(toeBack)], seed + side * 3, amp)[0];
    const w = Math.max(2.2, lineBase * 1.55);

    ctx.save();
    ctx.strokeStyle = foot.shade;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.moveTo(pts[2][0], pts[2][1]);
    ctx.lineTo(ts[0], ts[1]);
    ctx.moveTo(pts[2][0], pts[2][1]);
    ctx.lineTo(bk[0], bk[1]);
    ctx.stroke();

    ctx.strokeStyle = foot.lit;
    ctx.lineWidth = Math.max(1, w * 0.42);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.stroke();
    ctx.restore();

    const outline = strokes(
      resample([pts[0], pts[1], pts[2], pts[3]], 2, false),
      false,
      {
        ...style(80 + side, lineBase * 0.68),
        breakEvery: [1e4, 1e4],
        dropLit: 0,
        minLength: 4,
      },
    );
    drawStrokes(ctx, outline, ink.color);
  }
};

export const backlight: Lighting = {
  direction: [0.55, -0.5, 0.68],
  litTint: { color: sparrowRim.dusk!, amount: 0.25 },
  shadeTint: { color: sparrowCommon.backSideTint, amount: 0.22 },
  rim: { color: sparrowRim.dusk!, alpha: 0.9, mode: "back" },
  threshold: 0.1,
};

export const sheetLight: Lighting = {
  direction: [0.55, -0.6, -0.6],
  preset: "dusk",
  threshold: 0.12,
};
