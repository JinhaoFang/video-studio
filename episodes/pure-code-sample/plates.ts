/**
 * 《雨后》的水粉底图：远景（天空、积雨云、云缝、远山）、稻田、树篱和树、院子、檐口。每层先铺 3–5 块大明暗，再逐个画云团、山脊、稻株、叶团、木纹，
 * 每一笔从颜色引导函数取色（雨色或夕光，state 决定），同样的种子在两种光下落笔位置完全一样，镜头可以按光照图在两张之间过渡。
 * 坐标先用参考画面像素想，再乘 k 落到底图像素。只在 Node 生成器里调用；输出预乘浮点画布，由生成器编码成 PNG。
 */
import { project } from "./engine/camera.ts";
import type { Vec3 } from "./engine/camera.ts";
import { contours, resample, smooth } from "./engine/figure.ts";
import type { Point } from "./engine/figure.ts";
import { fbm2, noise1, rng } from "./engine/random.ts";
import type { Rng } from "./engine/random.ts";
import { curve, mixRgb, mottle, paper, polygon, rgb, roughen, shadeRgb, stroke } from "./engine/paint.ts";
import type { Paper, Pt, RGB } from "./engine/paint.ts";
import { dusk, rain } from "./tokens.ts";
import { eave, plateSize, reference } from "./scene.ts";
import type { Plate } from "./scene.ts";

export type LightState = "rain" | "dusk";

type Brush = {
  c: Paper;
  P: (x: number, y: number) => Pt;
  k: number;
  r: Rng;
  dusk: boolean;
};

const SUN = { x: 1530, y: 250 };
const HORIZON = project(reference, [0, 1e5, 2.0 - 2.0]).y;

const ground = (x: number, d: number, z = 0) => project(reference, [x, d, z]);

const pick = (state: LightState, wet: string, warm: string, t = 1) => mixRgb(rgb(wet), rgb(warm), state === "dusk" ? t : 0);

const brush = (plate: Plate, state: LightState, seed: number): Brush => {
  const { width, height } = plateSize(plate);
  const k = plate.k;
  return {
    c: paper(width, height),
    P: (x, y) => [(x - plate.rect.x0) * k, (y - plate.rect.y0) * k],
    k,
    r: rng(seed),
    dusk: state === "dusk",
  };
};

const line = (b: Brush, pts: readonly [number, number][], width: number, color: RGB, extra: Partial<Parameters<typeof stroke>[2]> = {}) =>
  stroke(
    b.c,
    pts.map(([x, y]) => b.P(x, y)),
    { width: width * b.k, color, seed: Math.floor(b.r.next() * 1e6), ...extra },
  );

const fill = (b: Brush, pts: readonly [number, number][], color: RGB, rough = 3, alpha = 1) =>
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

const jitter = (b: Brush, c: RGB, amount = 0.05): RGB => {
  const k = 1 + b.r.range(-amount, amount);
  const h = b.r.range(-amount, amount) * 0.5;
  return [c[0] * k + h, c[1] * k, c[2] * k - h];
};

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, steps = 7): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  });

const skyColor = (state: LightState, x: number, y: number): RGB => {
  const t = Math.max(0, Math.min(1, (y + 90) / (HORIZON + 90)));
  const top = pick(state, rain.sky[0], dusk.shadowViolet, 0.35);
  const mid = pick(state, rain.sky[1], dusk.cloud.shadow, 0.3);
  const low = pick(state, rain.sky[2], dusk.cloud.edge, 0.55);
  let c = t < 0.55 ? mixRgb(top, mid, t / 0.55) : mixRgb(mid, low, (t - 0.55) / 0.45);
  if (state === "dusk") {
    const d = Math.hypot((x - SUN.x) / 1.4, y - SUN.y);
    const glow = Math.exp(-d / 330);
    c = mixRgb(c, rgb(dusk.cloudGap[1]), glow * 0.75);
    c = mixRgb(c, rgb(dusk.cloudGap[0]), Math.exp(-d / 120) * 0.9);
  }
  return c;
};

type Puff = [number, number, number];

type MassTones = { shadow: RGB; mid: RGB; lit: RGB; rim: RGB };

