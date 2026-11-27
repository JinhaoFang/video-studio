/** 第 10、11 镜共用同一张近翼。腕外长飞羽分指，腕内短羽相叠。一拍一的飞行按翼根、腕和翅尖摆放，近翼随麻雀掠近，接着遮住切点。 */
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { mix } from "../../../../src/kit/engine/timing.ts";
import { mixHex, sparrowPalettes, sparrowRim } from "../../tokens-sparrow.ts";

export const WING_PASS_STEPS = 20;
export const WING_PASS_FULL_FROM = 7;
export const WING_PASS_FULL_TO = 10;
const tipX = [460, 320, 60, -320, -640, -840, -910, -940, -980, -940, -860, -700, -400, -60, 300, 680, 1060, 1430, 1700, 1950];
const span = [2100, 2200, 2400, 2650, 2900, 3100, 3180, 3250, 3350, 3400, 3400, 3350, 3250, 3150, 3050, 2950, 2850, 2740, 2640, 2580];
const slope = [25, 24, 21, 17, 13, 10, 9, 9, 9, 9, 9, 8, 7, 6, 5, 4, 2, 0, -2, -4];
const rootY = [-540, -520, -520, -500, -480, -460, -470, -500, -500, -500, -500, -480, -450, -420, -390, -390, -390, -400, -430, -480];
const chord = [1190, 1240, 1300, 1360, 1420, 1450, 1490, 1860, 1890, 1890, 1890, 1600, 1440, 1380, 1320, 1260, 1200, 1150, 1100, 1060];
const size = 1600;
const depth = 640;
let cached: HTMLCanvasElement | undefined;

const wingDrawing = () => {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = size + 8;
  canvas.height = depth + 16;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(size, 0, 0, depth, 4, 8);
  const p = sparrowPalettes.lowDuskDry;
  const leading = (u: number) => 0.14 - 0.12 * Math.sin(Math.PI * u);
  const feather = (base: Point, tip: Point, breadth: number, seed: number, cover: boolean) => {
    const [x, y] = base;
    const dx = tip[0] - x, dy = tip[1] - y;
    const bend = 0.028 * (1 + hash(190, seed));
    const pos = (t: number, side: number): Point => [x + t * dx + bend * t * (1 - t) + breadth * side, y + t * dy - side * breadth * dx];
    const start = pos(0, -0.62);
    ctx.beginPath();
    ctx.moveTo(...start);
    ctx.bezierCurveTo(...pos(0.40, -1.1), ...pos(0.93, -0.84), ...pos(1, 0));
    ctx.bezierCurveTo(...pos(0.98, 0.44), ...pos(0.64, 0.64), ...pos(0.39, 0.66));
    ctx.quadraticCurveTo(...pos(0.05, 0.53), ...start);
    ctx.fillStyle = mixHex(cover ? p.mantle.shade : p.streak.shade, p.mantle.lit, (cover ? 0.25 : 0.15) + hash(seed, 4) * 0.17);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = mixHex(p.mantle.shade, p.wingBar.shade, 0.28);
    ctx.lineWidth = 0.0015;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...pos(0.12, 0));
    ctx.quadraticCurveTo(...pos(0.63, 0.08), ...pos(0.93, 0));
    ctx.strokeStyle = mixHex(p.mantle.shade, p.streak.lit, 0.6);
    ctx.stroke();
    for (let j = 1; j < 16; j++) {
      const t = 0.21 + j * 0.045 + hash(j, seed) * 0.018;
      ctx.beginPath();
      ctx.moveTo(...pos(t, 0.04));
      ctx.quadraticCurveTo(...pos(t + 0.036, -0.48), ...pos(t + 0.085, -1));
      ctx.strokeStyle = mixHex(p.streak.shade, p.mantle.lit, 0.25);
      ctx.lineWidth = 0.0009;
      ctx.stroke();
    }
    ctx.restore();
  };
  ctx.beginPath();
  ctx.moveTo(-0.02, 0.16);
  ctx.quadraticCurveTo(0.42, -0.08, 0.93, 0.2);
  ctx.bezierCurveTo(0.87, 0.36, 0.72, 0.62, 0.63, 0.72);
  ctx.quadraticCurveTo(0.33, 0.88, -0.02, 0.84);
  ctx.fillStyle = p.streak.shade;
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    feather([0.40 + u * 0.29, leading(u) + 0.06], [0.53 + u * 0.465, 0.97 - 0.73 * u ** 1.65], 0.060 - 0.037 * u, i, false);
  }
  for (let i = 10; i >= 0; i--) {
    const u = i / 10;
    feather([-0.07 + 0.49 * u, leading(u) + 0.28], [-0.035 + 0.54 * u, 0.98 - 0.055 * u + 0.012 * hash(i, 5)], 0.073 - 0.009 * u, i + 16, false);
  }
  for (let i = 18; i >= 0; i--) {
    const u = i / 22;
    feather([u - 0.07, leading(u)], [u + 0.04, leading(u) + 0.6 * (1 - 0.85 * u)], 0.061, i + 40, true);
  }
  ctx.beginPath();
  ctx.moveTo(-0.05, 0.15);
  ctx.bezierCurveTo(0.17, 0.065, 0.37, -0.022, 0.52, 0.012);
  ctx.bezierCurveTo(0.70, 0.03, 0.84, 0.12, 0.992, 0.235);
  ctx.bezierCurveTo(0.72, 0.12, 0.57, 0.22, 0.42, 0.28);
  ctx.quadraticCurveTo(0.15, 0.4, -0.05, 0.45);
  ctx.fillStyle = p.mantle.shade;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.17, 0.077);
  ctx.bezierCurveTo(0.40, -0.004, 0.47, -0.004, 0.56, 0.021);
  ctx.strokeStyle = sparrowRim.lowDusk!;
  ctx.lineWidth = 0.003;
  ctx.stroke();
  cached = canvas;
  return canvas;
};

