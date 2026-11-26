/**
 * 《雨后》的水粉底图（院子五层共用底图与通用水粉画法）：远景（天空、花椰菜状积云、云缝、远山）、稻田、树篱和树、院子、檐口。
 * 积云按花椰菜状层层云团组织，明暗完全由顺形水粉笔触堆叠（不用一圈圈等值色阶），朝太阳一侧留出清楚的亮边，阴影侧底部碎成小云团、不留直底边。
 * 夕光保持暖金与紫蓝阴影对比；同一套种子在雨色和夕光下落笔布局一致，镜头可按光照遮罩无缝过渡；同时导出通用水粉笔刷与手绘线辅助函数供各新机位底图复用。
 */
import { project } from "../../src/kit/engine/camera.ts";
import type { Vec3 } from "../../src/kit/engine/camera.ts";
import { contours, resample, smooth } from "../../src/kit/engine/figure.ts";
import type { Point } from "../../src/kit/engine/figure.ts";
import { fbm2, noise1, rng } from "../../src/kit/engine/random.ts";
import type { Rng } from "../../src/kit/engine/random.ts";
import { curve, mixRgb, mottle, paper, polygon, rgb, roughen, shadeRgb, stroke } from "../../src/kit/engine/paint.ts";
import type { Paper, Pt, RGB } from "../../src/kit/engine/paint.ts";
import { dusk, rain } from "./tokens.ts";
import { eave, plateSize, puddles, reference } from "./scene.ts";
import type { Plate } from "./scene.ts";

export type LightState = "rain" | "dusk";

export type PlateSpec = {
  rect: { x0: number; y0: number; x1: number; y1: number };
  k: number;
};

export type Brush = {
  c: Paper;
  P: (x: number, y: number) => Pt;
  k: number;
  r: Rng;
  dusk: boolean;
  rect: { x0: number; y0: number; x1: number; y1: number };
};

const SUN = { x: 1530, y: 250 };
const HORIZON = project(reference, [0, 1e5, 0]).y;

const ground = (x: number, d: number, z = 0) => project(reference, [x, d, z]);

const pick = (state: LightState, wet: string, warm: string, t = 1) => mixRgb(rgb(wet), rgb(warm), state === "dusk" ? t : 0);

export const makeBrush = (plate: PlateSpec, isDusk: boolean, seed: number): Brush => {
  const { width, height } = plateSize(plate);
  const k = plate.k;
  return {
    c: paper(width, height),
    P: (x, y) => [(x - plate.rect.x0) * k, (y - plate.rect.y0) * k],
    k,
    r: rng(seed),
    dusk: isDusk,
    rect: plate.rect,
  };
};

export const line = (b: Brush, pts: readonly [number, number][], width: number, color: RGB, extra: Partial<Parameters<typeof stroke>[2]> = {}) =>
  stroke(
    b.c,
    pts.map(([x, y]) => b.P(x, y)),
    { width: width * b.k, color, seed: Math.floor(b.r.next() * 1e6), ...extra },
  );

export const handPath = (
  b: Brush,
  a: [number, number],
  c: [number, number],
  jitterPx = 1.6,
  sagPx = 0,
  steps = 5,
): [number, number][] => {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const seed = Math.floor(b.r.next() * 1e5);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mid = Math.sin(Math.PI * t);
    const wave = (noise1(t * 3.1 + seed * 0.01, seed) - 0.5) * 2 * jitterPx * (0.25 + 0.75 * mid);
    pts.push([a[0] + dx * t + nx * wave, a[1] + dy * t + ny * wave + sagPx * mid]);
  }
  return pts;
};

export const handLine = (
  b: Brush,
  a: [number, number],
  c: [number, number],
  width: number,
  color: RGB,
  opts: Partial<Parameters<typeof stroke>[2]> & { jitterPx?: number; sagPx?: number; steps?: number } = {},
) => {
  const { jitterPx = 1.5, sagPx = 0, steps = 5, ...extra } = opts;
  line(b, handPath(b, a, c, jitterPx, sagPx, steps), width, color, extra);
};

export const bilerp = (
  tl: [number, number],
  tr: [number, number],
  br: [number, number],
  bl: [number, number],
  u: number,
  v: number,
): [number, number] => {
  const tx = tl[0] + (tr[0] - tl[0]) * u;
  const ty = tl[1] + (tr[1] - tl[1]) * u;
  const bx = bl[0] + (br[0] - bl[0]) * u;
  const by = bl[1] + (br[1] - bl[1]) * u;
  return [tx + (bx - tx) * v, ty + (by - ty) * v];
};

export const fill = (b: Brush, pts: readonly [number, number][], color: RGB, rough = 3, alpha = 1) =>
  polygon(
    b.c,
    roughen(
      pts.map(([x, y]) => b.P(x, y)),
      6 * b.k,
      rough * b.k,
      Math.floor(b.r.next() * 1e6),
    ),
    color,
    alpha,
  );

export const jitter = (b: Brush, c: RGB, amount = 0.05): RGB => {
  const k = 1 + b.r.range(-amount, amount);
  const h = b.r.range(-amount, amount) * 0.5;
  return [c[0] * k + h, c[1] * k, c[2] * k - h];
};

export const arc = (cx: number, cy: number, r: number, a0: number, a1: number, steps = 7): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  });

export const paintWash = (
  b: Brush,
  yMin: number,
  yMax: number,
  colorAt: (x: number, y: number) => RGB,
  grainAmp = 0.018,
  seed = 101,
) => {
  const { width, height, data } = b.c;
  const x0 = b.rect.x0;
  const y0 = b.rect.y0;
  const invK = 1 / b.k;
  const py0 = Math.max(0, Math.floor((yMin - y0) * b.k));
  const py1 = Math.min(height - 1, Math.ceil((yMax - y0) * b.k));
  for (let py = py0; py <= py1; py++) {
    const wy = y0 + py * invK;
    for (let px = 0; px < width; px++) {
      const wx = x0 + px * invK;
      const col = colorAt(wx, wy);
      const n = (fbm2(wx / 140, wy / 58, seed, 2) - 0.5) * 2 * grainAmp;
      const k = 1 + n;
      const idx = (py * width + px) * 4;
      data[idx] = Math.max(0, col[0] * k);
      data[idx + 1] = Math.max(0, col[1] * k);
      data[idx + 2] = Math.max(0, col[2] * k);
      data[idx + 3] = 1;
    }
  }
};

export const skyColor = (state: LightState, x: number, y: number): RGB => {
  const t = Math.max(0, Math.min(1, (y + 90) / (HORIZON + 90)));
  if (state === "rain") {
    const top = rgb(rain.sky[0]);
    const mid = rgb(rain.sky[1]);
    const low = rgb(rain.sky[2]);
    return t < 0.55 ? mixRgb(top, mid, t / 0.55) : mixRgb(mid, low, (t - 0.55) / 0.45);
  }
  const topCool = mixRgb(rgb(dusk.shadowViolet), rgb(dusk.cloud.shadow), 0.52);
  const midWarm = mixRgb(rgb(dusk.cloud.shadow), rgb(dusk.cloud.edge), 0.58);
  const lowGold = mixRgb(rgb(dusk.cloud.edge), rgb(dusk.cloudGap[1]), 0.65);
  let c = t < 0.5 ? mixRgb(topCool, midWarm, t / 0.5) : mixRgb(midWarm, lowGold, (t - 0.5) / 0.5);
  const dWide = Math.hypot((x - SUN.x) / 1.55, (y - SUN.y) / 1.05);
  const aura = Math.exp(-dWide / 820);
  const midGlow = Math.exp(-dWide / 390);
  const core = Math.exp(-Math.hypot((x - SUN.x) / 1.35, y - SUN.y) / 165);
  c = mixRgb(c, rgb(dusk.cloud.edge), aura * 0.52);
  c = mixRgb(c, rgb(dusk.cloudGap[1]), midGlow * 0.72);
  c = mixRgb(c, rgb(dusk.cloudGap[0]), core * 0.88);
  return c;
};

