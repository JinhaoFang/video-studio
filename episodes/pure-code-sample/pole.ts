/**
 * 晾衣竹竿：按场景里的 3D 轴线（scene.ts 的 pole）经相机投影成有透视粗细的竹管，赛璐璐两色加一条受光带，
 * 湿面上断续的窄高光，竹节处略鼓并画节线，上下轮廓用手绘线；竿底挂几颗水珠。
 * bend(t) 给出轴线上每点的竖直位移（米），S2 竹竿被蹬得下沉、弹回时由镜头传入；drawing 决定线条抖动。
 */
import { project } from "./engine/camera.ts";
import type { Camera, Vec3 } from "./engine/camera.ts";
import type { Point } from "./engine/figure.ts";
import { boil, drawStrokes, strokes } from "./engine/ink.ts";
import { hash } from "./engine/random.ts";
import { ink, rain, dusk, warm } from "./tokens.ts";
import { pole, poleAt } from "./scene.ts";

export type PoleLook = {
  state: "rain" | "dusk";
  drawing: number;
  bend?: (t: number) => number;
  drops?: number;
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
};

export const poleScreen = (camera: Camera, t: number, bend?: (t: number) => number) => {
  const p = poleAt(t);
  const q: Vec3 = [p[0], p[1], p[2] + (bend ? bend(t) : 0)];
  return project(camera, q);
};

export const drawPole = (ctx: CanvasRenderingContext2D, camera: Camera, look: PoleLook) => {
  const n = 90;
  const centers: Point[] = [];
  const half: number[] = [];
  const length = Math.hypot(pole.b[0] - pole.a[0], pole.b[1] - pole.a[1], pole.b[2] - pole.a[2]);
  const nodeEvery = 0.34;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = poleScreen(camera, t, look.bend);
    const along = (t * length) / nodeEvery;
    const node = Math.exp(-Math.pow((along - Math.round(along)) * 9, 2));
    centers.push([s.x, s.y]);
    half.push(pole.radius * s.scale * (1 + 0.12 * node));
  }
  const normal = (i: number): Point => {
    const a = centers[Math.max(0, i - 1)];
    const b = centers[Math.min(n, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = dy / l;
    const ny = -dx / l;
    return ny < 0 ? [nx, ny] : [-nx, -ny];
  };
  const edge = (offset: number) =>
    centers.map((c, i): Point => {
      const nm = normal(i);
      return [c[0] + nm[0] * half[i] * offset, c[1] + nm[1] * half[i] * offset];
    });
  const seed = Math.floor(hash(147, look.drawing, 9) * 1e6);
  const amp = ink.boilMinPx + (ink.boilMaxPx - ink.boilMinPx) * hash(147, look.drawing, 10);
  const top = boil(edge(1), seed, amp);
  const bottom = boil(edge(-1), seed, amp);
  const isDusk = look.state === "dusk";
  const body = isDusk ? mixHex(rain.poleShadow, dusk.shadowViolet, 0.35) : rain.poleShadow;
  const mid = isDusk ? mixHex(rain.pole, dusk.shadowViolet, 0.38) : rain.pole;
  const lit = isDusk ? mixHex(rain.pole, warm.rim, 0.5) : mixHex(rain.pole, rain.cloud.edge, 0.3);
  const band = (from: number, to: number, color: string) => {
    const a = boil(edge(from), seed, amp);
    const b = boil(edge(to), seed, amp);
    ctx.beginPath();
    a.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    for (let i = b.length - 1; i >= 0; i--) ctx.lineTo(b[i][0], b[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  band(1, -1, body);
  band(1, -0.1, mid);
  band(1, isDusk ? 0.62 : 0.4, lit);
  const glint = edge(0.8);
  ctx.strokeStyle = isDusk ? mixHex(warm.rim, warm.dropHighlight, 0.6) : mixHex(rain.cloud.edge, "#ffffff", 0.3);
  ctx.lineCap = "round";
  for (let i = 2; i < n - 2; i++) {
    const v = hash(seed, i, 2);
    if (v < 0.7) continue;
    const runLen = 1 + Math.floor(hash(seed, i, 3) * 2.5);
    ctx.lineWidth = Math.max(0.9, half[i] * (0.1 + 0.08 * hash(seed, i, 4)));
    ctx.beginPath();
    ctx.moveTo(glint[i][0], glint[i][1]);
    for (let k = 1; k <= runLen && i + k < n; k++) ctx.lineTo(glint[i + k][0], glint[i + k][1]);
    ctx.stroke();
    i += runLen + 2;
  }
  const style = {
    seed,
    base: 2.2,
    min: ink.minPx * 0.85,
    max: ink.maxPx,
    light: [0.5, -0.86] as Point,
    breakEvery: [220, 520] as [number, number],
    cornerAngle: 1.2,
    gap: [-2, 2] as [number, number],
    litThin: 0.7,
    dropLit: 0.1,
    minLength: 30,
  };
  drawStrokes(ctx, strokes(top, false, style), ink.color);
  drawStrokes(ctx, strokes(bottom, false, { ...style, seed: seed + 1, base: 2.8 }), ink.color);
  for (let k = 1; k < length / nodeEvery; k++) {
    const t = (k * nodeEvery) / length;
    const i = Math.round(t * n);
    if (i <= 1 || i >= n - 1) continue;
    const nm = normal(i);
    const c = centers[i];
    const w = half[i];
    const ring: Point[] = [];
    for (let j = 0; j <= 6; j++) {
      const u = -0.9 + (1.8 * j) / 6;
      const bulge = Math.sqrt(Math.max(0, 1 - u * u)) * w * 0.25;
      ring.push([c[0] + nm[0] * w * u + nm[1] * bulge, c[1] + nm[1] * w * u - nm[0] * bulge]);
    }
    drawStrokes(ctx, strokes(boil(ring, seed + k, amp), false, { ...style, base: 1.8, seed: seed + 7 * k, breakEvery: [1e4, 1e4] }), ink.color);
  }
  const drops = look.drops ?? 7;
  for (let k = 0; k < drops; k++) {
    const t = 0.18 + 0.75 * hash(seed, k, 5);
    const i = Math.round(t * n);
    const nm = normal(i);
    const c = centers[i];
    const w = half[i];
    const size = w * (0.35 + 0.35 * hash(seed, k, 6));
    const x = c[0] - nm[0] * w * 0.95;
    const y = c[1] - nm[1] * w * 0.95 + size * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 1.4);
    ctx.quadraticCurveTo(x + size * 1.05, y - size * 0.1, x, y + size);
    ctx.quadraticCurveTo(x - size * 1.05, y - size * 0.1, x, y - size * 1.4);
    ctx.fillStyle = isDusk ? mixHex(dusk.shadowTeal, warm.bokeh[0], 0.35) : mixHex(rain.paddyWater, rain.cloud.edge, 0.3);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = ink.color;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.25, y + size * 0.2, Math.max(0.8, size * 0.28), 0, Math.PI * 2);
    ctx.fillStyle = warm.dropHighlight;
    ctx.fill();
  }
};