type Wing = { root: Point; tip: Point; depth: number };
const pass = (s: number): Wing => {
  const angle = (slope[s] + [-1, 0, 1][s % 3] * 1.2) * Math.PI / 180;
  const zoom = [1.02, 1.06, 1.11, 1.24, 1.25, 1.26, 1.25, 1.10, 1.06, 1.02][s - 4] ?? 1;
  const screen = (x: number, y: number): Point => [960 + (x - 960) * zoom, 540 + (y - 540) * zoom];
  return { root: screen(tipX[s] + span[s] * Math.cos(angle), rootY[s]), tip: screen(tipX[s], rootY[s] + span[s] * Math.sin(angle)), depth: chord[s] * zoom };
};
const draw = (ctx: CanvasRenderingContext2D, w: Wing) => {
  ctx.save();
  ctx.transform((w.tip[0] - w.root[0]) / size, (w.tip[1] - w.root[1]) / size, 0, w.depth / depth, ...w.root);
  ctx.drawImage(wingDrawing(), -4, -8);
  ctx.restore();
};
export const drawFlightWing = (ctx: CanvasRenderingContext2D, side: number, x: number, y: number, scale: number, flap: number, fold: number, step: number) => {
  const w: Wing = {
    root: [x + side * 0.37 * scale, y - 0.42 * scale],
    tip: [x + side * (3.4 - fold * 0.9) * scale, y - (0.74 + 1.85 * flap) * scale],
    depth: (0.82 + 0.23 * Math.abs(flap)) * scale,
  };
  if (side < 0 && step >= 0) {
    const target = pass(step);
    const t = Math.min(1, (step + 1) / 5);
    for (const key of ["root", "tip"] as const) w[key] = [mix(w[key][0], target[key][0], t), mix(w[key][1], target[key][1], t)];
    w.depth = mix(w.depth, target.depth, t);
  }
  draw(ctx, w);
};
export const drawWingPass = (ctx: CanvasRenderingContext2D, step: number) => {
  const now = pass(step);
  const previous = pass(Math.max(0, step - 1));
  const vx = now.tip[0] - previous.tip[0];
  const vy = now.tip[1] - previous.tip[1];
  ctx.save();
  draw(ctx, now);
  if (Math.hypot(vx, vy) > 30) {
    ctx.globalAlpha = 0.16;
    ctx.translate(-vx * 0.08, -vy * 0.08);
    draw(ctx, now);
  }
  ctx.restore();
};