export type Puff = [number, number, number];

export type MassTones = { shadow: RGB; mid: RGB; lit: RGB; rim: RGB };

export type MassStyle = {
  tones: MassTones;
  floor?: number;
  sun?: { x: number; y: number };
  strokeLength: [number, number];
  strokeWidth: [number, number];
  density: number;
  rimWidth: number;
  dab?: boolean;
  litBias?: number;
  backlit?: boolean;
};

export const mass = (b: Brush, puffs: Puff[], st: MassStyle) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y, r] of puffs) {
    x0 = Math.min(x0, x - r * 1.4);
    y0 = Math.min(y0, y - r * 1.4);
    x1 = Math.max(x1, x + r * 1.4);
    y1 = Math.max(y1, y + r * 1.4);
  }
  const f = (x: number, y: number) => {
    let v = 0;
    for (const [px, py, r] of puffs) {
      const dx = x - px;
      const dy = y - py;
      v += Math.exp(-(dx * dx + dy * dy) / (r * r));
    }
    if (st.floor !== undefined) v *= Math.max(0, Math.min(1, (st.floor + 10 - y) / 20));
    return v;
  };
  const T = 0.55;
  const shadeAt = (x: number, y: number) => {
    const e = st.backlit ? 16 : 3;
    const gx = (f(x + e, y) - f(x - e, y)) / (2 * e);
    const gy = (f(x, y + e) - f(x, y - e)) / (2 * e);
    const l = Math.hypot(gx, gy) || 1;
    const n: [number, number] = [-gx / l, -gy / l];
    const sunPt = st.sun ?? { x: x + 600, y: y - 600 };
    const sx = sunPt.x - x;
    const sy = sunPt.y - y;
    const sl = Math.hypot(sx, sy) || 1;
    const facing = (n[0] * sx + n[1] * sy) / sl;
    const fv = f(x, y);
    const depth = Math.min(1, Math.max(0, (fv - T) / 0.8));
    const up = Math.max(0, Math.min(1, (y1 - y) / (y1 - y0)));
    const lump = (fbm2(x / 70, y / 70, 77, 2) - 0.5) * 0.1;
    const v = st.backlit
      ? facing * 0.55 * (1 - 0.35 * depth) + Math.exp(-depth / 0.18) * Math.max(0, facing) * 0.6 + up * 0.18 - 0.22 - depth * 0.04 + lump * 0.6
      : facing * 0.6 * (1 - depth * 0.5) + up * 0.42 - depth * 0.12 + lump;
    return { v: v + (st.litBias ?? 0), n };
  };
  const cell = 4;
  const nx = Math.ceil((x1 - x0) / cell) + 1;
  const ny = Math.ceil((y1 - y0) / cell) + 1;
  const grid = { x0, y0, cell, nx, ny };
  const fv = new Float32Array(nx * ny);
  const sv = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * cell;
      const y = y0 + j * cell;
      const v = f(x, y);
      fv[j * nx + i] = T - v;
      sv[j * nx + i] = v > T * 0.8 ? shadeAt(x, y).v : -1;
    }
  const zone = (threshold: number) => {
    const values = new Float32Array(nx * ny);
    for (let k = 0; k < values.length; k++) values[k] = Math.max(fv[k] * 4, threshold - sv[k]);
    return values;
  };
  const loopsFor = (values: Float32Array) =>
    contours(values, grid)
      .map((loop) => resample(smooth(loop, 2), 3))
      .filter((loop) => loop.length > 6);
  const t = st.tones;
  const paintLoops = (loops: Point[][], color: RGB, rough: number) => {
    for (const loop of loops) polygon(b.c, roughen(loop.map(([x, y]) => b.P(x, y)), 5 * b.k, rough * b.k, Math.floor(b.r.next() * 1e6)), color);
  };
  paintLoops(loopsFor(fv), jitter(b, t.shadow, 0.01), 1.2);
  const zones: [number, RGB][] = [
    [0.12, mixRgb(t.shadow, t.mid, 0.75)],
    [0.36, mixRgb(t.mid, t.lit, 0.8)],
    [0.6, mixRgb(t.lit, t.rim, 0.7)],
  ];
  const zoneLoops = zones.map(([th]) => loopsFor(zone(th)));
  zoneLoops.forEach((loops, i) => paintLoops(loops, jitter(b, zones[i][1], 0.01), 2.5));
  const area = (x1 - x0) * (y1 - y0);
  const count = Math.floor((area / 1400) * st.density);
  for (let i = 0; i < count; i++) {
    const x = b.r.range(x0, x1);
    const y = b.r.range(y0, y1);
    if (f(x, y) <= T + 0.03) continue;
    const { v, n } = shadeAt(x, y);
    let zi = -1;
    for (let z = 0; z < zones.length; z++) if (v > zones[z][0]) zi = z;
    const near = zones.some(([th]) => Math.abs(v - th) < 0.06);
    if (!near && b.r.next() < 0.7) continue;
    const color = zi >= 0 ? zones[zi][1] : t.shadow;
    const len = b.r.range(st.strokeLength[0], st.strokeLength[1]);
    const tx = -n[1];
    const ty = n[0];
    const pts: [number, number][] = st.dab
      ? [[x, y], [x + tx * len * 0.5 + n[0] * len * 0.15, y + ty * len * 0.5 + n[1] * len * 0.15]]
      : [[x - tx * len * 0.5, y - ty * len * 0.5], [x + n[0] * len * 0.06, y + n[1] * len * 0.06], [x + tx * len * 0.5, y + ty * len * 0.5]];
    line(b, pts, b.r.range(st.strokeWidth[0], st.strokeWidth[1]), jitter(b, color, 0.035), {
      dry: 0.25,
      body: 0.5,
      taper: st.dab ? [0.35, 0.4] : [0.25, 0.3],
    });
  }
  for (const loop of loopsFor(fv)) {
    for (let i = 0; i < loop.length; i += 3) {
      const [x, y] = loop[i];
      const { v } = shadeAt(x, y);
      if (v < 0.5 || b.r.next() < 0.45) continue;
      const seg = loop.slice(i, Math.min(loop.length, i + 1 + Math.floor(b.r.range(3, 9))));
      if (seg.length < 2) continue;
      line(b, seg.map(([px, py]) => [px, py] as [number, number]), st.rimWidth * b.r.range(0.6, 1.1), jitter(b, mixRgb(t.lit, t.rim, Math.min(1, v)), 0.02), { dry: 0.2, taper: [0.3, 0.3] });
      i += seg.length;
    }
  }
};

