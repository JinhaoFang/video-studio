/**
 * 主角：树麻雀。体块用距离场捏（胸腹、臀、头三个椭球平滑并起来，喙、尾、两翼各自成块），按视角正交投影成线稿和赛璐璐色块，
 * 所以任意角度都是同一只鸟。镜头只通过 drawSparrow 画它：位置、尺度（每单位多少像素）、朝向、姿势、表情、光照。
 * 局部坐标以"单位"计（身体半径约 1，全长约 3.3），x 朝前、y 朝左、z 朝上，原点是站立时的身体中心，脚踩在 z = FOOT_Z。
 * 画张号决定线条抖动；同一张画、同一姿势，像素完全一样。镜头负责身下的接触阴影和环境光在背景上的效果。
 * 待定：张翅的形状只够远景飞行用，近景振翅要更细的羽毛分层。
 */
import { createLayer, drawCel, placeLayer, tracePath } from "./engine/cel.ts";
import type { CelPart, Tone } from "./engine/cel.ts";
import {
  add,
  contours,
  dot,
  ellipsoid,
  field,
  normalize,
  resample,
  rotateX,
  rotateY,
  rotateZ,
  roundCone,
  sample,
  smin,
  smooth,
  sub,
  toView,
  viewBasis,
} from "./engine/figure.ts";
import type { Basis, Point, Sampled, V3 } from "./engine/figure.ts";
import { boil, drawStrokes, strokes } from "./engine/ink.ts";
import type { StrokeStyle } from "./engine/ink.ts";
import { hash, noise1 } from "./engine/random.ts";
import { ink, sparrow as palette, warm } from "./tokens.ts";

export const FOOT_Z = -1.3;

export type Pose = {
  bodyPitch: number;
  lift: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  puff: number;
  wet: number;
  crouch: number;
  stretch: number;
  tailLift: number;
  wingSpread: number;
  wingFlap: number;
  eyeOpen: number;
  eyeClosedCurve: number;
  sparkle: number;
  beakOpen: number;
  legs: boolean;
};

export const restPose: Pose = {
  bodyPitch: 0.42,
  lift: 0,
  headYaw: 0,
  headPitch: -0.1,
  headRoll: 0,
  puff: 0,
  wet: 0,
  crouch: 0,
  stretch: 0,
  tailLift: 0,
  wingSpread: 0,
  wingFlap: 0,
  eyeOpen: 1,
  eyeClosedCurve: 0.6,
  sparkle: 0,
  beakOpen: 0,
  legs: true,
};

export type Lighting = {
  direction: V3;
  litTint?: { color: string; amount: number };
  shadeTint?: { color: string; amount: number };
  rim?: { color: string; alpha: number };
  threshold?: number;
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
};

const NECK: V3 = [0.62, 0, 0.42];
const HEAD: V3 = [0.95, 0, 0.8];

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
  wingCenter: (side: number) => V3;
  scaleBody: number;
};

