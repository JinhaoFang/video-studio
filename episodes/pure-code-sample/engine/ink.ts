/**
 * 手绘线条：把闭合或开放折线切成若干笔（转折处和随机位置抬笔断开），每笔两端收尖、按压感变化粗细；
 * 背光一侧的线更粗、受光一侧更细，最亮处的笔可以整笔消失。drawStrokes 把笔画成填充多边形，按 factor 画在 2 倍画布上再缩小。
 * boil 用一张随画张号变化的平滑位移场抖动控制点，填色和线条用同一张位移场，所以一起抖。
 */
import { hash, noise1, noise2, rng } from "./random.ts";
import type { Point } from "./figure.ts";

export type Stroke = { points: Point[]; widths: number[] };

export type StrokeStyle = {
  seed: number;
  base: number;
  min: number;
  max: number;
  light: Point;
  breakEvery: [number, number];
  cornerAngle: number;
  gap: [number, number];
  litThin: number;
  dropLit: number;
  minLength: number;
};

export const boil = (points: readonly Point[], seed: number, amplitude: number): Point[] =>
  points.map(([x, y]) => [
    x + (noise2(x / 38, y / 38, seed) - 0.5) * 2 * amplitude,
    y + (noise2(x / 38 + 71.3, y / 38 - 12.9, seed + 5) - 0.5) * 2 * amplitude,
  ]);

const normals = (points: readonly Point[], closed: boolean): Point[] => {
  const n = points.length;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = points[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = points[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    out.push([ty / l, -tx / l]);
  }
  return out;
};

const signedArea = (loop: readonly Point[]) => {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

export const strokes = (points: readonly Point[], closed: boolean, s: StrokeStyle): Stroke[] => {
  const n = points.length;
  if (n < 3) return [];
  const flip = closed && signedArea(points) < 0 ? -1 : 1;
  const nm = normals(points, closed).map(([x, y]): Point => [x * flip, y * flip]);
  const random = rng(s.seed, n, Math.round(points[0][0]), Math.round(points[0][1]));
  const cumulative: number[] = [0];
  for (let i = 1; i < n; i++)
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const corner: boolean[] = [];
  const spacing = cumulative[n - 1] / Math.max(1, n - 1);
  const w = Math.max(2, Math.round(5 / Math.max(0.5, spacing)));
  for (let i = 0; i < n; i++) {
    const ia = closed ? (((i - w) % n) + n) % n : Math.max(0, i - w);
    const ib = closed ? (i + w) % n : Math.min(n - 1, i + w);
    const a = points[ia];
    const b = points[i];
    const c = points[ib];
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = Math.abs(t2 - t1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    corner.push(d > s.cornerAngle);
  }
  let startIndex = 0;
  if (closed) {
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < n; i++) {
      const score = (corner[i] ? 10 : 0) + nm[i][0] * s.light[0] + nm[i][1] * s.light[1];
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    startIndex = best;
  }
  const order: number[] = [];
  for (let k = 0; k < (closed ? n + 1 : n); k++) order.push(closed ? (startIndex + k) % n : k);
  const out: Stroke[] = [];
  let current: number[] = [];
  let run = 0;
  let strokeLength = 0;
  let nextBreak = random.range(s.breakEvery[0], s.breakEvery[1]);
  let skip = 0;
  const flush = () => {
    if (current.length >= 3 && strokeLength > s.minLength * 0.4) {
      const pts = current.map((i) => points[i]);
      const lights = current.map((i) => nm[i][0] * s.light[0] + nm[i][1] * s.light[1]);
      const meanLight = lights.reduce((a, b) => a + b, 0) / lights.length;
      if (!(meanLight > 0.55 && random.next() < s.dropLit)) {
        const len = current.length;
        const ta = random.range(0.1, 0.28);
        const tb = random.range(0.12, 0.34);
        const seed = Math.floor(random.next() * 1e6);
        const widths = pts.map((_, k) => {
          const t = len === 1 ? 0.5 : k / (len - 1);
          const taper = Math.pow(Math.min(1, t / ta, (1 - t) / tb), 0.65);
          const pressure = 0.82 + 0.36 * noise1(k * 0.11, seed);
          const side = lights[k] > 0 ? 1 - (1 - s.litThin) * lights[k] : 1 - 0.38 * lights[k];
          const w = s.base * pressure * side;
          return Math.max(0, Math.min(s.max, Math.max(s.min, w)) * taper);
        });
        out.push({ points: pts, widths });
      }
    }
    current = [];
  };
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    if (skip > 0) {
      skip -= k > 0 ? Math.hypot(points[i][0] - points[order[k - 1]][0], points[i][1] - points[order[k - 1]][1]) : 0;
      continue;
    }
    current.push(i);
    const step = k > 0 ? Math.abs(cumulative[i] - cumulative[order[k - 1]]) : 0;
    run += step < 50 ? step : 0;
    strokeLength += step < 50 ? step : 0;
    if ((corner[i] && strokeLength > s.minLength) || run > nextBreak) {
      flush();
      run = 0;
      strokeLength = 0;
      nextBreak = random.range(s.breakEvery[0], s.breakEvery[1]);
      const g = random.range(s.gap[0], s.gap[1]);
      if (g > 0) skip = g;
      else current.push(i);
    }
  }
  flush();
  return out;
};

export const drawStrokes = (
  ctx: CanvasRenderingContext2D,
  list: readonly Stroke[],
  color: string,
  factor = 1,
) => {
  ctx.fillStyle = color;
  for (let k = 0; k < list.length; k++) {
    const { points, widths } = list[k];
    const nm = normals(points, false);
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const w = widths[i] / 2;
      const x = (points[i][0] + nm[i][0] * w) * factor;
      const y = (points[i][1] + nm[i][1] * w) * factor;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = points.length - 1; i >= 0; i--) {
      const w = widths[i] / 2;
      ctx.lineTo((points[i][0] - nm[i][0] * w) * factor, (points[i][1] - nm[i][1] * w) * factor);
    }
    ctx.closePath();
    ctx.fill();
  }
};

export const jitterSeed = (...parts: number[]) => Math.floor(hash(...parts) * 1e6);