export const billows = (r: Rng, cx: number, base: number, width: number, height: number, flat = 0.22): Puff[] => {
  const out: Puff[] = [];
  const seed = Math.floor(Math.abs(cx) * 0.31 + Math.abs(base) * 0.17 + 19);
  const peakA = r.range(0.3, 0.44);
  const peakB = r.range(0.58, 0.74);
  const profile = (t: number) => {
    const env = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.58);
    const towerA = Math.exp(-Math.pow((t - peakA) / 0.22, 2));
    const towerB = 0.86 * Math.exp(-Math.pow((t - peakB) / 0.19, 2));
    const ripple = 0.82 + 0.24 * noise1(t * 6.8 + seed * 0.1, seed);
    return env * (0.44 + 0.64 * Math.max(towerA, towerB)) * ripple;
  };
  const baseWave = (t: number) => base + (noise1(t * 5.4 + seed * 0.2, seed + 3) - 0.46) * height * (0.14 + (1 - flat) * 0.14);

  const bellyCount = Math.max(7, Math.round(width / (height * 0.36)));
  for (let i = 0; i < bellyCount; i++) {
    const t = Math.max(0.05, Math.min(0.95, (i + 0.5) / bellyCount + r.range(-0.04, 0.04)));
    const hHere = height * profile(t);
    const rad = Math.max(28, hHere * r.range(0.34, 0.48));
    const by = baseWave(t);
    out.push([cx + (t - 0.5) * width, by - rad * r.range(0.32, 0.56), rad]);
  }

  const midCount = Math.max(9, Math.round((width / height) * 4.8 + 5));
  for (let i = 0; i < midCount; i++) {
    const t = Math.max(0.08, Math.min(0.92, (i + 0.45 + r.range(-0.18, 0.18)) / midCount));
    const hHere = height * profile(t);
    const rad = Math.max(24, hHere * r.range(0.26, 0.4));
    const px = cx + (t - 0.5) * width;
    const py = baseWave(t) - hHere * r.range(0.45, 0.78) + rad * 0.22;
    out.push([px, py, rad]);
    const sub = 2;
    for (let s = 0; s < sub; s++) {
      const a = r.range(-Math.PI * 0.88, -Math.PI * 0.12);
      const dist = rad * r.range(0.42, 0.7);
      out.push([px + Math.cos(a) * dist * 1.08, py + Math.sin(a) * dist * 0.88, rad * r.range(0.5, 0.72)]);
    }
  }

  const crownCount = Math.max(11, Math.round((width / height) * 6.0 + 6));
  for (let i = 0; i < crownCount; i++) {
    const t = r.range(0.08, 0.92);
    const hHere = height * profile(t);
    const rad = Math.max(18, hHere * r.range(0.17, 0.28));
    const px = cx + (t - 0.5) * width;
    const py = baseWave(t) - hHere * r.range(0.76, 1.0) + rad * r.range(0.18, 0.46);
    out.push([px, py, rad]);
    const a = r.range(-Math.PI * 0.9, 0.05);
    const dist = rad * r.range(0.45, 0.76);
    out.push([px + Math.cos(a) * dist * 1.08, py + Math.sin(a) * dist * 0.82, rad * r.range(0.48, 0.7)]);
  }

  const underCount = Math.max(11, Math.round(width / 88));
  for (let i = 0; i < underCount; i++) {
    const t = r.range(0.01, 0.96);
    const by = baseWave(t);
    const px = cx + (t - 0.5) * width;
    const rad = Math.max(12, height * r.range(0.06, 0.13));
    const drop = r.range(-rad * 0.1, rad * 1.25);
    out.push([px, by + drop, rad]);
  }
  return out;
};

const cloudTones = (state: LightState, x: number, y: number, weight: number): MassTones => {
  const sunness = Math.exp(-Math.hypot(x - SUN.x, y - SUN.y) / 780);
  if (state === "rain") {
    const shadow = mixRgb(rgb(rain.cloud.mid), rgb(rain.cloud.dark), 0.38 + weight * 0.44);
    const mid = mixRgb(shadow, rgb(rain.cloud.mid), 0.68);
    const lit = mixRgb(rgb(rain.cloud.mid), rgb(rain.cloud.edge), 0.58);
    const rim = rgb(rain.cloud.edge);
    return { shadow, mid, lit, rim };
  }
  const baseShadow = mixRgb(rgb(dusk.cloud.shadow), rgb(dusk.shadowViolet), 0.2 + weight * 0.22);
  const shadow = mixRgb(baseShadow, rgb(dusk.cloud.warm), sunness * 0.16);
  const mid = mixRgb(shadow, rgb(dusk.cloud.warm), 0.54 + sunness * 0.26);
  const lit = mixRgb(rgb(dusk.cloud.warm), rgb(dusk.cloud.edge), 0.64 + sunness * 0.3);
  const rim = mixRgb(rgb(dusk.cloudGap[1]), rgb(dusk.cloudGap[0]), 0.54 + sunness * 0.44);
  return { shadow, mid, lit, rim };
};

