/**
 * 第 4、6 镜共用的人的摆放与地面效果。
 * 1) legFrame 按 person.ts 的骨盆变换和腿长（同一套常量）把姿势解成髋、膝、踝、鞋跟、鞋尖的人体局部坐标；toWorld 再按路线方位摆进场景。
 * 2) planWalk 让「刚着地的那只脚」在支撑期里钉在世界的一点上：由已知的一脚（画张号、哪只脚、沿路的位置）和各步的步长推出其余落脚点，
 *    给出每一帧骨盆沿路的位置；镜头只管路线的起点和方向，脚不打滑。
 * 3) drawPersonShadow 按太阳方向把两条腿、身子（腰以上按身高补全）和竹篮投到地面：脚下最暗、越远越淡，边缘随画张抖动，不用椭圆。
 * 4) drawGrass 画被风吹的草簇（风从 +X 来，往 −X 倒），每簇周期 2–5 秒、相位不同，叶尖比根部晚回正。
 * 待定事项：person.ts 不导出脚的位置，这里的腿长、半髋宽与竹篮挂法是照 person.ts 复算的。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { add, rotateX, rotateY, rotateZ } from "../../../../src/kit/engine/figure.ts";
import { drawStrokes, strokes } from "../../../../src/kit/engine/ink.ts";
import type { Point, V3 } from "../../../../src/kit/engine/figure.ts";
import { hash, noise2 } from "../../../../src/kit/engine/random.ts";
import { mix } from "../../../../src/kit/engine/timing.ts";
import { ANKLE_Z, HIP_Z, mudWalkPose } from "../../person.ts";
import type { LegPose, PersonPose } from "../../person.ts";
import { sun } from "../../scene.ts";

const HIP_HALF = 0.092;
const THIGH = 0.39;
const SHIN = 0.37;

export type LegFrame = { hip: V3; knee: V3; ankle: V3; heel: V3; toe: V3; onGround: boolean };

export const legFrame = (pose: PersonPose, side: 1 | -1): LegFrame => {
  const leg: LegPose = side > 0 ? pose.left : pose.right;
  const pelvis: V3 = [pose.pelvisX, pose.pelvisY, HIP_Z + pose.pelvisZ];
  const hip = add(pelvis, rotateZ(rotateY(rotateX([0, side * HIP_HALF, 0], pose.pelvisRoll), pose.pelvisPitch), pose.pelvisYaw));
  const legYaw = pose.pelvisYaw + leg.footYaw * 0.28;
  const knee = add(hip, rotateZ([Math.sin(leg.hipPitch) * THIGH, Math.sin(leg.hipRoll) * THIGH, -Math.cos(leg.hipPitch) * THIGH], legYaw));
  const shinPitch = leg.hipPitch - leg.kneeBend;
  const ankle = add(knee, rotateZ([Math.sin(shinPitch) * SHIN, Math.sin(leg.hipRoll * 0.5) * SHIN, -Math.cos(shinPitch) * SHIN], legYaw));
  const footYaw = pose.pelvisYaw + leg.footYaw;
  const fromFoot = (q: V3): V3 => add(rotateZ(rotateY(q, -leg.anklePitch), footYaw), ankle);
  const heel = fromFoot([-0.05, 0, -ANKLE_Z]);
  const toe = fromFoot([0.17, 0, -ANKLE_Z]);
  return { hip, knee, ankle, heel, toe, onGround: Math.min(heel[2], toe[2]) < 0.012 };
};

export const toWorld = (local: V3, origin: Vec3, azimuth: number): V3 => [
  origin[0] + Math.sin(azimuth) * local[0] - Math.cos(azimuth) * local[1],
  origin[1] + Math.cos(azimuth) * local[0] + Math.sin(azimuth) * local[1],
  local[2],
];

export const basketCenterLocal = (pose: PersonPose): V3 => {
  const side = pose.basketSide;
  const hand: V3 = [pose.pelvisX - 0.012 + Math.sin(pose.armSwing) * 0.19 + 0.022, pose.pelvisY + side * 0.227, 0.843 + pose.pelvisZ + pose.basketLift];
  const hanging = rotateZ(rotateY(rotateX([0, 0, -0.205], pose.basketSway), pose.basketSwing), pose.pelvisYaw);
  return add(hand, hanging);
};

export type WalkOptions = { stepFrames: number; seed: number; muddy: number; basketSide: 1 | -1 };

export type WalkPlanOptions = WalkOptions & {
  poseOffset: number;
  count: number;
  known: { index: number; pos: number };
  starts: number;
  poseAt: (frame: number) => PersonPose;
};

export type WalkPlan = {
  originAt: (frame: number, pose: PersonPose) => number;
  landings: readonly { frame: number; side: 1 | -1; pos: number }[];
  stepFrames: number;
};

const sideOfStep = (k: number): 1 | -1 => ((((k % 2) + 2) % 2) === 0 ? 1 : -1);
const PLANT_SHARE = 0.35;

export const planWalk = ({ stepFrames, seed, muddy, basketSide, poseOffset, count, known, starts, poseAt }: WalkPlanOptions): WalkPlan => {
  const walkOptions: WalkOptions = { stepFrames, seed, muddy, basketSide };
  const soleX = (pose: PersonPose, side: 1 | -1) => legFrame(pose, side).ankle[0] + 0.04;
  const stepLength = (k: number) => {
    const pose = mudWalkPose((k + 1) * stepFrames, walkOptions);
    return soleX(pose, sideOfStep(k + 1)) - soleX(pose, sideOfStep(k));
  };
  const pos: number[] = new Array<number>(count).fill(NaN);
  pos[known.index] = known.pos;
  for (let k = known.index + 1; k < count; k++) pos[k] = pos[k - 1] + stepLength(k - 1);
  for (let k = known.index - 1; k >= 0; k--) pos[k] = pos[k + 1] - stepLength(k);
  const landings = pos.map((position, k) => ({ frame: k * stepFrames - poseOffset, side: sideOfStep(k), pos: position }));
  const stepOf = (frame: number) => Math.max(0, Math.min(count - 1, Math.floor((frame + poseOffset) / stepFrames)));
  const landingFrame = (j: number) => Math.max(starts, j * stepFrames - poseOffset);
  return {
    stepFrames,
    landings,
    originAt: (frame, pose) => {
      const k = stepOf(frame);
      const plant = pos[k] - soleX(pose, sideOfStep(k));
      const anchor = landingFrame(k);
      const from = pos[k] - soleX(poseAt(anchor), sideOfStep(k));
      let to: number;
      let span: number;
      if (k < count - 1) {
        const end = landingFrame(k + 1);
        to = pos[k + 1] - soleX(poseAt(end), sideOfStep(k + 1));
        span = end - anchor;
      } else {
        to = from + (pos[k] - pos[k - 1]);
        span = stepFrames;
      }
      const linear = span > 0 ? from + ((to - from) * (frame - anchor)) / span : to;
      return PLANT_SHARE * plant + (1 - PLANT_SHARE) * linear;
    },
  };
};

export const alongPath = (base: Vec3, azimuth: number, distance: number): Vec3 => [
  base[0] + Math.sin(azimuth) * distance,
  base[1] + Math.cos(azimuth) * distance,
  0,
];

const hexRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
};

export const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).replace(/^(.)$/, "0$1")).join("")}`;
};

type ShadowOptions = { color: string; drawing: number; alpha?: number; strength?: number };

export const drawPersonShadow = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  pose: PersonPose,
  origin: Vec3,
  azimuth: number,
  { color, drawing, alpha = 0.6, strength = 1 }: ShadowOptions,
) => {
  const left = legFrame(pose, 1);
  const right = legFrame(pose, -1);
  const pelvis: V3 = [pose.pelvisX, pose.pelvisY, HIP_Z + pose.pelvisZ];
  const waistPoint: V3 = [pelvis[0] + 0.02, pelvis[1], 1.02 + pose.pelvisZ];
  const shoulder: V3 = [pelvis[0] + 0.035, pelvis[1] * 0.6, 1.38 + pose.pelvisZ * 0.3];
  const head: V3 = [pelvis[0] + 0.02, pelvis[1] * 0.4, 1.66];
  const basket = basketCenterLocal(pose);
  const ground = (local: V3): Vec3 => {
    const w = toWorld(local, origin, azimuth);
    const t = w[2] / sun[2];
    return [w[0] - sun[0] * t, w[1] - sun[1] * t, 0];
  };
  const segments: [V3, V3, number][] = [
    [left.heel, left.knee, 0.062],
    [left.knee, left.hip, 0.088],
    [right.heel, right.knee, 0.062],
    [right.knee, right.hip, 0.088],
    [left.hip, pelvis, 0.1],
    [right.hip, pelvis, 0.1],
    [pelvis, shoulder, 0.2],
    [shoulder, head, 0.125],
  ];
  const screen = (g: Vec3): Point => {
    const p = project(camera, g);
    return [p.x, p.y];
  };
  const scaleAt = (g: Vec3) => project(camera, g).scale;
  const wob = (pts: Point[], k: number): Point[] =>
    pts.map(([x, y]) => [
      x + (noise2(x / 23, y / 23, drawing * 31 + k) - 0.5) * 2.6,
      y + (noise2(x / 23 + 91.7, y / 23 - 17.3, drawing * 31 + k + 3) - 0.5) * 2.6,
    ]);
  const trace = (target: Path2D, pts: Point[]) => {
    target.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) target.lineTo(pts[i][0], pts[i][1]);
    target.closePath();
  };

  const NEAR = 0.35;
  const depthOf = (g: Vec3) => project(camera, g).depth;
  const clipNear = (a: Vec3, b: Vec3): [Vec3, Vec3] | null => {
    const da = depthOf(a);
    const db = depthOf(b);
    if (da < NEAR && db < NEAR) return null;
    if (da >= NEAR && db >= NEAR) return [a, b];
    const t = (NEAR - da) / (db - da);
    const cut: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0];
    return da < NEAR ? [cut, b] : [a, cut];
  };
  const addCapsule = (path: Path2D, a0: Vec3, b0: Vec3, halfWidth: number, grow: number) => {
    const clipped = clipNear(a0, b0);
    if (!clipped) return;
    const [a, b] = clipped;
    const sa = screen(a);
    const sb = screen(b);
    const wa = Math.min(900, (halfWidth + grow) * scaleAt(a));
    const wb = Math.min(900, (halfWidth + grow) * scaleAt(b));
    const nearPush = Math.max(wa, wb) * 1.2;
    if (depthOf(a) < NEAR * 4) sa[1] += nearPush;
    if (depthOf(b) < NEAR * 4) sb[1] += nearPush;
    const dx = sb[0] - sa[0];
    const dy = sb[1] - sa[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const pts: Point[] = [];
    const cap = (c: Point, from: number, w: number, flip: number) => {
      for (let i = 0; i <= 6; i++) {
        const ang = from + flip * (Math.PI * i) / 6;
        pts.push([c[0] + Math.cos(ang) * w, c[1] + Math.sin(ang) * w]);
      }
    };
    const angA = Math.atan2(ny, nx);
    pts.push([sa[0] + nx * wa, sa[1] + ny * wa], [sb[0] + nx * wb, sb[1] + ny * wb]);
    cap(sb, angA, wb, 1);
    pts.push([sa[0] - nx * wa, sa[1] - ny * wa]);
    cap(sa, angA + Math.PI, wa, 1);
    trace(path, wob(pts, Math.round(halfWidth * 1000)));
  };
  const addDisc = (path: Path2D, c: Vec3, radius: number, grow: number) => {
    if (depthOf(c) < NEAR) return;
    const s = screen(c);
    const w = (radius + grow) * scaleAt(c);
    const pts: Point[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      pts.push([s[0] + Math.cos(a) * w, s[1] + Math.sin(a) * w * 0.9]);
    }
    trace(path, wob(pts, 77));
  };

  const penumbra = new Path2D();
  const core = new Path2D();
  for (const [a, b, w] of segments) {
    addCapsule(penumbra, ground(a), ground(b), w, 0.07);
    addCapsule(core, ground(a), ground(b), w, 0.012);
  }
  addDisc(penumbra, ground(basket), 0.13, 0.07);
  addDisc(core, ground(basket), 0.13, 0.012);
  ctx.save();
  ctx.fillStyle = hexRgba(color, alpha * 0.07 * strength);
  ctx.fill(penumbra, "nonzero");
  const feet = screen(ground([(left.ankle[0] + right.ankle[0]) / 2, (left.ankle[1] + right.ankle[1]) / 2, 0]));
  const farPoint = ground(head);
  const far = depthOf(farPoint) < NEAR ? screen(ground(waistPoint)) : screen(farPoint);
  const grad = ctx.createLinearGradient(feet[0], feet[1], far[0], far[1]);
  grad.addColorStop(0, hexRgba(color, alpha * strength));
  grad.addColorStop(0.4, hexRgba(color, alpha * 0.82 * strength));
  grad.addColorStop(1, hexRgba(color, alpha * 0.42 * strength));
  ctx.fillStyle = grad;
  ctx.fill(core, "nonzero");

  for (const leg of [left, right]) {
    if (!leg.onGround || depthOf(ground(leg.ankle)) < NEAR) continue;
    const contact = new Path2D();
    const heel = screen(ground(leg.heel));
    const toe = screen(ground(leg.toe));
    const w = 0.06 * scaleAt(ground(leg.ankle));
    const dx = toe[0] - heel[0];
    const dy = toe[1] - heel[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const pts: Point[] = [
      [heel[0] + nx * w * 0.8, heel[1] + ny * w * 0.8],
      [toe[0] + nx * w, toe[1] + ny * w],
      [toe[0] + (dx / len) * w * 0.6, toe[1] + (dy / len) * w * 0.6],
      [toe[0] - nx * w, toe[1] - ny * w],
      [heel[0] - nx * w * 0.8, heel[1] - ny * w * 0.8],
      [heel[0] - (dx / len) * w * 0.5, heel[1] - (dy / len) * w * 0.5],
    ];
    trace(contact, wob(pts, 91));
    ctx.fillStyle = hexRgba(color, alpha * 0.75 * strength);
    ctx.fill(contact, "nonzero");
  }
  ctx.restore();
};

export type Tuft = {
  x: number;
  y: number;
  blades: { height: number; lean: number; width: number; phase: number; period: number; lit: boolean; offset: [number, number] }[];
};

export const makeTufts = (seed: number, spots: readonly [number, number][], height: [number, number]): Tuft[] =>
  spots.map(([x, y], i) => {
    const count = 3 + Math.floor(hash(seed, i, 1) * 4);
    const blades = Array.from({ length: count }, (_, k) => ({
      height: mix(height[0], height[1], hash(seed, i, 10 + k)),
      lean: (hash(seed, i, 20 + k) - 0.5) * 0.5,
      width: mix(1.6, 2.8, hash(seed, i, 30 + k)),
      phase: hash(seed, i, 40 + k) * Math.PI * 2,
      period: mix(48, 120, hash(seed, i, 50 + k)),
      lit: hash(seed, i, 60 + k) < 0.4,
      offset: [(hash(seed, i, 70 + k) - 0.5) * 0.09, (hash(seed, i, 80 + k) - 0.5) * 0.07] as [number, number],
    }));
    return { x, y, blades };
  });

export const drawGrass = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  tufts: readonly Tuft[],
  frame: number,
  colors: { blade: string; lit: string; dark: string },
) => {
  ctx.save();
  for (let i = 0; i < tufts.length; i++) {
    const tuft = tufts[i];
    const center = project(camera, [tuft.x, tuft.y, 0]);
    if (center.depth < 0.25 || center.x < -80 || center.x > camera.width + 80 || center.y < -80 || center.y > camera.height + 80) continue;
    for (let k = 0; k < tuft.blades.length; k++) {
      const b = tuft.blades[k];
      const base: Vec3 = [tuft.x + b.offset[0], tuft.y + b.offset[1], -0.004];
      const sway = Math.sin((frame / b.period) * Math.PI * 2 + b.phase);
      const flutter = Math.sin((frame / (b.period / 3.7)) * Math.PI * 2 + b.phase * 2) * 0.18;
      const gust = 0.5 + 0.5 * sway + flutter;
      const bend = b.height * (0.1 + 0.3 * Math.max(0, Math.min(1, gust)) + 0.12 * b.lean);
      const tipLag = b.height * 0.06 * Math.sin((frame / b.period) * Math.PI * 2 + b.phase - 0.9);
      const tip: Vec3 = [base[0] - bend - tipLag, base[1] + b.lean * b.height * 0.3, base[2] + b.height * (1 - 0.12 * Math.max(0, gust))];
      const mid: Vec3 = [base[0] - bend * 0.35, base[1] + b.lean * b.height * 0.15, base[2] + b.height * 0.55];
      const pts: Point[] = [base, mid, tip].map((p) => {
        const q = project(camera, p);
        return [q.x, q.y];
      });
      if (pts[2][1] > camera.height + 40) continue;
      const scalePx = project(camera, base).scale;
      const color = b.lit ? mixHex(colors.blade, colors.lit, 0.35 + 0.45 * Math.max(0, Math.min(1, gust))) : mixHex(colors.blade, colors.dark, 0.35);
      const style = {
        seed: Math.floor(hash(777, i, k) * 1e6),
        base: Math.max(1.3, b.width * scalePx / 900),
        min: 1.1,
        max: 3.4,
        light: [0.55, -0.8] as Point,
        breakEvery: [1e4, 1e4] as [number, number],
        cornerAngle: 1.2,
        gap: [0, 0] as [number, number],
        litThin: 0.8,
        dropLit: 0,
        minLength: 3,
      };
      drawStrokes(ctx, strokes(pts, false, style), color);
    }
  }
  ctx.restore();
};