type MassStyle = {
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

const mass = (b: Brush, puffs: Puff[], st: MassStyle) => {
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
    const e = 3;
    const gx = (f(x + e, y) - f(x - e, y)) / (2 * e);
    const gy = (f(x, y + e) - f(x, y - e)) / (2 * e);
    const l = Math.hypot(gx, gy) || 1;
    const n: [number, number] = [-gx / l, -gy / l];
    const sun = st.sun ?? { x: x + 600, y: y - 600 };
    const sx = sun.x - x;
    const sy = sun.y - y;
    const sl = Math.hypot(sx, sy) || 1;
    const facing = (n[0] * sx + n[1] * sy) / sl;
    const fv = f(x, y);
    const depth = Math.min(1, Math.max(0, (fv - T) / 0.8));
    const up = Math.max(0, Math.min(1, (y1 - y) / (y1 - y0)));
    const lump = (fbm2(x / 70, y / 70, 77, 2) - 0.5) * 0.1;
    const v = st.backlit
      ? facing * 0.55 + Math.exp(-depth / 0.18) * Math.max(0, facing) * 0.6 + up * 0.15 - 0.22 + lump
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

const billows = (r: Rng, cx: number, base: number, width: number, height: number, flat = 0.3): Puff[] => {
  const out: Puff[] = [];
  const crown = (t: number) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.8);
  const top = (t: number) => base - height * crown(t) * (0.65 + 0.35 * noise1(t * 7, Math.floor(cx)));
  const cores = Math.max(3, Math.round(width / (height * 0.8)));
  for (let i = 0; i < cores; i++) {
    const t = (i + 0.5) / cores + r.range(-0.08, 0.08);
    const rad = height * 0.42 * (0.55 + 0.45 * crown(t));
    out.push([cx + (t - 0.5) * width, base - rad * (0.5 + flat * 0.3), rad]);
  }
  const count = Math.round((width / height) * 5 + 4);
  for (let i = 0; i < count; i++) {
    const t = r.next();
    const rad = height * r.range(0.12, 0.3) * (0.45 + crown(t) * 0.7);
    out.push([cx + (t - 0.5) * width, top(t) + rad * r.range(0.4, 0.9), rad]);
  }
  for (let i = 0; i < count; i++) {
    const t = r.next();
    const rad = height * r.range(0.07, 0.14) * (0.5 + crown(t) * 0.6);
    out.push([cx + (t - 0.5) * width, top(t) + rad * r.range(0.1, 0.6), rad]);
  }
  return out;
};

const cloudTones = (state: LightState, x: number, y: number, weight: number): MassTones => {
  const sunness = Math.exp(-Math.hypot(x - SUN.x, y - SUN.y) / 650);
  const shadow = mixRgb(pick(state, rain.cloud.mid, dusk.cloud.shadow), pick(state, rain.cloud.dark, dusk.shadowViolet, 0.6), weight * 0.6);
  const mid = mixRgb(shadow, pick(state, rain.cloud.mid, dusk.cloud.warm, 0.55), 0.45);
  const lit = pick(state, rain.cloud.edge, dusk.cloud.warm, 0.9 - sunness * 0.4);
  const rim = mixRgb(pick(state, rain.cloud.edge, dusk.cloud.edge), rgb(dusk.cloudGap[0]), state === "dusk" ? sunness : 0);
  return { shadow, mid, lit: mixRgb(lit, rgb(dusk.cloud.edge), state === "dusk" ? sunness * 0.6 : 0), rim };
};

const cloud = (b: Brush, state: LightState, puffs: Puff[], weight: number, floor?: number) => {
  const cx = puffs.reduce((a, p) => a + p[0], 0) / puffs.length;
  const cy = puffs.reduce((a, p) => a + p[1], 0) / puffs.length;
  const t = cloudTones(state, cx, cy, weight);
  const f = (x: number, y: number) => {
    let v = 0;
    for (const [px, py, r] of puffs) v += Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (r * r));
    return v;
  };
  const top = Math.min(...puffs.map((p) => p[1] - p[2]));
  const bottom = floor ?? Math.max(...puffs.map((p) => p[1] + p[2]));
  const order = puffs.slice().sort((a, c) => a[1] - c[1]);
  for (const [x, y, r] of order) {
    const v = Math.max(0, Math.min(1, (y - top) / Math.max(1, bottom - top)));
    const sx = SUN.x - x;
    const sy = SUN.y - y;
    const sl = Math.hypot(sx, sy) || 1;
    const sunAngle = Math.atan2(sy / sl - 0.9, sx / sl);
    const wide = 1.15 + 0.2 * noise1(x * 0.01 + y * 0.013, 5);
    const disk = arc(x, y, r, 0, Math.PI * 2, 22).slice(0, -1).map(([px, py]) => [x + (px - x) * wide, Math.min(py, bottom)] as [number, number]);
    const bodyCol = mixRgb(mixRgb(t.mid, t.shadow, 0.35 + 0.65 * v), t.shadow, weight * 0.2);
    fill(b, disk, jitter(b, bodyCol, 0.015), r * 0.05);
    const ex = x + Math.cos(sunAngle) * r * 1.15;
    const ey = y + Math.sin(sunAngle) * r * 1.15;
    const exposed = f(ex, ey) < 1.05;
    const sunness = Math.exp(-Math.hypot(x - SUN.x, y - SUN.y) / 650);
    const litCol = mixRgb(t.mid, t.lit, 0.85);
    const upper = arc(x, y - r * 0.18, r * 0.86, 0, Math.PI * 2, 18).slice(0, -1).map(([px, py]) => [x + (px - x) * wide, Math.min(py, bottom, y + r * 0.1)] as [number, number]);
    fill(b, upper, jitter(b, mixRgb(bodyCol, t.mid, 0.45), 0.015), r * 0.06);

    for (let i = 0; i < 6; i++) {
      const a = b.r.range(0, Math.PI * 2);
      const rr = r * Math.sqrt(b.r.next()) * 0.8;
      const px = x + Math.cos(a) * rr * wide;
      const py = Math.min(bottom - 4, y + Math.sin(a) * rr);
      const len = r * b.r.range(0.25, 0.5);
      line(b, curve([px - len / 2, py], [px + len / 2, py + b.r.range(-3, 3)], b.r.range(-0.1, 0.1)), r * b.r.range(0.06, 0.12), jitter(b, mixRgb(bodyCol, t.mid, b.r.range(0, 0.5)), 0.03), { dry: 0.5, alpha: 0.6 });
    }
    const squash = (pts: [number, number][]) => pts.map(([px, py]) => [x + (px - x) * wide, Math.min(py, bottom - 2)] as [number, number]);
    if (exposed) {
      const strokes = 4 + Math.floor(b.r.next() * 3);
      const reach = state === "dusk" ? 1 : 0.45;
      for (let i = 0; i < strokes; i++) {
        const u = i / (strokes - 1);
        const rr = r * (0.58 + 0.3 * u + b.r.range(-0.03, 0.03));
        const span = (0.5 + 0.5 * (1 - u)) * b.r.range(0.75, 1.1);
        const a = sunAngle + b.r.gauss() * 0.22;
        const col = mixRgb(mixRgb(bodyCol, t.mid, 0.5), litCol, (0.25 + 0.65 * u) * reach);
        line(b, squash(arc(x, y, rr, a - span, a + span, 9)), r * b.r.range(0.2, 0.3) * (1 - 0.35 * u), jitter(b, col, 0.02), { dry: 0.25, body: 0.7, taper: [0.2, 0.2] });
      }
      if (state === "dusk") {
        for (let i = 0; i < 2; i++) {
          const a = sunAngle + b.r.gauss() * 0.2;
          const span = b.r.range(0.25, 0.6);
          line(b, squash(arc(x, y, r * 0.97, a - span, a + span, 8)), r * b.r.range(0.04, 0.07), jitter(b, mixRgb(t.lit, t.rim, 0.5 + sunness * 0.5), 0.015), { dry: 0.2, taper: [0.4, 0.4] });
        }
      }
    }
  }
};