export const cloudCauliflower = (
  b: Brush,
  puffs: Puff[],
  tones: MassTones,
  sunPt: { x: number; y: number },
  isWarm: boolean,
) => {
  if (puffs.length === 0) return;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const [x, y, r] of puffs) {
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  }
  const spanY = Math.max(40, maxY - minY);
  const spanX = Math.max(80, maxX - minX);
  const cxAll = (minX + maxX) * 0.5;
  const cyAll = (minY + maxY) * 0.5;
  const baseSunX = sunPt.x - cxAll;
  const baseSunY = sunPt.y - cyAll;
  const baseSunLen = Math.hypot(baseSunX, baseSunY) || 1;
  const sunDirX = baseSunX / baseSunLen;
  const sunDirY = baseSunY / baseSunLen;

  const densityAt = (x: number, y: number, skipIdx: number) => {
    let s = 0;
    for (let i = 0; i < puffs.length; i++) {
      if (i === skipIdx) continue;
      const [px, py, r] = puffs[i];
      const dx = (x - px) / 1.16;
      const dy = y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r * 2.2) s += Math.exp(-d2 / (r * r));
    }
    return s;
  };

  type RichPuff = {
    x: number;
    y: number;
    r: number;
    wide: number;
    exposure: number;
    rimFactor: number;
    isFragment: boolean;
    sx: number;
    sy: number;
  };

  const rich: RichPuff[] = puffs.map(([x, y, r], idx) => {
    const dx = sunPt.x - x;
    const dy = sunPt.y - y;
    const dl = Math.hypot(dx, dy) || 1;
    const sx = dx / dl;
    const sy = dy / dl;
    const occ1 = densityAt(x + sx * r * 1.15, y + sy * r * 1.15, idx);
    const occ2 = densityAt(x + sx * r * 2.1, y + sy * r * 2.1, idx);
    const occUp = densityAt(x, y - r * 1.15, idx);
    const up = Math.max(0, Math.min(1, (maxY - y) / spanY));
    const sideToSun = ((x - cxAll) * sunDirX + (y - cyAll) * sunDirY) / (spanX * 0.5);
    const sunProx = Math.exp(-dl / 960);
    const isFragment = y > maxY - spanY * 0.25 && r < spanY * 0.16 && sideToSun < 0.35;
    const clearSun = Math.max(0, 1 - occ1 * 0.48 - occ2 * 0.25);
    const clearTop = Math.max(0, 1 - occUp * 0.42);
    const exposure = Math.max(
      0,
      Math.min(1, clearSun * 0.54 + clearTop * 0.2 + up * 0.24 + sideToSun * 0.32 + sunProx * 0.2 - (isFragment ? 0.6 : 0.18)),
    );
    const rimFactor = Math.max(0, Math.min(1, clearSun * 0.9 + Math.max(0, sideToSun) * 0.32 + up * 0.22 - 0.54));
    const wide = isFragment ? 1.48 + b.r.range(-0.1, 0.24) : 1.12 + 0.16 * noise1(x * 0.013 + y * 0.017, 61);
    return { x, y, r, wide, exposure, rimFactor, isFragment, sx, sy };
  });

  const deepShadow = shadeRgb(tones.shadow, isWarm ? 0.9 : 0.88);
  const softShadow = mixRgb(tones.shadow, tones.mid, 0.32);
  const warmMid = mixRgb(tones.shadow, tones.mid, 0.78);
  const warmLit = mixRgb(tones.mid, tones.lit, 0.82);

  const puffPoly = (p: RichPuff, scale = 1, ox = 0, oy = 0) =>
    arc(p.x + ox, p.y + oy, p.r * scale, 0, Math.PI * 2, 16)
      .slice(0, -1)
      .map(([px, py]) => [p.x + ox + (px - (p.x + ox)) * p.wide, py] as [number, number]);

  for (const p of rich) {
    if (p.isFragment) continue;
    const baseCol = mixRgb(deepShadow, tones.shadow, Math.min(1, 0.35 + p.exposure * 0.55));
    fill(b, puffPoly(p, 1.03), jitter(b, baseCol, 0.014), Math.max(2, p.r * 0.11), 0.98);
  }

  for (const p of rich) {
    if (!p.isFragment) continue;
    const sunNear = Math.exp(-Math.hypot(p.x - sunPt.x, p.y - sunPt.y) / 620);
    const wisps = 2 + Math.floor(b.r.next() * 2);
    for (let i = 0; i < wisps; i++) {
      const ox = b.r.range(-p.r * 0.7, p.r * 0.7);
      const oy = b.r.range(-p.r * 0.35, p.r * 0.4);
      const len = p.r * b.r.range(1.15, 2.0);
      const baseWisp = mixRgb(deepShadow, tones.shadow, b.r.range(0.18, 0.62));
      const col = isWarm ? mixRgb(baseWisp, tones.mid, sunNear * 0.45) : baseWisp;
      line(
        b,
        curve([p.x + ox - len * 0.5, p.y + oy], [p.x + ox + len * 0.5, p.y + oy + b.r.range(-4, 4)], b.r.range(-0.07, 0.07), 4),
        p.r * b.r.range(0.45, 0.85),
        jitter(b, col, 0.022),
        { dry: 0.46, body: 0.52, alpha: b.r.range(0.54, 0.8), taper: [0.38, 0.38], streak: 0.05 },
      );
    }
  }

  const shadowSweepCount = Math.max(12, Math.round(spanX / 95));
  for (let i = 0; i < shadowSweepCount; i++) {
    const p = rich[Math.floor(b.r.next() * rich.length)];
    if (p.isFragment || p.exposure > 0.65) continue;
    const len = p.r * b.r.range(1.1, 1.9);
    const col = b.r.next() < 0.45 ? deepShadow : softShadow;
    line(
      b,
      curve([p.x - len * 0.5, p.y + b.r.range(-p.r * 0.2, p.r * 0.3)], [p.x + len * 0.5, p.y + b.r.range(-p.r * 0.2, p.r * 0.3)], b.r.range(-0.08, 0.08), 4),
      p.r * b.r.range(0.32, 0.48),
      jitter(b, col, 0.014),
      { dry: 0.48, body: 0.46, alpha: b.r.range(0.16, 0.28), taper: [0.42, 0.42], streak: 0.04 },
    );
  }

  const bodyPuffs = rich
    .filter((p) => !p.isFragment && p.exposure > 0.2)
    .sort((a, c) => a.exposure - c.exposure);

  for (const p of bodyPuffs) {
    const sunAngle = Math.atan2(p.sy - 0.36, p.sx);
    const shift = p.r * 0.22;
    const colMid = isWarm
      ? mixRgb(softShadow, warmMid, Math.min(1, (p.exposure - 0.16) / 0.5))
      : mixRgb(tones.shadow, tones.mid, Math.min(0.85, (p.exposure - 0.18) / 0.55));
    fill(b, puffPoly(p, 0.86, Math.cos(sunAngle) * shift * p.wide, Math.sin(sunAngle) * shift), jitter(b, colMid, 0.015), Math.max(2, p.r * 0.15), 0.78);

    const midStrokes = p.r > 48 ? 5 : 3;
    for (let i = 0; i < midStrokes; i++) {
      const a = sunAngle + b.r.range(-1.15, 1.15);
      const dist = p.r * b.r.range(0.15, 0.56);
      const mx = p.x + Math.cos(a) * dist * p.wide;
      const my = p.y + Math.sin(a) * dist;
      const tx = -Math.sin(a);
      const ty = Math.cos(a);
      const half = p.r * b.r.range(0.28, 0.54);
      line(
        b,
        curve([mx - tx * half, my - ty * half], [mx + tx * half, my + ty * half], b.r.range(-0.14, 0.14), 4),
        p.r * b.r.range(0.36, 0.58),
        jitter(b, colMid, 0.018),
        { dry: 0.36, body: 0.62, alpha: b.r.range(0.46, 0.72), taper: [0.38, 0.38], streak: 0.05 },
      );
    }
  }

  const litPuffs = rich
    .filter((p) => !p.isFragment && p.exposure > 0.36)
    .sort((a, c) => a.exposure - c.exposure);

  for (const p of litPuffs) {
    const sunAngle = Math.atan2(p.sy - 0.36, p.sx);
    const strength = Math.min(1, (p.exposure - 0.34) / 0.5);
    const shift = p.r * 0.3;
    const colLit = isWarm
      ? mixRgb(warmMid, warmLit, 0.42 + strength * 0.58)
      : mixRgb(tones.mid, tones.lit, 0.38 + strength * 0.48);
    fill(b, puffPoly(p, 0.72, Math.cos(sunAngle) * shift * p.wide, Math.sin(sunAngle) * shift), jitter(b, colLit, 0.015), Math.max(1.8, p.r * 0.15), 0.74);

    const litStrokes = p.r > 46 ? 5 : 3;
    for (let i = 0; i < litStrokes; i++) {
      const a = sunAngle + b.r.range(-0.88, 0.88);
      const dist = p.r * b.r.range(0.3, 0.68);
      const mx = p.x + Math.cos(a) * dist * p.wide;
      const my = p.y + Math.sin(a) * dist;
      const tx = -Math.sin(a);
      const ty = Math.cos(a);
      const half = p.r * b.r.range(0.26, 0.46);
      const c = isWarm ? mixRgb(colLit, tones.lit, b.r.range(0.28, 0.82)) : colLit;
      line(
        b,
        curve([mx - tx * half, my - ty * half], [mx + tx * half, my + ty * half], b.r.range(0.06, 0.18), 4),
        p.r * b.r.range(0.28, 0.46),
        jitter(b, c, 0.014),
        { dry: 0.3, body: 0.7, alpha: b.r.range(0.56, 0.82), taper: [0.36, 0.36], streak: 0.04 },
      );
    }
  }

  const rimPuffs = rich
    .filter((p) => !p.isFragment && p.rimFactor > 0.22)
    .sort((a, c) => a.rimFactor - c.rimFactor);

  for (const p of rimPuffs) {
    const sunAngle = Math.atan2(p.sy - 0.38, p.sx);
    const rimCount = p.r > 40 ? 3 : 2;
    for (let i = 0; i < rimCount; i++) {
      const a = sunAngle + b.r.range(-0.62, 0.62);
      const span = b.r.range(0.26, 0.52);
      const rr = p.r * b.r.range(0.74, 0.94);
      const pts = arc(p.x, p.y, rr, a - span, a + span, 5).map(
        ([px, py]) => [p.x + (px - p.x) * p.wide, py] as [number, number],
      );
      const rimCol = isWarm
        ? mixRgb(tones.lit, tones.rim, Math.min(1, 0.46 + p.rimFactor * 0.54))
        : mixRgb(tones.mid, tones.rim, Math.min(0.7, 0.3 + p.rimFactor * 0.42));
      line(b, pts, Math.max(4.5, p.r * b.r.range(0.14, 0.24)), jitter(b, rimCol, 0.012), {
        dry: 0.22,
        body: 0.84,
        alpha: isWarm ? b.r.range(0.76, 0.94) : b.r.range(0.42, 0.64),
        taper: [0.36, 0.36],
        streak: 0.04,
      });
    }
  }
};

export const cloudVolumetric = (
  b: Brush,
  puffs: Puff[],
  tones: MassTones,
  sunPt: { x: number; y: number },
  isWarm: boolean,
) => {
  cloudCauliflower(b, puffs, tones, sunPt, isWarm);
};