const mixV = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const rig = (pose: Pose): Rig => {
  const offset: V3 = [0, 0, -0.3 * pose.crouch + pose.lift];
  const sy = 1 + pose.stretch;
  const sx = 1 / Math.sqrt(Math.max(0.3, sy));
  const toBody = (p: V3): V3 => {
    const r = rotateY(sub(p, offset), pose.bodyPitch);
    return [r[0] / sx, r[1] / sx, r[2] / sy];
  };
  const fromBody = (p: V3): V3 => add(rotateY([p[0] * sx, p[1] * sx, p[2] * sy], -pose.bodyPitch), offset);
  const toHead = (p: V3): V3 => {
    let q = sub(p, NECK);
    q = rotateZ(q, -pose.headYaw);
    q = rotateY(q, pose.headPitch);
    q = rotateX(q, -pose.headRoll);
    return add(q, NECK);
  };
  const fromHead = (q: V3): V3 => {
    let p = sub(q, NECK);
    p = rotateX(p, pose.headRoll);
    p = rotateY(p, -pose.headPitch);
    p = rotateZ(p, pose.headYaw);
    return add(p, NECK);
  };
  const puff = 1 + 0.2 * pose.puff - 0.08 * pose.wet;
  const chestR: V3 = [0.98 * puff, 0.9 * puff, 0.96 * puff];
  const rearR: V3 = [0.86 * puff, 0.74 * puff, 0.7 * puff];
  const headR: V3 = [0.74 * (1 + 0.08 * pose.puff - 0.04 * pose.wet), 0.69 * (1 + 0.12 * pose.puff - 0.05 * pose.wet), 0.67 * (1 + 0.1 * pose.puff - 0.04 * pose.wet)];
  const bodyOnly = (b: V3) => smin(ellipsoid(b, [0.22, 0, -0.02], chestR), ellipsoid(b, [-0.5, 0, 0.06], rearR), 0.55);
  const headOnly = (b: V3) => ellipsoid(toHead(b), HEAD, headR);
  const neckK = 0.5 - 0.12 * pose.wet + 0.25 * pose.puff;
  const bodyHead = (p: V3) => {
    const b = toBody(p);
    return smin(bodyOnly(b), headOnly(b), neckK);
  };
  const headness = (p: V3) => {
    const b = toBody(p);
    return headOnly(b) - bodyOnly(b);
  };
  const open = pose.beakOpen;
  const beak = (p: V3) => {
    const q = toHead(toBody(p));
    const base: V3 = [1.5, 0, 0.74];
    if (open < 0.05) return roundCone(q, base, [1.88, 0, 0.66], 0.165, 0.03);
    const up = rotateY(sub([1.9, 0, 0.7], base), -0.25 * open);
    const down = rotateY(sub([1.84, 0, 0.62], base), 0.45 * open);
    return Math.min(
      roundCone(q, add(base, [0, 0, 0.05]), add(base, up), 0.17, 0.03),
      roundCone(q, add(base, [0, 0, -0.06]), add(base, down), 0.13, 0.03),
    );
  };
  const tailBase: V3 = [-1.0, 0, -0.06];
  const tailAngle = 0.18 - pose.tailLift;
  const tail = (p: V3) => {
    const b = toBody(p);
    const t = rotateY(sub(b, tailBase), tailAngle);
    const a = ellipsoid(t, [-0.3, 0, 0.02], [0.45, 0.26, 0.16]);
    const c = ellipsoid(t, [-0.72, 0, 0], [0.4, 0.3, 0.07]);
    return smin(a, c, 0.3);
  };
  const spread = pose.wingSpread;
  const flap = pose.wingFlap;
  const wingFrame = (side: number, b: V3): V3 => {
    const pivot: V3 = [0.25, side * 0.5, 0.42];
    const folded = rotateZ(rotateY(sub(b, [-0.45, side * 0.6, 0.2]), 0.12), side * 0.12);
    const raise = side * (0.25 + 1.05 * flap) * spread;
    let o = sub(b, pivot);
    o = rotateX(o, -raise);
    o = rotateZ(o, -side * 0.15 * spread);
    const opened: V3 = [o[0] + 0.18, o[1] - side * 1.0, o[2]];
    const openedSwapped: V3 = [opened[0], opened[2], opened[1] * side];
    return mixV(folded, openedSwapped, Math.min(1, spread * 1.0));
  };
  const wing = (side: number) => (p: V3) => {
    const b = toBody(p);
    const w = wingFrame(side, b);
    const s = spread;
    const ra: V3 = [0.88 + (0.62 - 0.88) * s, 0.13 + (0.07 - 0.13) * s, 0.5 + (1.12 - 0.5) * s];
    const rb: V3 = [0.5 + (0.45 - 0.5) * s, 0.09 + (0.05 - 0.09) * s, 0.22 + (0.55 - 0.22) * s];
    const cb: V3 = mixV([-0.72, side * -0.1, -0.04], [-0.32, 0, 0.95], s);
    return smin(ellipsoid(w, [0, 0, 0], ra), ellipsoid(w, cb, rb), 0.3);
  };
  const wingCenter = (side: number): V3 =>
    fromBody(mixV([-0.6, side * 0.62, 0.12], [0.0, side * 1.4, 0.5 + 0.9 * flap], spread));
  return { toBody, fromBody, toHead, fromHead, bodyHead, headness, beak, tail, wing, wingFrame, wingCenter, scaleBody: puff };
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) => Math.round(v + (pb[i] - v) * t)
      .toString(16)
      .replace(/^(.)$/, "0$1"))
    .join("")}`;
};

const tone = (base: Tone, l: Lighting): Tone => ({
  lit: l.litTint ? mixHex(base.lit, l.litTint.color, l.litTint.amount) : base.lit,
  shade: l.shadeTint ? mixHex(base.shade, l.shadeTint.color, l.shadeTint.amount) : base.shade,
});

const segmentDistance = (p: V3, a: V3, b: V3) => {
  const ba = sub(b, a);
  const pa = sub(p, a);
  const h = Math.min(1, Math.max(0, dot(pa, ba) / dot(ba, ba)));
  const d = sub(pa, [ba[0] * h, ba[1] * h, ba[2] * h]);
  return Math.sqrt(dot(d, d));
};

const loopsOf = (values: Float32Array, s: Sampled, spacing: number, minArea: number, seed: number, amp: number) =>
  contours(values, s.grid)
    .map((loop) => resample(smooth(loop, 2), spacing))
    .filter((loop) => {
      let a = 0;
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i];
        const q = loop[(i + 1) % loop.length];
        a += p[0] * q[1] - q[0] * p[1];
      }
      return Math.abs(a / 2) >= minArea;
    })
    .map((loop) => boil(loop, seed, amp));

const tuft = (
  loop: Point[],
  weight: (p: Point) => number,
  amplitude: number,
  period: number,
  pointed: number,
  seed: number,
): Point[] => {
  const n = loop.length;
  let a = 0;
  for (let i = 0; i < n; i++) a += loop[i][0] * loop[(i + 1) % n][1] - loop[(i + 1) % n][0] * loop[i][1];
  const flip = a < 0 ? -1 : 1;
  const out: Point[] = [];
  let s = 0;
  let clumpStart = 0;
  let clumpLen = period * (0.7 + 0.6 * hash(seed, 0));
  let clumpAmp = 0.6 + 0.8 * hash(seed, 1);
  let clump = 0;
  for (let i = 0; i < n; i++) {
    const p = loop[i];
    const prev = loop[(i - 1 + n) % n];
    const next = loop[(i + 1) % n];
    if (i > 0) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    while (s - clumpStart > clumpLen) {
      clumpStart += clumpLen;
      clump++;
      clumpLen = period * (0.7 + 0.6 * hash(seed, clump * 2));
      clumpAmp = 0.5 + 0.9 * hash(seed, clump * 2 + 1);
    }
    const u = (s - clumpStart) / clumpLen;
    const shape = pointed > 0.5 ? Math.pow(1 - Math.abs(2 * u - 1), 1.8) : Math.sqrt(Math.sin(Math.PI * u));
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const l = Math.hypot(tx, ty) || 1;
    const nx = (ty / l) * flip;
    const ny = (-tx / l) * flip;
    const d = amplitude * weight(p) * clumpAmp * (shape - 0.35);
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

export const drawSparrow = (target: CanvasRenderingContext2D, view: SparrowView, pose: Pose) => {
  const seed = view.seed ?? 152;
  const r = rig(pose);
  const basis: Basis = viewBasis(view.yaw, view.pitch, view.roll ?? 0);
  const L = normalize(view.lighting.direction);
  const threshold = view.lighting.threshold ?? 0.06;
  const ppu = view.ppu;
  const cell = Math.min(6, Math.max(1.1, ppu * 0.034));
  const spacing = Math.max(1.2, Math.min(3, ppu * 0.02));
  const drawingSeed = Math.floor(hash(seed, view.drawing) * 1e6);
  const boilAmp = ink.boilMinPx + (ink.boilMaxPx - ink.boilMinPx) * hash(seed, view.drawing, 3);
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
      return d - threshold - bias + wave;
    });
  const rimField = (s: Sampled) =>
    field(
      s,
      (_, n) => {
        const facing = (n[0] * L[0] + n[1] * L[1]) / (Math.hypot(L[0], L[1]) || 1);
        return -Math.min(facing - 0.3, 0.4 - Math.abs(n[2]));
      },
      1e3,
    );
  const minArea = Math.max(4, ppu * ppu * 0.002);
  const T = (t: Tone) => {
    const base = tone(t, view.lighting);
    return pose.wet > 0
      ? { lit: mixHex(base.lit, palette.patch.lit, pose.wet * 0.14), shade: mixHex(base.shade, palette.patch.lit, pose.wet * 0.1) }
      : base;
  };

  const sampleOpts = (center: V3, radius: number, round?: { center: (p: V3) => V3; amount: number }) => ({
    originX: view.x,
    originY: view.y,
    ppu,
    basis,
    center,
    radius,
    cell,
    roundness: round,
  });

  type Built = { depth: number; part: CelPart; after?: (ctx: CanvasRenderingContext2D) => void };
  const parts: Built[] = [];

  const bodyCenter = r.fromBody([0.15, 0, 0.25]);
  const headCenterStage = r.fromBody(r.fromHead(HEAD));
  const bodyRound = r.fromBody([0.05, 0, 0.0]);
  const sBody = sample(
    r.bodyHead,
    sampleOpts(bodyCenter, 2.3 * r.scaleBody, {
      center: (p) => {
        const t = Math.min(1, Math.max(0, 0.5 - r.headness(p) * 4));
        return [bodyRound[0] + (headCenterStage[0] - bodyRound[0]) * t, bodyRound[1] + (headCenterStage[1] - bodyRound[1]) * t, bodyRound[2] + (headCenterStage[2] - bodyRound[2]) * t];
      },
      amount: 0.5,
    }),
  );
  {
    const sil = loopsOf(sBody.silhouette, sBody, spacing, minArea, drawingSeed, boilAmp);
    const faceWeight = (p: Point) => {
      const fx = (p[0] - view.x) / ppu;
      const fy = (p[1] - view.y) / ppu;
      const beakDir = vec(sub(r.fromBody(r.fromHead([1.7, 0, 0.7])), headCenterStage));
      const hc = screen(headCenterStage);
      const toP: Point = [p[0] - hc[0], p[1] - hc[1]];
      const bl = Math.hypot(beakDir[0], beakDir[1]) || 1;
      const pl = Math.hypot(toP[0], toP[1]) || 1;
      const facing = (toP[0] * beakDir[0] + toP[1] * beakDir[1]) / (bl * pl);
      return Math.max(0, Math.min(1, 1.2 - Math.max(0, facing) * 1.6)) * (0.6 + 0.4 * noise1(fx * 3 + fy * 5, seed));
    };
    const wetAmp = ppu * (0.08 * pose.wet + 0.028 * pose.puff + 0.01);
    const tufted = sil.map((loop, k) =>
      tuft(loop, faceWeight, wetAmp, ppu * (pose.wet > 0.5 ? 0.2 : 0.16), pose.wet > 0.5 ? 1 : 0, seed + k * 13 + Math.floor(pose.wet * 3)),
    );
    const headF = field(sBody, (p) => r.headness(p) * 3 - 0.04);
    const headLocal = (p: V3) => sub(r.toHead(r.toBody(p)), HEAD);
    const gate = (p: V3, m: number) => Math.max(m, r.headness(p) * 3 - 0.04);
    const cap = field(sBody, (p) => {
      const q = headLocal(p);
      const zb = 0.05 + 0.13 * (q[0] / 0.72) + 0.03 * Math.sin(q[1] * 9);
      return gate(p, zb - q[2]);
    });
    const spot = field(sBody, (p) => {
      const q = headLocal(p);
      const side = q[1] >= 0 ? 1 : -1;
      const c: V3 = [-0.06, side * 0.6, -0.14];
      return gate(p, Math.hypot(q[0] - c[0], (q[1] - c[1]) * 0.8, (q[2] - c[2]) * 0.95) - 0.17);
    });
    const bib = field(sBody, (p) => {
      const q = headLocal(p);
      const zc = -0.3;
      const width = 0.23 * (1 - 0.3 * Math.max(0, Math.min(1, (q[2] - zc) / 0.16)));
      const m = Math.hypot(q[1] / width, (q[2] - zc) / 0.15) - 1;
      return Math.max(m, 0.22 - q[0]);
    });
    const lore = field(sBody, (p) => {
      const q = headLocal(p);
      const side = q[1] >= 0 ? 1 : -1;
      return gate(p, segmentDistance(q, [0.6, side * 0.2, -0.02], [0.33, side * 0.5, 0.06]) - 0.055);
    });
    const back = field(sBody, (p) => {
      const b = r.toBody(p);
      const n = normalize(sub(b, [0, 0, -0.05]));
      const m = 0.12 - (n[2] - 0.62 * n[0]) + 0.04 * Math.sin(b[1] * 7 + b[0] * 3);
      return Math.max(m, -(r.headness(p) * 3 - 0.04));
    });
    const streakCenters: [V3, V3][] = [
      [[-0.15, 0.22, 0.9], [0.42, 0.07, 0.2]],
      [[-0.2, -0.24, 0.88], [0.4, 0.07, 0.2]],
      [[-0.62, 0.3, 0.68], [0.36, 0.06, 0.2]],
      [[-0.66, -0.32, 0.66], [0.34, 0.06, 0.2]],
      [[0.08, 0.02, 0.98], [0.3, 0.06, 0.18]],
    ];
    const streaks = field(sBody, (p) => {
      const b = r.toBody(p);
      let m = Infinity;
      for (const [c, rad] of streakCenters) {
        const d = Math.hypot((b[0] - c[0]) / rad[0], (b[1] - c[1]) / rad[1], (b[2] - c[2]) / rad[2]) - 1;
        if (d < m) m = d;
      }
      return Math.max(m * 0.3, -(r.headness(p) * 3 - 0.04));
    });
    const shadow = loopsOf(shadowField(sBody), sBody, spacing, minArea, drawingSeed, boilAmp);
    const rimLoops = view.lighting.rim ? loopsOf(rimField(sBody), sBody, spacing, minArea * 0.3, drawingSeed, boilAmp) : [];
    const lines = tufted.reduce<ReturnType<typeof strokes>>((all, loop, k) => all.concat(strokes(loop, true, style(k))), []);
    const regions = [
      { loops: loopsOf(back, sBody, spacing, minArea, drawingSeed, boilAmp), tone: T(palette.mantle) },
      { loops: loopsOf(streaks, sBody, spacing, minArea * 0.3, drawingSeed, boilAmp), tone: T(palette.streak) },
      { loops: loopsOf(headF, sBody, spacing, minArea, drawingSeed, boilAmp), tone: T(palette.cheek) },
      { loops: loopsOf(cap, sBody, spacing, minArea, drawingSeed, boilAmp), tone: T(palette.crown) },
      { loops: loopsOf(spot, sBody, spacing, minArea * 0.3, drawingSeed, boilAmp), tone: T(palette.patch) },
      { loops: loopsOf(bib, sBody, spacing, minArea * 0.3, drawingSeed, boilAmp), tone: T(palette.patch) },
      { loops: loopsOf(lore, sBody, spacing, minArea * 0.2, drawingSeed, boilAmp), tone: T(palette.patch) },
    ];
    parts.push({
      depth: depthOf(bodyCenter),
      part: {
        silhouette: tufted,
        base: T(palette.belly),
        regions,
        shadow,
        rim: view.lighting.rim ? { loops: rimLoops, color: view.lighting.rim.color, alpha: view.lighting.rim.alpha } : undefined,
        lines,
        lineColor: ink.color,
      },
      after: (ctx) => {
        ctx.save();
        tracePath(ctx, tufted);
        ctx.clip("evenodd");
        const eyeLocal: V3 = [0.31, 0.5, 0.1];
        for (const side of [1, -1]) {
          const eHead: V3 = add(HEAD, [eyeLocal[0], side * eyeLocal[1], eyeLocal[2]]);
          const nHead = normalize([eyeLocal[0] * 0.8, side * eyeLocal[1], eyeLocal[2]]);
          const toStage = (q: V3) => r.fromBody(r.fromHead(q));
          const eStage = toStage(eHead);
          const nStage = normalize(sub(toStage(add(eHead, nHead)), eStage));
          const nView = toView(basis, nStage);
          const facing = -nView[2];
          if (facing < 0.08) continue;
          const upHead = normalize(sub([0, 0, 1], [nHead[0] * nHead[2], nHead[1] * nHead[2], nHead[2] * nHead[2]]));
          const fwdHead = normalize([
            nHead[1] * upHead[2] - nHead[2] * upHead[1],
            nHead[2] * upHead[0] - nHead[0] * upHead[2],
            nHead[0] * upHead[1] - nHead[1] * upHead[0],
          ]);
          const radius = 0.15 * (1 + 0.05 * pose.puff);
          const upS = vec(sub(toStage(add(eHead, [upHead[0] * radius, upHead[1] * radius, upHead[2] * radius])), eStage));
          const fwdS = vec(sub(toStage(add(eHead, [fwdHead[0] * radius, fwdHead[1] * radius, fwdHead[2] * radius])), eStage));
          const c = screen(eStage);
          const b = boil([c], drawingSeed + 31, boilAmp)[0];
          const open = Math.max(0, Math.min(1, pose.eyeOpen));
          ctx.save();
          if (open > 0.12) {
            ellipseOnSurface(ctx, b, fwdS, [upS[0] * open, upS[1] * open], () => {
              ctx.beginPath();
              ctx.arc(0, 0, 1, 0, Math.PI * 2);
              ctx.fillStyle = palette.eye;
              ctx.fill();
            });
            const g = 0.3 + 0.12 * pose.sparkle;
            const gx = b[0] + light2d[0] * Math.hypot(fwdS[0], fwdS[1]) * 0.32;
            const gy = b[1] + (light2d[1] - 0.25) * Math.hypot(upS[0], upS[1]) * 0.32 * open;
            const gr = Math.max(1.2, Math.hypot(upS[0], upS[1]) * g * Math.min(1, facing * 1.4));
            ctx.fillStyle = palette.glint;
            ctx.beginPath();
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
            ctx.fill();
            if (pose.sparkle > 0.05) {
              const sr = gr * (0.45 + 0.4 * pose.sparkle);
              ctx.beginPath();
              ctx.arc(b[0] - light2d[0] * gr * 1.3, b[1] + gr * 1.2 * open, sr, 0, Math.PI * 2);
              ctx.fill();
            }
            const lid = strokes(
              Array.from({ length: 9 }, (_, k): Point => {
                const a = Math.PI * (1.08 + (k / 8) * 0.84);
                return [b[0] + fwdS[0] * Math.cos(a) * 1.08 - upS[0] * open * Math.sin(a) * 1.08, b[1] + fwdS[1] * Math.cos(a) * 1.08 - upS[1] * open * Math.sin(a) * 1.08];
              }),
              false,
              { ...style(91, lineBase * 0.9), breakEvery: [1e4, 1e4], dropLit: 0 },
            );
            drawStrokes(ctx, lid, ink.color);
          } else {
            const curve = pose.eyeClosedCurve;
            const pts = Array.from({ length: 9 }, (_, k): Point => {
              const t = k / 8 - 0.5;
              const bend = (1 - 4 * t * t) * curve * 0.45;
              return [b[0] + fwdS[0] * t * 2.5 + upS[0] * bend, b[1] + fwdS[1] * t * 2.5 + upS[1] * bend];
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
            lens.forEach((p, k) => (k === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
            ctx.closePath();
            ctx.fillStyle = palette.eye;
            ctx.fill();
            drawStrokes(ctx, strokes(pts, false, { ...style(92, lineBase * 1.4), litThin: 1, breakEvery: [1e4, 1e4], dropLit: 0, minLength: 4 }), ink.color);
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
    feather = 0,
  ): Built => {
    const s = sample(sdf, sampleOpts(center, radius, { center: () => center, amount: roundAmount }));
    const raw = loopsOf(s.silhouette, s, spacing, minArea * 0.2, drawingSeed + k, boilAmp);
    const sil = feather > 0 ? raw.map((loop, i) => tuft(loop, () => 1, ppu * feather, ppu * 0.3, 1, seed + k * 31 + i)) : raw;
    const shadow = loopsOf(shadowField(s), s, spacing, minArea * 0.2, drawingSeed + k, boilAmp);
    const rimLoops = view.lighting.rim ? loopsOf(rimField(s), s, spacing, minArea * 0.2, drawingSeed + k, boilAmp) : [];
    let lines = sil.reduce<ReturnType<typeof strokes>>((all, loop, i) => all.concat(strokes(loop, true, style(k * 10 + i))), []);
    if (innerLines) {
      for (const line of innerLines()) {
        const pts = boil(resample(line, spacing, false), drawingSeed + k, boilAmp);
        lines = lines.concat(strokes(pts, false, { ...style(k * 10 + 5, lineBase * 0.72), breakEvery: [1e4, 1e4], dropLit: 0.15 }));
      }
    }
    return {
      depth: depthOf(center),
      part: {
        silhouette: sil,
        base: T(base),
        regions: extra ? extra(s) : [],
        shadow,
        rim: view.lighting.rim ? { loops: rimLoops, color: view.lighting.rim.color, alpha: view.lighting.rim.alpha } : undefined,
        lines,
        lineColor: ink.color,
      },
    };
  };

  const beakCenter = r.fromBody(r.fromHead([1.68, 0, 0.71]));
  parts.push(
    simplePart(r.beak, beakCenter, 0.45, palette.beak, 2, undefined, () => {
      if (pose.beakOpen > 0.05) return [];
      const a = screen(r.fromBody(r.fromHead([1.52, 0, 0.7])));
      const b = screen(r.fromBody(r.fromHead([1.86, 0, 0.665])));
      const sideAxis = sub(r.fromBody(r.fromHead([0, 1, 0])), r.fromBody(r.fromHead([0, 0, 0])));
      const facingSide = Math.abs(toView(basis, sideAxis)[2]);
      return facingSide > 0.35 ? [[a, b]] : [];
    }),
  );

  const tailCenter = r.fromBody([-1.55, 0, -0.32 + 0.3 * pose.tailLift]);
  parts.push(
    simplePart(r.tail, tailCenter, 1.05, palette.streak, 3, undefined, () => {
      const lines: Point[][] = [];
      for (const y of [-0.12, 0.12]) {
        const pts: Point[] = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          const tb = rotateY([-0.45 - 0.6 * t, y * (1 + t * 0.5), 0.09 - 0.03 * t], -(0.18 - pose.tailLift));
          pts.push(screen(r.fromBody(add([-1.0, 0, -0.06], tb))));
        }
        lines.push(pts);
      }
      return lines;
    }),
  );

  for (const side of [1, -1]) {
    const wc = r.wingCenter(side);
    const wingSdf = r.wing(side);
    parts.push(
      simplePart(
        wingSdf,
        wc,
        pose.wingSpread > 0.2 ? 1.9 : 1.35,
        palette.mantle,
        4 + (side > 0 ? 0 : 1),
        (s) => {
          const wingLocal = (p: V3) => r.wingFrame(side, r.toBody(p));
          const bar = (v0: number, u0: number, u1: number) =>
            field(s, (p) => {
              const w = wingLocal(p);
              const u = w[0] / 0.88;
              const v = w[2] / 0.5;
              return Math.max(Math.abs(v - (v0 + 0.22 * u)) - 0.075, Math.abs(u - (u0 + u1) / 2) - (u1 - u0) / 2) * 0.5;
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
            { loops: loopsOf(flight, s, spacing, minArea * 0.3, drawingSeed, boilAmp), tone: T(palette.streak) },
            { loops: loopsOf(shoulder, s, spacing, minArea * 0.2, drawingSeed, boilAmp), tone: T(palette.crown) },
            { loops: loopsOf(bar(0.42, -0.05, 0.62), s, spacing, minArea * 0.05, drawingSeed, boilAmp), tone: T(palette.wingBar) },
            { loops: loopsOf(bar(0.12, -0.25, 0.4), s, spacing, minArea * 0.05, drawingSeed, boilAmp), tone: T(palette.wingBar) },
          ];
        },
        () => {
          if (pose.wingSpread > 0.2) return [];
          const lines: Point[][] = [];
          const sideFacing = toView(basis, sub(r.fromBody([0, side, 0]), r.fromBody([0, 0, 0])))[2];
          if (sideFacing > -0.2) return [];
          for (let f = 0; f < 4; f++) {
            const pts: Point[] = [];
            const v0 = -0.5 + f * 0.22;
            for (let i = 0; i <= 5; i++) {
              const t = i / 5;
              const u = -0.12 - 0.9 * t;
              const wl: V3 = [u * 0.88, side * 0.14, (v0 + 0.1 * t) * 0.5];
              const inv = rotateY(rotateZ(wl, -side * 0.12), -0.12);
              pts.push(screen(r.fromBody(add(inv, [-0.45, side * 0.6, 0.2]))));
            }
            lines.push(pts);
          }
          return lines;
        },
        0.15,
        pose.wingSpread > 0.3 ? 0.07 * pose.wingSpread : 0,
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
  bounds.y1 = Math.max(bounds.y1, footY + ppu * 0.3);
  const pad = 8;
  const layer = createLayer(bounds.x0 - pad, bounds.y0 - pad, bounds.x1 - bounds.x0 + 2 * pad, bounds.y1 - bounds.y0 + 2 * pad, ink.supersample);
  if (pose.legs) drawLegs(layer.ctx, pose, r, screen, style, lineBase, view.lighting, drawingSeed, boilAmp);
  for (const b of order) {
    drawCel(layer.ctx, b.part);
    if (b.after) b.after(layer.ctx);
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
  lighting: Lighting,
  seed: number,
  amp: number,
) => {
  const foot = tone(palette.foot, lighting);
  for (const side of [1, -1]) {
    const hip = r.fromBody([0.12, side * 0.3, -0.62]);
    const ankle: V3 = [hip[0] + 0.05, side * 0.32, FOOT_Z + 0.22];
    const toe: V3 = [ankle[0] + 0.32, side * 0.34, FOOT_Z];
    const back: V3 = [ankle[0] - 0.22, side * 0.33, FOOT_Z + 0.02];
    const pts = boil([screen(hip), screen(ankle), screen(toe)], seed + side, amp);
    const w = Math.max(2.2, lineBase * 1.6);
    ctx.strokeStyle = foot.shade;
    ctx.lineCap = "round";
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    const bk = boil([screen(back)], seed + side * 3, amp)[0];
    ctx.moveTo(pts[1][0], pts[1][1]);
    ctx.lineTo(bk[0], bk[1]);
    ctx.stroke();
    const outline = strokes(resample([pts[0], pts[1], pts[2]], 2, false), false, { ...style(80 + side, lineBase * 0.7), breakEvery: [1e4, 1e4], dropLit: 0 });
    drawStrokes(ctx, outline, ink.color);
  }
};

export const backlight: Lighting = {
  direction: [0.55, -0.5, 0.68],
  litTint: { color: warm.rim, amount: 0.25 },
  shadeTint: { color: warm.backSide, amount: 0.22 },
  rim: { color: warm.rim, alpha: 0.9 },
  threshold: 0.1,
};

export const sheetLight: Lighting = {
  direction: [0.55, -0.6, -0.6],
  threshold: 0.12,
};