const paintFar = (plate: Plate, state: LightState): Paper => {
  const b = brush(plate, state, 1601);
  const { rect } = plate;
  fill(b, [[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, rect.y1], [rect.x0, rect.y1]], skyColor(state, 960, 300), 0);
  for (let y = rect.y0; y < HORIZON + 40; y += 34) {
    for (let x = rect.x0 - 100; x < rect.x1; x += b.r.range(260, 520)) {
      const len = b.r.range(300, 700);
      const yy = y + b.r.range(-12, 12);
      const mx = x + len / 2;
      line(b, curve([x, yy], [x + len, yy + b.r.range(-14, 14)], b.r.range(-0.03, 0.03)), b.r.range(40, 70), jitter(b, skyColor(state, mx, yy), 0.025), {
        dry: 0.2,
        body: 0.55,
        streak: 0.06,
      });
    }
  }
  if (state === "dusk") {
    for (let i = 0; i < 70; i++) {
      const a = b.r.range(0, Math.PI * 2);
      const d = Math.abs(b.r.gauss()) * 110;
      const x = SUN.x + Math.cos(a) * d * 1.5;
      const y = SUN.y + Math.sin(a) * d * 0.8;
      line(b, curve([x - 60, y], [x + 60, y + b.r.range(-8, 8)], 0.05), b.r.range(18, 36), jitter(b, mixRgb(rgb(dusk.cloudGap[0]), rgb(dusk.cloudGap[1]), d / 200), 0.02), { dry: 0.3, alpha: 0.9 });
    }
  }
  for (let i = 0; i < 14; i++) {
    const y = b.r.range(HORIZON - 150, HORIZON - 70);
    const x = b.r.range(rect.x0, rect.x1);
    const len = b.r.range(200, 520);
    const c = mixRgb(pick(state, rain.cloud.mid, dusk.cloud.shadow, 0.5), skyColor(state, x, y), 0.35);
    line(b, curve([x, y], [x + len, y + b.r.range(-6, 6)], 0.01), b.r.range(10, 22), jitter(b, c, 0.03), { dry: 0.4, alpha: 0.8 });
    if (state === "dusk") line(b, curve([x + 20, y - 6], [x + len * 0.7, y - 8], 0.01), b.r.range(4, 7), jitter(b, rgb(dusk.cloud.warm), 0.04), { dry: 0.4, alpha: 0.85 });
  }
  cloud(b, state, billows(b.r, 560, 420, 1250, 420), 1, 425);
  cloud(b, state, billows(b.r, 60, 470, 600, 190), 1, 472);
  cloud(b, state, billows(b.r, 1260, 210, 560, 190), 0.85, 212);
  cloud(b, state, billows(b.r, 1960, 360, 520, 290), 0.8, 362);
  for (let i = 0; i < 9; i++) {
    const y = b.r.range(470, 540);
    const x = b.r.range(900, 2000);
    const len = b.r.range(180, 420);
    const col = cloudTones(state, x, y, 0.5);
    line(b, curve([x, y], [x + len, y + b.r.range(-5, 5)], 0.01), b.r.range(10, 20), jitter(b, mixRgb(col.shadow, col.mid, 0.5), 0.03), { dry: 0.3, body: 0.6 });
    line(b, curve([x + len * 0.1, y - 7], [x + len * 0.8, y - 9], 0.01), b.r.range(3, 6), jitter(b, col.lit, 0.03), { dry: 0.3 });
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
  const farCol = pick(state, rain.mountain, dusk.mountain);
  fill(b, [...farPts, [rect.x1, HORIZON + 30], [rect.x0, HORIZON + 30]], jitter(b, mixRgb(farCol, skyColor(state, 900, HORIZON - 40), 0.35), 0.01), 2);
  for (let x = rect.x0; x < rect.x1; x += b.r.range(14, 46)) {
    const y = ridge(x, HORIZON - 40, 120, 3);
    const slope = ridge(x + 10, HORIZON - 40, 120, 3) - y;
    if (state === "dusk" && slope > 0.5) {
      line(b, curve([x, y + 3], [x + b.r.range(40, 110), y + 30 + b.r.range(0, 50)], 0.08), b.r.range(14, 30), jitter(b, mixRgb(farCol, rgb(dusk.cloud.edge), 0.22), 0.03), { dry: 0.6, alpha: 0.45 });
    } else {
      line(b, curve([x, y + 6], [x - b.r.range(30, 90), y + 30 + b.r.range(0, 50)], -0.06), b.r.range(14, 30), jitter(b, mixRgb(farCol, rgb(dusk.shadowViolet), 0.18), 0.03), { dry: 0.6, alpha: 0.35 });
    }
  }
  const nearCol = pick(state, rain.mountain, dusk.shadowTeal, 0.6);
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
    let y = HORIZON + 6;
    for (const [cx, cy, r] of crowns) {
      const dx = x - cx;
      if (Math.abs(dx) < r) y = Math.min(y, cy - Math.sqrt(r * r - dx * dx) * 0.9);
    }
    top.push([x, y]);
  }
  fill(b, [...top, [rect.x1 + 20, rect.y1], [rect.x0 - 20, rect.y1]], shadeRgb(nearCol, 0.85), 1);
  for (const [cx, cy, r] of crowns) {
    if (state === "dusk" && b.r.next() < 0.55) {
      line(b, arc(cx, cy, r * 0.7, -1.6, -0.2, 5), r * 0.5, jitter(b, mixRgb(nearCol, rgb(dusk.paddyLit[1]), b.r.range(0.2, 0.45)), 0.05), { dry: 0.3, taper: [0.3, 0.4] });
    } else if (b.r.next() < 0.5) {
      line(b, arc(cx, cy, r * 0.65, -2.8, -1.4, 5), r * 0.45, jitter(b, mixRgb(nearCol, rgb(rain.cloud.mid), b.r.range(0.1, 0.25)), 0.05), { dry: 0.35, taper: [0.3, 0.4] });
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = b.r.range(rect.x0, rect.x1);
    const y = HORIZON + b.r.range(-10, 10);
    line(b, curve([x, y], [x + b.r.range(120, 300), y], 0.005), b.r.range(6, 14), jitter(b, mixRgb(skyColor(state, x, HORIZON - 30), nearCol, 0.3), 0.02), { dry: 0.5, alpha: 0.55 });
  }
  mottle(b.c, 90 * b.k, 0.035, 7);
  return b.c;
};

const paintField = (plate: Plate, state: LightState): Paper => {
  const b = brush(plate, state, 2602);
  const { rect } = plate;
  const lit = (x: number, y: number) => (state === "dusk" ? Math.max(0, Math.min(1, (fbm2(x / 380, y / 60, 41, 3) - 0.38) * 3.5)) : 0);
  const fieldBack = rgb(rain.paddyBack);
  const litA = rgb(dusk.paddyLit[0]);
  const litB = rgb(dusk.paddyLit[1]);
  const shadow = pick(state, rain.paddyBack, dusk.shadowTeal, 0.55);
  fill(b, [[rect.x0, HORIZON - 4], [rect.x1, HORIZON - 4], [rect.x1, rect.y1], [rect.x0, rect.y1]], mixRgb(fieldBack, shadow, 0.5), 1);
  for (let d = 600; d > 18; d *= 0.93) {
    const y = ground(0, d).y;
    if (y > rect.y1 + 10) continue;
    const thick = Math.max(2, (ground(0, d * 0.93).y - y) * 1.1);
    for (let x = rect.x0 - 50; x < rect.x1; ) {
      const len = b.r.range(80, 260) * (1 + 60 / d);
      const l = lit(x + len / 2, y);
      const col = mixRgb(mixRgb(fieldBack, shadow, 0.6), mixRgb(litB, litA, b.r.next()), l);
      const haze = Math.max(0, Math.min(1, 1 - d / 700)) * 0.25;
      line(b, curve([x, y], [x + len, y + b.r.range(-1, 1)], 0.002), thick, jitter(b, mixRgb(col, skyColor(state, x, HORIZON), haze), 0.04), {
        dry: 0.3,
        body: 0.5,
      });
      if (b.r.next() < 0.35) {
        const wy = y + thick * b.r.range(-0.3, 0.3);
        const water = state === "dusk" ? mixRgb(rgb(dusk.waterGlint), skyColor(state, x, 200), 0.3) : rgb(rain.paddyWater);
        line(b, curve([x + len * 0.2, wy], [x + len * b.r.range(0.4, 0.9), wy], 0), Math.max(1.2, thick * 0.3), jitter(b, water, 0.04), { dry: 0.5, alpha: 0.9 });
      }
      x += len * b.r.range(0.7, 1.0);
    }
    if (d < 70) {
      const count = Math.floor((rect.x1 - rect.x0) / (220 / (70 / d)));
      for (let i = 0; i < count; i++) {
        const x = b.r.range(rect.x0, rect.x1);
        const h = (240 / d) * b.r.range(0.7, 1.2);
        const l = lit(x, y);
        const col = mixRgb(shadow, litA, l * b.r.range(0.6, 1));
        line(b, [[x, y + 1], [x + b.r.range(-2, 2) * (h / 6), y - h]], Math.max(1.4, h * 0.22), jitter(b, col, 0.06), { taper: [0.1, 0.6], dry: 0.2 });
      }
    }
  }
  const trees: [number, number, number][] = [[260, 0, 1.2], [640, 0, 0.7], [1420, 0, 1.0], [1700, 0, 0.8]];
  for (const [tx, , s] of trees) {
    const y = HORIZON + 2;
    const w = 90 * s;
    const h = 46 * s;
    const col = pick(state, rain.hedge, dusk.shadowTeal, 0.5);
    fill(b, arc(tx, y, w, Math.PI, Math.PI * 2, 12).map(([x, yy]) => [x, y - (y - yy) * (h / w)] as [number, number]).concat([[tx + w, y + 4], [tx - w, y + 4]]), mixRgb(col, skyColor(state, tx, HORIZON - 20), 0.3), 3);
    if (state === "dusk") {
      for (let i = 0; i < 8; i++) {
        const a = b.r.range(-1.6, -0.3);
        line(b, arc(tx, y, w * b.r.range(0.6, 0.95), a - 0.25, a + 0.2, 4).map(([x, yy]) => [x, y - (y - yy) * (h / w)] as [number, number]), 5 * s, jitter(b, mixRgb(litB, rgb(dusk.cloud.edge), 0.3), 0.04), { dry: 0.4 });
      }
    }
  }
  const houseX = 1080;
  const hy = HORIZON + 1;
  fill(b, [[houseX - 50, hy], [houseX - 40, hy - 16], [houseX + 46, hy - 16], [houseX + 58, hy]], mixRgb(pick(state, rain.wood, dusk.shadowViolet, 0.5), skyColor(state, houseX, HORIZON - 20), 0.35), 1);
  if (state === "dusk") line(b, [[houseX - 38, hy - 16], [houseX + 44, hy - 16]], 2.4, rgb(dusk.cloud.edge), { dry: 0.2 });
  mottle(b.c, 70 * b.k, 0.04, 9);
  return b.c;
};

const paintHedge = (plate: Plate, state: LightState): Paper => {
  const b = brush(plate, state, 3603);
  const shadow = mixRgb(rgb(rain.hedge), pick(state, rain.hedge, dusk.shadowTeal, 0.6), 0.7);
  const mid = rgb(rain.hedge);
  const lit = state === "dusk" ? rgb(dusk.paddyLit[1]) : mixRgb(mid, rgb(rain.paddyWater), 0.3);
  const tones = (k: number): MassTones => ({
    shadow: shadeRgb(shadow, 0.85 + 0.1 * k),
    mid: mixRgb(shadow, mid, 0.6 + 0.2 * k),
    lit: mixRgb(mid, lit, state === "dusk" ? 0.75 : 0.4),
    rim: state === "dusk" ? mixRgb(lit, rgb(dusk.cloud.edge), 0.55) : mixRgb(mid, rgb(rain.cloud.edge), 0.3),
  });
  const treeX = 420;
  const trunkBase = ground(-6.4, 13).y;
  const crownY = trunkBase - 340;
  const trunkCol = pick(state, rain.wood, dusk.shadowViolet, 0.4);
  line(b, [[treeX + 10, trunkBase], [treeX - 6, crownY + 120], [treeX + 18, crownY + 40]], 22, trunkCol, { taper: [0.05, 0.4], dry: 0.1, body: 0.6 });
  line(b, [[treeX - 4, crownY + 160], [treeX - 100, crownY + 50]], 10, trunkCol, { taper: [0.05, 0.6] });
  line(b, [[treeX + 8, crownY + 120], [treeX + 130, crownY + 30]], 9, trunkCol, { taper: [0.05, 0.6] });
  const crown: Puff[] = [];
  for (let i = 0; i < 6; i++) crown.push([treeX + b.r.gauss() * 80, crownY + b.r.gauss() * 40 - 10, b.r.range(45, 75)]);
  for (let i = 0; i < 9; i++) {
    const a = b.r.range(-Math.PI, Math.PI * 0.1);
    const cx = treeX + Math.cos(a) * b.r.range(90, 160);
    const cy = crownY - 10 + Math.sin(a) * b.r.range(60, 110);
    crown.push([cx, cy, b.r.range(34, 52)]);
    for (let k = 0; k < 4; k++) crown.push([cx + b.r.gauss() * 30, cy + b.r.gauss() * 22, b.r.range(14, 26)]);
  }
  mass(b, crown, { tones: tones(0.3), sun: SUN, strokeLength: [14, 26], strokeWidth: [7, 12], density: 5, rimWidth: 4, dab: true, backlit: true });
  const top = (x: number) => ground(0, 11, 1.0).y + (noise1(x / 90, 7) - 0.5) * 30;
  const baseY = ground(0, 11).y;
  const soil = pick(state, rain.wood, dusk.shadowViolet, 0.35);
  fill(b, [[plate.rect.x0, baseY - 2], [plate.rect.x1, baseY - 2], [plate.rect.x1, plate.rect.y1], [plate.rect.x0, plate.rect.y1]], soil, 1);
  for (let y = baseY; y < plate.rect.y1; y += 7) {
    for (let x = plate.rect.x0 - 40; x < plate.rect.x1; x += b.r.range(80, 220)) {
      line(b, curve([x, y], [x + b.r.range(60, 200), y + b.r.range(-1.5, 1.5)], 0.003), b.r.range(4, 8), jitter(b, mixRgb(soil, shadow, b.r.range(0, 0.4)), 0.05), { dry: 0.4, body: 0.45 });
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
      mass(b, puffs, { tones: tones(row === 0 ? 0 : 0.5), sun: SUN, floor: baseY + 4, strokeLength: [10, 20], strokeWidth: [5, 9], density: 4, rimWidth: 3, dab: true, backlit: true });
      x += w * b.r.range(0.55, 0.85);
    }
  }
  for (let x = plate.rect.x0; x < plate.rect.x1; x += b.r.range(60, 140)) {
    line(b, curve([x, baseY - 3], [x + b.r.range(60, 140), baseY - 1], 0.01), b.r.range(8, 14), shadeRgb(shadow, 0.7), { dry: 0.4, alpha: 0.9 });
  }
  mottle(b.c, 60 * b.k, 0.04, 13);
  return b.c;
};

const paintYard = (plate: Plate, state: LightState): Paper => {
  const b = brush(plate, state, 4604);
  const { rect } = plate;
  const soil = pick(state, rain.wood, dusk.shadowViolet, 0.35);
  const soilLit = state === "dusk" ? mixRgb(rgb(rain.wood), rgb(dusk.cloud.warm), 0.35) : rgb(rain.wood);
  const top = ground(0, 11).y - 4;
  fill(b, [[rect.x0, top], [rect.x1, top], [rect.x1, rect.y1], [rect.x0, rect.y1]], soil, 1);
  for (let d = 11; d > 5; d *= 0.965) {
    const y = ground(0, d).y;
    const thick = Math.max(3, (ground(0, d * 0.965).y - y) * 1.3);
    for (let x = rect.x0 - 40; x < rect.x1; ) {
      const len = b.r.range(60, 200);
      const n = noise1(x / 300 + d, 17);
      const col = mixRgb(soil, soilLit, Math.max(0, n - 0.3) * 1.4);
      line(b, curve([x, y], [x + len, y + b.r.range(-1.5, 1.5)], 0.003), thick, jitter(b, col, 0.05), { dry: 0.35, body: 0.45 });
      x += len * b.r.range(0.6, 0.95);
    }
  }
  const puddles: [number, number, number][] = [[620, 9.2, 1.6], [1320, 8.1, 2.2], [1720, 9.8, 1.0], [180, 7.6, 1.3]];
  for (const [px, d, w] of puddles) {
    const y = ground(0, d).y;
    const wpx = w * (project(reference, [1, d, 0]).x - project(reference, [0, d, 0]).x);
    const h = (ground(0, d * 0.9).y - y) * 0.9;
    const shape = arc(px, y, wpx, 0, Math.PI * 2, 20).slice(0, -1).map(([x, yy]) => [x, y + (yy - y) * (h / wpx)] as [number, number]);
    fill(b, shape, state === "dusk" ? mixRgb(skyColor(state, px, 380), rgb(dusk.cloud.shadow), 0.35) : rgb(rain.paddyWater), h * 0.05);
    for (let i = 0; i < 5; i++) {
      const yy = y + b.r.range(-h * 0.5, h * 0.5);
      const x0 = px + b.r.range(-wpx * 0.6, wpx * 0.2);
      const col = state === "dusk" ? rgb(b.r.next() < 0.5 ? dusk.waterGlint : dusk.cloudGap[0]) : mixRgb(rgb(rain.paddyWater), rgb(rain.cloud.edge), 0.5);
      line(b, [[x0, yy], [x0 + wpx * b.r.range(0.3, 0.7), yy]], b.r.range(2, 4), col, { dry: 0.5, alpha: 0.9 });
    }
  }
  const stones: [number, number][] = [[880, 8.6], [1010, 7.3], [1150, 6.3]];
  for (const [sx, d] of stones) {
    const y = ground(0, d).y;
    const w = 0.35 * (project(reference, [1, d, 0]).x - project(reference, [0, d, 0]).x);
    const h = (ground(0, d * 0.94).y - y) * 1.1;
    const stoneDark = pick(state, rain.poleShadow, dusk.shadowViolet, 0.5);
    const stoneLit = state === "dusk" ? mixRgb(rgb(rain.pole), rgb(dusk.cloud.edge), 0.4) : rgb(rain.pole);
    fill(b, arc(sx, y, w, 0, Math.PI * 2, 14).slice(0, -1).map(([x, yy]) => [x, y + (yy - y) * (h / w)] as [number, number]), stoneDark, 2);
    line(b, arc(sx, y, w * 0.8, Math.PI * 1.1, Math.PI * 1.85, 5).map(([x, yy]) => [x, y + (yy - y) * (h / w)] as [number, number]), h * 0.35, stoneLit, { dry: 0.3 });
  }
  mottle(b.c, 50 * b.k, 0.05, 15);
  return b.c;
};

const paintEaves = (plate: Plate, state: LightState): Paper => {
  const b = brush(plate, state, 5605);
  const { rect } = plate;
  const dark = rgb(rain.eavesDark);
  const wood = rgb(rain.wood);
  const bounce = state === "dusk" ? mixRgb(wood, rgb(dusk.cloud.warm), 0.35) : mixRgb(wood, rgb(rain.cloud.mid), 0.2);
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
    line(b, [[pb.x, pb.y], [qb.x, qb.y]], 3, jitter(b, bounce, 0.05), { dry: 0.5, alpha: 0.7, taper: [0.02, 0.6] });
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
  fill(b, [[rect.x0, fasciaTop], [rect.x1, fasciaTop], [rect.x1, fasciaBottom], [rect.x0, fasciaBottom]], mixRgb(dark, wood, 0.7), 0.6);
  for (let i = 0; i < 26; i++) {
    const y = b.r.range(fasciaTop + 2, fasciaBottom - 2);
    const x = b.r.range(rect.x0, rect.x1);
    line(b, curve([x, y], [x + b.r.range(200, 600), y + b.r.range(-2, 2)], 0.002), b.r.range(1.2, 2.6), jitter(b, shadeRgb(wood, b.r.range(0.7, 1.15)), 0.05), { dry: 0.5, alpha: 0.7 });
  }
  for (let x = rect.x0; x < rect.x1; x += b.r.range(80, 240)) {
    const len = b.r.range(60, 220);
    line(b, [[x, fasciaBottom - 1.5], [x + len, fasciaBottom - 1.5]], b.r.range(1.6, 2.6), state === "dusk" ? rgb(dusk.cloud.edge) : rgb(rain.cloud.edge), { dry: 0.3, alpha: 0.9 });
  }
  mottle(b.c, 40 * b.k, 0.05, 17);
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