const cloud = (b: Brush, state: LightState, puffs: Puff[], weight: number) => {
  const cx = puffs.reduce((a, p) => a + p[0], 0) / puffs.length;
  const cy = puffs.reduce((a, p) => a + p[1], 0) / puffs.length;
  const t = cloudTones(state, cx, cy, weight);
  cloudCauliflower(b, puffs, t, SUN, state === "dusk");
};

const paintFar = (plate: Plate, state: LightState): Paper => {
  const b = makeBrush(plate, state === "dusk", 1601);
  const { rect } = plate;
  paintWash(b, rect.y0, HORIZON + 45, (x, y) => skyColor(state, x, y), 0.015, 1601);
  for (let i = 0; i < 38; i++) {
    const y = b.r.range(rect.y0 + 16, HORIZON - 70);
    const x = b.r.range(rect.x0 - 80, rect.x1 - 180);
    const len = b.r.range(240, 580);
    const mx = x + len * 0.5;
    const base = skyColor(state, mx, y);
    const tint = state === "dusk" ? mixRgb(base, rgb(dusk.cloudGap[1]), 0.14) : mixRgb(base, rgb(rain.cloud.edge), 0.09);
    line(
      b,
      curve([x, y], [x + len, y + b.r.range(-9, 9)], b.r.range(-0.02, 0.02)),
      b.r.range(28, 56),
      jitter(b, tint, 0.018),
      { dry: 0.36, body: 0.45, alpha: 0.36, streak: 0.06, taper: [0.35, 0.35] },
    );
  }
  if (state === "dusk") {
    for (let i = 0; i < 72; i++) {
      const a = b.r.range(0, Math.PI * 2);
      const d = Math.abs(b.r.gauss()) * 165;
      const x = SUN.x + Math.cos(a) * d * 1.8;
      const y = SUN.y + Math.sin(a) * d * 0.72;
      const fade = Math.max(0.22, 1 - d / 420);
      const len = b.r.range(70, 320) * fade;
      line(
        b,
        curve([x - len / 2, y], [x + len / 2, y + b.r.range(-5, 5)], b.r.range(-0.03, 0.03)),
        b.r.range(8, 26) * fade,
        jitter(b, mixRgb(rgb(dusk.cloudGap[0]), rgb(dusk.cloudGap[1]), Math.min(1, d / 260)), 0.015),
        { dry: 0.25, alpha: b.r.range(0.32, 0.65), taper: [0.38, 0.38], streak: 0.04 },
      );
    }
  }
  for (let i = 0; i < 12; i++) {
    const y = b.r.range(HORIZON - 145, HORIZON - 68);
    const x = b.r.range(rect.x0, rect.x1);
    const len = b.r.range(200, 480);
    const c =
      state === "dusk"
        ? mixRgb(rgb(dusk.cloud.shadow), rgb(dusk.cloud.warm), 0.45)
        : mixRgb(rgb(rain.cloud.mid), skyColor(state, x, y), 0.38);
    line(b, curve([x, y], [x + len, y + b.r.range(-5, 5)], 0.01), b.r.range(9, 18), jitter(b, c, 0.025), {
      dry: 0.42,
      alpha: 0.68,
      taper: [0.35, 0.35],
    });
    if (state === "dusk") {
      line(
        b,
        curve([x + 18, y - 5], [x + len * 0.75, y - 6], 0.01),
        b.r.range(4, 8),
        jitter(b, rgb(dusk.cloudGap[1]), 0.02),
        { dry: 0.35, alpha: 0.82, taper: [0.35, 0.35] },
      );
    }
  }
  cloud(b, state, billows(b.r, 560, 420, 1250, 420), 1);
  cloud(b, state, billows(b.r, 60, 470, 600, 190), 1);
  cloud(b, state, billows(b.r, 1260, 210, 560, 190), 0.85);
  cloud(b, state, billows(b.r, 1960, 360, 520, 290), 0.8);
  for (let i = 0; i < 10; i++) {
    const y = b.r.range(468, 536);
    const x = b.r.range(720, 1980);
    const len = b.r.range(160, 380);
    const col = cloudTones(state, x, y, 0.45);
    line(b, curve([x, y], [x + len, y + b.r.range(-5, 5)], 0.015), b.r.range(8, 16), jitter(b, mixRgb(col.shadow, col.mid, 0.56), 0.025), {
      dry: 0.4,
      body: 0.52,
      alpha: 0.72,
      taper: [0.36, 0.36],
    });
    line(b, curve([x + len * 0.14, y - 5], [x + len * 0.82, y - 7], 0.01), b.r.range(3.5, 6.5), jitter(b, col.rim, 0.02), {
      dry: 0.32,
      alpha: state === "dusk" ? 0.84 : 0.48,
      taper: [0.35, 0.35],
    });
  }
  const ridge = (x: number, baseY: number, amp: number, seed: number) => {
    let h = (fbm2(x / 260, 0.5, seed, 4) - 0.3) * 0.45;
    for (let i = 0; i < 4; i++) {
      const px = -200 + i * 700 + (noise1(i * 3.7, seed) - 0.5) * 400;
      const w = 260 + noise1(i * 1.3, seed + 1) * 240;
      h += (0.45 + noise1(i * 2.1, seed + 2) * 0.55) * Math.exp(-Math.abs(x - px) / w);
    }
    return baseY - h * amp;
  };
  const farPts: [number, number][] = [];
  for (let x = rect.x0; x <= rect.x1; x += 10) farPts.push([x, ridge(x, HORIZON - 40, 120, 3)]);
  const farCol = state === "dusk" ? mixRgb(rgb(dusk.mountain), rgb(dusk.cloud.edge), 0.24) : rgb(rain.mountain);
  fill(b, [...farPts, [rect.x1, HORIZON + 30], [rect.x0, HORIZON + 30]], jitter(b, mixRgb(farCol, skyColor(state, 1100, HORIZON - 40), 0.36), 0.01), 2);
  for (let x = rect.x0; x < rect.x1; x += b.r.range(16, 46)) {
    const y = ridge(x, HORIZON - 40, 120, 3);
    const slope = ridge(x + 10, HORIZON - 40, 120, 3) - y;
    if (state === "dusk" && slope > 0.3) {
      line(
        b,
        curve([x, y + 3], [x + b.r.range(45, 115), y + 28 + b.r.range(0, 48)], 0.08),
        b.r.range(16, 32),
        jitter(b, mixRgb(farCol, rgb(dusk.cloudGap[1]), 0.42), 0.025),
        { dry: 0.55, alpha: 0.52 },
      );
    } else {
      line(
        b,
        curve([x, y + 6], [x - b.r.range(30, 90), y + 30 + b.r.range(0, 50)], -0.06),
        b.r.range(14, 28),
        jitter(b, mixRgb(farCol, rgb(dusk.shadowViolet), 0.24), 0.025),
        { dry: 0.6, alpha: 0.36 },
      );
    }
  }
  const nearCol = state === "dusk" ? mixRgb(rgb(dusk.shadowTeal), rgb(dusk.paddyLit[1]), 0.18) : rgb(rain.mountain);
  const crowns: Puff[] = [];
  for (let x = rect.x0 - 20; x < rect.x1 + 20; ) {
    const grove = noise1(x / 160, 31);
    const r = b.r.range(5, 13) * (0.6 + grove * 0.9);
    const y = ridge(x, HORIZON - 14, 60, 11) * 0.25 + (HORIZON - 4) * 0.75 - grove * 26 - r * b.r.range(0.2, 0.9);
    crowns.push([x, y, r]);
    x += r * b.r.range(0.9, 1.6);
  }
  const top: [number, number][] = [];
  for (let x = rect.x0 - 20; x <= rect.x1 + 20; x += 3) {
    let y = HORIZON - 5;
    for (const [cx, cy, r] of crowns) {
      const dx = x - cx;
      if (Math.abs(dx) < r) y = Math.min(y, cy - Math.sqrt(r * r - dx * dx) * 0.9);
    }
    top.push([x, y]);
  }
  fill(b, [...top, [rect.x1 + 20, rect.y1], [rect.x0 - 20, rect.y1]], shadeRgb(nearCol, 0.85), 1);
  for (const [cx, cy, r] of crowns) {
    if (state === "dusk" && b.r.next() < 0.65) {
      line(b, arc(cx, cy, r * 0.72, -1.7, -0.15, 5), r * 0.55, jitter(b, mixRgb(rgb(dusk.paddyLit[0]), rgb(dusk.cloudGap[1]), b.r.range(0.2, 0.55)), 0.04), {
        dry: 0.3,
        taper: [0.3, 0.4],
      });
    } else if (b.r.next() < 0.5) {
      line(b, arc(cx, cy, r * 0.65, -2.8, -1.4, 5), r * 0.45, jitter(b, mixRgb(nearCol, rgb(rain.cloud.mid), b.r.range(0.1, 0.25)), 0.05), {
        dry: 0.35,
        taper: [0.3, 0.4],
      });
    }
  }
  for (let i = 0; i < 36; i++) {
    const x = b.r.range(rect.x0, rect.x1);
    const y = HORIZON + b.r.range(-12, 8);
    const mist = state === "dusk" ? mixRgb(rgb(dusk.cloudGap[1]), rgb(dusk.cloud.edge), 0.45) : mixRgb(skyColor(state, x, HORIZON - 30), nearCol, 0.3);
    line(b, curve([x, y], [x + b.r.range(140, 320), y], 0.005), b.r.range(8, 16), jitter(b, mist, 0.02), { dry: 0.5, alpha: state === "dusk" ? 0.48 : 0.55 });
  }
  mottle(b.c, 95 * b.k, 0.026, 7);
  return b.c;
};

const paintField = (plate: Plate, state: LightState): Paper => {
  const b = makeBrush(plate, state === "dusk", 2602);
  const { rect } = plate;
  const lit = (x: number, y: number) =>
    state === "dusk" ? Math.max(0.28, Math.min(1, (fbm2(x / 380, y / 60, 41, 3) - 0.24) * 2.8)) : 0;
  const fieldBack = rgb(rain.paddyBack);
  const litA = rgb(dusk.paddyLit[0]);
  const litB = rgb(dusk.paddyLit[1]);
  const litGold = mixRgb(litA, rgb(dusk.waterGlint), 0.32);
  const shadow = pick(state, rain.paddyBack, dusk.shadowTeal, 0.48);
  fill(
    b,
    [
      [rect.x0, HORIZON - 4],
      [rect.x1, HORIZON - 4],
      [rect.x1, rect.y1],
      [rect.x0, rect.y1],
    ],
    state === "dusk" ? mixRgb(litB, shadow, 0.38) : mixRgb(fieldBack, shadow, 0.5),
    1,
  );
  for (let d = 600; d > 18; d *= 0.93) {
    const y = ground(0, d).y;
    if (y > rect.y1 + 10) continue;
    const thick = Math.max(2, (ground(0, d * 0.93).y - y) * 1.15);
    for (let x = rect.x0 - 50; x < rect.x1; ) {
      const len = b.r.range(80, 260) * (1 + 60 / d);
      const l = lit(x + len / 2, y);
      const sunSide = Math.max(0, Math.min(1, (x - 200) / 1700));
      const baseLit = mixRgb(litB, litGold, 0.35 + 0.5 * b.r.next() + 0.15 * sunSide);
      const col = mixRgb(mixRgb(fieldBack, shadow, 0.55), baseLit, l);
      const haze = Math.max(0, Math.min(1, (d - 40) / 620)) * (state === "dusk" ? 0.34 : 0.22);
      const hazeCol = state === "dusk" ? rgb(dusk.cloudGap[1]) : skyColor(state, x, HORIZON);
      line(b, curve([x, y], [x + len, y + b.r.range(-1, 1)], 0.002), thick, jitter(b, mixRgb(col, hazeCol, haze), 0.035), {
        dry: 0.3,
        body: 0.52,
      });
      if (b.r.next() < 0.38) {
        const wy = y + thick * b.r.range(-0.3, 0.3);
        const water = state === "dusk" ? mixRgb(rgb(dusk.waterGlint), rgb(dusk.cloudGap[0]), 0.32) : rgb(rain.paddyWater);
        line(b, curve([x + len * 0.2, wy], [x + len * b.r.range(0.4, 0.9), wy], 0), Math.max(1.2, thick * 0.3), jitter(b, water, 0.035), { dry: 0.48, alpha: 0.9 });
      }
      x += len * b.r.range(0.7, 1.0);
    }
    if (d < 70) {
      const count = Math.floor((rect.x1 - rect.x0) / (220 / (70 / d)));
      for (let i = 0; i < count; i++) {
        const x = b.r.range(rect.x0, rect.x1);
        const h = (240 / d) * b.r.range(0.7, 1.2);
        const l = lit(x, y);
        const col = mixRgb(shadow, litGold, l * b.r.range(0.65, 1));
        line(b, [[x, y + 1], [x + b.r.range(-2, 2) * (h / 6), y - h]], Math.max(1.4, h * 0.22), jitter(b, col, 0.05), { taper: [0.1, 0.6], dry: 0.2 });
      }
    }
  }
  const trees: [number, number, number][] = [[260, 0, 1.2], [640, 0, 0.7], [1420, 0, 1.0], [1700, 0, 0.8]];
  for (const [tx, , s] of trees) {
    const y = HORIZON + 2;
    const w = 90 * s;
    const h = 46 * s;
    const col = pick(state, rain.hedge, dusk.shadowTeal, 0.45);
    fill(
      b,
      arc(tx, y, w, Math.PI, Math.PI * 2, 12)
        .map(([x, yy]) => [x, y - (y - yy) * (h / w)] as [number, number])
        .concat([[tx + w, y + 4], [tx - w, y + 4]]),
      mixRgb(col, state === "dusk" ? rgb(dusk.cloud.edge) : skyColor(state, tx, HORIZON - 20), 0.28),
      3,
    );
    if (state === "dusk") {
      for (let i = 0; i < 8; i++) {
        const a = b.r.range(-1.6, -0.2);
        line(
          b,
          arc(tx, y, w * b.r.range(0.6, 0.95), a - 0.25, a + 0.2, 4).map(([x, yy]) => [x, y - (y - yy) * (h / w)] as [number, number]),
          5.5 * s,
          jitter(b, mixRgb(litA, rgb(dusk.cloudGap[1]), 0.45), 0.035),
          { dry: 0.35 },
        );
      }
    }
  }
  const houseX = 1080;
  const hy = HORIZON + 1;
  fill(
    b,
    [[houseX - 50, hy], [houseX - 40, hy - 16], [houseX + 46, hy - 16], [houseX + 58, hy]],
    mixRgb(pick(state, rain.wood, dusk.shadowViolet, 0.4), state === "dusk" ? rgb(dusk.cloud.edge) : skyColor(state, houseX, HORIZON - 20), 0.34),
    1,
  );
  if (state === "dusk") line(b, [[houseX - 38, hy - 16], [houseX + 44, hy - 16]], 2.6, rgb(dusk.cloudGap[0]), { dry: 0.2 });
  mottle(b.c, 70 * b.k, 0.035, 9);
  return b.c;
};

const paintHedge = (plate: Plate, state: LightState): Paper => {
  const b = makeBrush(plate, state === "dusk", 3603);
  const shadow = mixRgb(rgb(rain.hedge), pick(state, rain.hedge, dusk.shadowTeal, 0.55), 0.65);
  const mid = rgb(rain.hedge);
  const lit = state === "dusk" ? rgb(dusk.paddyLit[0]) : mixRgb(mid, rgb(rain.paddyWater), 0.3);
  const tones = (k: number): MassTones => ({
    shadow: shadeRgb(shadow, 0.85 + 0.1 * k),
    mid: mixRgb(shadow, mid, 0.6 + 0.2 * k),
    lit: mixRgb(mid, lit, state === "dusk" ? 0.8 : 0.4),
    rim: state === "dusk" ? mixRgb(lit, rgb(dusk.cloudGap[1]), 0.65) : mixRgb(mid, rgb(rain.cloud.edge), 0.3),
  });
  const treeX = 420;
  const trunkBase = ground(-6.4, 13).y;
  const crownY = trunkBase - 340;
  const trunkCol = pick(state, rain.wood, dusk.shadowViolet, 0.35);
  line(b, [[treeX + 10, trunkBase], [treeX - 6, crownY + 120], [treeX + 18, crownY + 40]], 22, trunkCol, { taper: [0.05, 0.4], dry: 0.1, body: 0.6 });
  line(b, [[treeX - 4, crownY + 160], [treeX - 100, crownY + 50]], 10, trunkCol, { taper: [0.05, 0.6] });
  line(b, [[treeX + 8, crownY + 120], [treeX + 130, crownY + 30]], 9, trunkCol, { taper: [0.05, 0.6] });
  if (state === "dusk") {
    line(b, [[treeX + 18, trunkBase - 20], [treeX + 3, crownY + 125]], 4, rgb(dusk.cloud.edge), { dry: 0.35, alpha: 0.7, taper: [0.2, 0.3] });
  }
  const crown: Puff[] = [];
  for (let i = 0; i < 6; i++) crown.push([treeX + b.r.gauss() * 80, crownY + b.r.gauss() * 40 - 10, b.r.range(45, 75)]);
  for (let i = 0; i < 9; i++) {
    const a = b.r.range(-Math.PI, Math.PI * 0.1);
    const cx = treeX + Math.cos(a) * b.r.range(90, 160);
    const cy = crownY - 10 + Math.sin(a) * b.r.range(60, 110);
    crown.push([cx, cy, b.r.range(34, 52)]);
    for (let k = 0; k < 4; k++) crown.push([cx + b.r.gauss() * 30, cy + b.r.gauss() * 22, b.r.range(14, 26)]);
  }
  mass(b, crown, { tones: tones(0.3), sun: SUN, strokeLength: [14, 26], strokeWidth: [7, 12], density: 5, rimWidth: 4.5, dab: true, backlit: true });
  const top = (x: number) => ground(0, 11, 1.0).y + (noise1(x / 90, 7) - 0.5) * 30;
  const baseY = ground(0, 11).y;
  const soil = state === "dusk" ? mixRgb(rgb(dusk.yardLit), rgb(dusk.shadowViolet), 0.35) : rgb(rain.yardWet);
  fill(b, [[plate.rect.x0, baseY - 2], [plate.rect.x1, baseY - 2], [plate.rect.x1, plate.rect.y1], [plate.rect.x0, plate.rect.y1]], soil, 1);
  for (let y = baseY; y < plate.rect.y1; y += 7) {
    for (let x = plate.rect.x0 - 40; x < plate.rect.x1; x += b.r.range(80, 220)) {
      line(b, curve([x, y], [x + b.r.range(60, 200), y + b.r.range(-1.5, 1.5)], 0.003), b.r.range(4, 8), jitter(b, mixRgb(soil, shadow, b.r.range(0, 0.35)), 0.045), { dry: 0.4, body: 0.45 });
    }
  }
  const band: [number, number][] = [];
  for (let x = plate.rect.x0 - 40; x <= plate.rect.x1 + 40; x += 30) band.push([x, baseY - (baseY - top(x)) * 0.5]);
  band.push([plate.rect.x1 + 40, baseY + 6], [plate.rect.x0 - 40, baseY + 6]);
  fill(b, band, tones(0.5).shadow, 1);
  for (let row = 0; row < 2; row++) {
    for (let x = plate.rect.x0 - 40; x < plate.rect.x1 + 40; ) {
      const w = b.r.range(260, 520);
      const h = (baseY - top(x)) * (row === 0 ? 1 : 0.55);
      const puffs: Puff[] = [];
      const n = Math.round(w / 22) + 4;
      for (let i = 0; i < n; i++) {
        const t = b.r.next();
        const crownT = 0.55 + 0.45 * Math.sin(Math.PI * t);
        const rad = h * b.r.range(0.12, 0.36) * crownT;
        const yTop = baseY - h * crownT * (0.85 + 0.25 * noise1(x * 0.01 + t * 5, 9));
        puffs.push([x + t * w, yTop + rad * b.r.range(0.6, 1.6) + (row === 0 ? 0 : h * 0.6), rad]);
      }
      puffs.push([x + w * 0.5, baseY - h * 0.25 + (row === 0 ? 0 : h * 0.4), h * 0.45]);
      mass(b, puffs, { tones: tones(row === 0 ? 0 : 0.5), sun: SUN, floor: baseY + 4, strokeLength: [10, 20], strokeWidth: [5, 9], density: 4, rimWidth: 3.5, dab: true, backlit: true });
      x += w * b.r.range(0.55, 0.85);
    }
  }
  for (let x = plate.rect.x0; x < plate.rect.x1; x += b.r.range(60, 140)) {
    line(b, curve([x, baseY - 3], [x + b.r.range(60, 140), baseY - 1], 0.01), b.r.range(8, 14), shadeRgb(shadow, 0.72), { dry: 0.4, alpha: 0.85 });
  }
  mottle(b.c, 60 * b.k, 0.036, 13);
  return b.c;
};

const paintYard = (plate: Plate, state: LightState): Paper => {
  const b = makeBrush(plate, state === "dusk", 4604);
  const { rect } = plate;
  const soil = state === "dusk" ? mixRgb(rgb(dusk.yardLit), rgb(dusk.shadowViolet), 0.22) : rgb(rain.yardWet);
  const soilLit = state === "dusk" ? mixRgb(rgb(dusk.yardLit), rgb(dusk.cloud.edge), 0.28) : mixRgb(rgb(rain.yardWet), rgb(rain.wood), 0.4);
  const top = ground(0, 11).y - 4;
  fill(b, [[rect.x0, top], [rect.x1, top], [rect.x1, rect.y1], [rect.x0, rect.y1]], soil, 1);
  for (let d = 11; d > 5; d *= 0.965) {
    const y = ground(0, d).y;
    const thick = Math.max(3, (ground(0, d * 0.965).y - y) * 1.3);
    for (let x = rect.x0 - 40; x < rect.x1; ) {
      const len = b.r.range(60, 200);
      const n = noise1(x / 300 + d, 17);
      const col = mixRgb(soil, soilLit, Math.max(0, n - 0.22) * 1.35);
      line(b, curve([x, y], [x + len, y + b.r.range(-1.5, 1.5)], 0.003), thick, jitter(b, col, 0.045), { dry: 0.35, body: 0.45 });
      x += len * b.r.range(0.6, 0.95);
    }
  }
  for (const { x: px, depth: d, width: w } of puddles) {
    const y = ground(0, d).y;
    const wpx = w * (project(reference, [1, d, 0]).x - project(reference, [0, d, 0]).x);
    const h = (ground(0, d * 0.9).y - y) * 0.9;
    const ellipse = (sx: number, sy: number) =>
      arc(px, y, wpx * sx, 0, Math.PI * 2, 24).slice(0, -1).map(([x, yy]) => [x, y + (yy - y) * ((h * sy) / wpx)] as [number, number]);
    fill(b, ellipse(1.07, 1.16), mixRgb(shadeRgb(soil, 0.78), rgb(dusk.shadowViolet), state === "dusk" ? 0.22 : 0.1), h * 0.08, 0.65);
    const far =
      state === "dusk"
        ? mixRgb(rgb(dusk.cloudGap[1]), rgb(dusk.waterGlint), 0.45)
        : mixRgb(rgb(rain.cloud.edge), rgb(rain.sky[2]), 0.5);
    const near =
      state === "dusk"
        ? mixRgb(rgb(dusk.cloud.edge), rgb(dusk.cloud.shadow), 0.35)
        : mixRgb(rgb(rain.cloud.dark), rgb(rain.paddyWater), 0.45);
    const hedgeRef = pick(state, rain.hedge, dusk.shadowTeal, 0.55);
    fill(b, ellipse(1, 1), mixRgb(far, near, 0.45), h * 0.04);
    const rows = Math.max(6, Math.round(h / 3));
    for (let i = 0; i < rows; i++) {
      const u = (i + 0.5) / rows;
      const yy = y - h + 2 * h * u;
      const half = wpx * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2))) * 0.96;
      if (half < 4) continue;
      const col = u < 0.2 ? mixRgb(hedgeRef, far, (u / 0.2) * 0.65) : mixRgb(far, near, Math.pow((u - 0.2) / 0.8, 0.85));
      for (let x = px - half; x < px + half; ) {
        const len = Math.min(px + half - x, b.r.range(40, 140));
        line(b, [[x, yy], [x + len, yy + b.r.range(-0.6, 0.6)]], ((2 * h) / rows) * 1.4, jitter(b, col, 0.025), { dry: 0.15, body: 0.8, alpha: 0.9 });
        x += len * b.r.range(0.7, 0.95);
      }
    }
    for (let i = 0; i < 5; i++) {
      const u = b.r.range(0.28, 0.78);
      const yy = y - h + 2 * h * u;
      const half = wpx * Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2)));
      const x0 = px + b.r.range(-half * 0.7, half * 0.1);
      const col = state === "dusk" ? rgb(b.r.next() < 0.5 ? dusk.waterGlint : dusk.cloudGap[0]) : mixRgb(rgb(rain.cloud.edge), rgb(rain.sky[2]), 0.3);
      line(b, [[x0, yy], [x0 + half * b.r.range(0.3, 0.62), yy]], b.r.range(1.6, 3.2), col, { dry: 0.45, alpha: 0.82, taper: [0.3, 0.3] });
    }
  }
  const stones: [number, number][] = [[880, 8.6], [1010, 7.3], [1150, 6.3]];
  for (const [sx, d] of stones) {
    const y = ground(0, d).y;
    const w = 0.35 * (project(reference, [1, d, 0]).x - project(reference, [0, d, 0]).x);
    const h = (ground(0, d * 0.94).y - y) * 1.1;
    const stoneDark = pick(state, rain.poleShadow, dusk.shadowViolet, 0.42);
    const stoneLit = state === "dusk" ? mixRgb(rgb(dusk.yardLit), rgb(dusk.cloudGap[1]), 0.48) : rgb(rain.pole);
    fill(b, arc(sx, y, w, 0, Math.PI * 2, 14).slice(0, -1).map(([x, yy]) => [x, y + (yy - y) * (h / w)] as [number, number]), stoneDark, 2);
    line(b, arc(sx, y, w * 0.8, Math.PI * 1.1, Math.PI * 1.85, 5).map(([x, yy]) => [x, y + (yy - y) * (h / w)] as [number, number]), h * 0.35, stoneLit, { dry: 0.3 });
  }
  mottle(b.c, 50 * b.k, 0.042, 15);
  return b.c;
};

const paintEaves = (plate: Plate, state: LightState): Paper => {
  const b = makeBrush(plate, state === "dusk", 5605);
  const { rect } = plate;
  const dark = state === "dusk" ? rgb(dusk.eavesBounce) : rgb(rain.eavesDark);
  const wood = state === "dusk" ? mixRgb(rgb(rain.wood), rgb(dusk.yardLit), 0.22) : rgb(rain.wood);
  const bounce = state === "dusk" ? mixRgb(wood, rgb(dusk.cloudGap[1]), 0.45) : mixRgb(wood, rgb(rain.cloud.mid), 0.2);
  const edge = (x: number, z = eave.height) => project(reference, [x, eave.edge, z]);
  const back = (x: number) => project(reference, [x, eave.back, eave.height + eave.rise]);
  const fasciaTop = edge(0, eave.height + 0.06).y;
  const fasciaBottom = edge(0).y;
  fill(b, [[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, fasciaTop + 2], [rect.x0, fasciaTop + 2]], dark, 0);
  for (let x = -7; x <= 7; x += 0.3) {
    const w = 0.045;
    const pa = edge(x - w / 2, eave.height + 0.06);
    const pb = edge(x + w / 2, eave.height + 0.06);
    const qa = back(x - w / 2);
    const qb = back(x + w / 2);
    fill(b, [[pa.x, pa.y], [pb.x, pb.y], [qb.x, qb.y], [qa.x, qa.y]], jitter(b, mixRgb(dark, wood, 0.55), 0.04), 1);
    line(b, [[pb.x, pb.y], [qb.x, qb.y]], 3.2, jitter(b, bounce, 0.04), { dry: 0.45, alpha: 0.78, taper: [0.02, 0.6] });
    for (let g = 0; g < 2; g++) {
      const t = b.r.range(0.2, 0.8);
      line(b, [[pa.x + (pb.x - pa.x) * t, pa.y], [qa.x + (qb.x - qa.x) * t, qa.y]], 1.4, shadeRgb(mixRgb(dark, wood, 0.55), 0.8), { dry: 0.6, alpha: 0.6 });
    }
  }
  for (let y = rect.y0; y < fasciaTop; y += 22) {
    for (let x = rect.x0; x < rect.x1; x += b.r.range(200, 420)) {
      line(b, curve([x, y + b.r.range(-4, 4)], [x + b.r.range(160, 380), y + b.r.range(-4, 4)], 0.004), b.r.range(3, 6), jitter(b, shadeRgb(dark, 1.15), 0.05), { dry: 0.6, alpha: 0.5 });
    }
  }
  fill(b, [[rect.x0, fasciaTop], [rect.x1, fasciaTop], [rect.x1, fasciaBottom], [rect.x0, fasciaBottom]], mixRgb(dark, wood, 0.72), 0.6);
  for (let i = 0; i < 26; i++) {
    const y = b.r.range(fasciaTop + 2, fasciaBottom - 2);
    const x = b.r.range(rect.x0, rect.x1);
    line(b, curve([x, y], [x + b.r.range(200, 600), y + b.r.range(-2, 2)], 0.002), b.r.range(1.2, 2.6), jitter(b, shadeRgb(wood, b.r.range(0.7, 1.15)), 0.05), { dry: 0.5, alpha: 0.7 });
  }
  for (let x = rect.x0; x < rect.x1; x += b.r.range(80, 240)) {
    const len = b.r.range(60, 220);
    line(b, [[x, fasciaBottom - 1.5], [x + len, fasciaBottom - 1.5]], b.r.range(1.8, 2.8), state === "dusk" ? rgb(dusk.cloudGap[1]) : rgb(rain.cloud.edge), { dry: 0.28, alpha: 0.92 });
  }
  mottle(b.c, 40 * b.k, 0.042, 17);
  return b.c;
};

export const paintPlate = (plate: Plate, state: LightState): Paper => {
  switch (plate.id) {
    case "far":
      return paintFar(plate, state);
    case "field":
      return paintField(plate, state);
    case "hedge":
      return paintHedge(plate, state);
    case "yard":
      return paintYard(plate, state);
    case "eaves":
      return paintEaves(plate, state);
  }
};

export const groundPoint = (x: number, d: number): Vec3 => [x, d, 0];
