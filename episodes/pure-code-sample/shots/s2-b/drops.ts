/**
 * S2 B 版的水珠，都是赛璐璐画法（平涂、一层硬边阴影、高光、手绘轮廓）；受光色沿用 pole.ts 竹竿水珠的取色（青灰混淡金），阴影色是本版加的。
 * sprayAt：甩水时从麻雀头颈甩出的水珠，每次甩到端点甩出一批，越甩越少，受重力飞出画外；头部的位置由调用方按甩出那一帧的画面给出。
 * 竹竿底下挂着几颗水珠（drawPoleDrops）：位置在近景里竹竿可见的一段上（停点两侧），由固定种子给出；不用 drawPole 自带的水珠，
 * 因为它们的位置种子带画张号，每换一张画就跳位。竹竿回弹时水珠逐颗被甩下、做抛体运动，
 * 落地事件的帧号保留在 timing.ts（原弹道计算结果）；位置全部按固定种子和帧号算，不带状态。
 */
import type { Point } from "../../engine/figure.ts";
import { resample, smooth } from "../../engine/figure.ts";
import { tracePath } from "../../engine/cel.ts";
import { boil, drawStrokes, strokes } from "../../engine/ink.ts";
import { hash } from "../../engine/random.ts";
import { poleScreen } from "../../pole.ts";
import { pole, UNIT } from "../../scene.ts";
import { dusk, ink, warm } from "../../tokens.ts";
import type { Anchors } from "./acting.ts";
import { poleSag } from "./staging.ts";
import type { Camera } from "../../engine/camera.ts";

const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const mixHex = (a: string, b: string, t: number) => {
  const pa = channels(a);
  const pb = channels(b);
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).replace(/^(.)$/, "0$1")).join("")}`;
};

export type DropTone = { lit: string; shade: string };

const poleTone: DropTone = {
  lit: mixHex(dusk.shadowTeal, warm.bokeh[0], 0.35),
  shade: mixHex(dusk.shadowTeal, dusk.shadowViolet, 0.7),
};
const sprayTone: DropTone = {
  lit: mixHex(warm.bokeh[0], warm.dropHighlight, 0.3),
  shade: mixHex(warm.bokeh[1], warm.backSide, 0.45),
};
const gravity = 9.81;
const fps = 24;

export type DropLook = { x: number; y: number; size: number; angle: number; stretch: number; seed: number };

const outline = (look: DropLook): Point[][] => {
  const c = Math.cos(look.angle);
  const s = Math.sin(look.angle);
  const map = (px: number, py: number): Point => {
    const ax = px * look.size;
    const ay = py * look.size * look.stretch;
    return [look.x + ax * c - ay * s, look.y + ax * s + ay * c];
  };
  const pts: Point[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push(map(2 * u * t * 1.05, u * u * -1.4 + 2 * u * t * -0.1 + t * t));
  }
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push(map(2 * u * t * -1.05, u * u + 2 * u * t * -0.1 + t * t * -1.4));
  }
  return [boil(resample(smooth(pts, 1), Math.max(2, look.size * 0.35)), look.seed, 0.5)];
};

const drawTone = (ctx: CanvasRenderingContext2D, look: DropLook, light: Point, tone: DropTone, loose: boolean) => {
  const loops = outline(look);
  const l = Math.hypot(light[0], light[1]) || 1;
  const lx = light[0] / l;
  const ly = light[1] / l;
  tracePath(ctx, loops);
  ctx.fillStyle = tone.shade;
  ctx.fill();
  ctx.save();
  tracePath(ctx, loops);
  ctx.clip();
  ctx.translate(lx * look.size * 0.34, ly * look.size * 0.34);
  tracePath(ctx, loops);
  ctx.fillStyle = tone.lit;
  ctx.fill();
  ctx.restore();
  const c = Math.cos(look.angle);
  const s = Math.sin(look.angle);
  const hx = look.x + 0.28 * look.size * c - 0.2 * look.size * look.stretch * s;
  const hy = look.y + 0.28 * look.size * s + 0.2 * look.size * look.stretch * c;
  ctx.beginPath();
  ctx.arc(hx, hy, Math.max(0.9, look.size * (loose ? 0.34 : 0.26)), 0, Math.PI * 2);
  ctx.fillStyle = warm.dropHighlight;
  ctx.fill();
  drawStrokes(
    ctx,
    strokes(loops[0], true, {
      seed: look.seed * 17 + 3,
      base: Math.max(ink.minPx * 0.8, Math.min(2.6, look.size * 0.1)),
      min: ink.minPx * 0.85,
      max: ink.maxPx,
      light: [lx, ly],
      breakEvery: [look.size * 1.2, look.size * 3.5],
      cornerAngle: 1.2,
      gap: [-1, 1.4],
      litThin: loose ? 0.45 : 0.75,
      dropLit: loose ? 0.35 : 0.12,
      minLength: 6,
    }),
    ink.color,
  );
};

export type Flying = { born: number; x: number; y: number; vx: number; vy: number; g: number; size: number; seed: number };

const flyingLook = (d: Flying, frame: number): DropLook | null => {
  const age = frame - d.born;
  if (age < 0) return null;
  const x = d.x + d.vx * age;
  const vy = d.vy + d.g * age;
  const y = d.y + d.vy * age + 0.5 * d.g * age * age;
  if (x < -80 || x > 2000 || y > 1180 || y < -200) return null;
  return { x, y, size: d.size, angle: Math.atan2(-d.vx, vy), stretch: 1 + Math.hypot(d.vx, vy) * 0.012, seed: d.seed };
};

const bursts: readonly { frame: number; count: number; dir: number }[] = [
  { frame: 10, count: 12, dir: 1 },
  { frame: 14, count: 9, dir: -1 },
  { frame: 18, count: 6, dir: 1 },
  { frame: 21, count: 4, dir: -1 },
];

export const sprayAt = (frame: number, locate: (at: number) => Anchors, ppu: number): DropLook[] => {
  const out: DropLook[] = [];
  const g = (gravity / (fps * fps)) * (ppu / UNIT);
  for (let b = 0; b < bursts.length; b++) {
    const burst = bursts[b];
    if (frame < burst.frame) continue;
    const head = locate(burst.frame).head;
    const r = 0.78 * ppu;
    for (let k = 0; k < burst.count; k++) {
      const a = -Math.PI / 2 + burst.dir * (0.1 + 1.1 * hash(1563, b, k, 1));
      const speed = (70 + 150 * Math.pow(hash(1563, b, k, 2), 1.3)) * (ppu / 119);
      const va = a + burst.dir * (hash(1563, b, k, 3) - 0.5) * 0.5;
      const look = flyingLook(
        {
          born: burst.frame,
          x: head[0] + Math.cos(a) * r * (0.9 + 0.25 * hash(1563, b, k, 4)),
          y: head[1] + Math.sin(a) * r * (0.9 + 0.25 * hash(1563, b, k, 4)),
          vx: Math.cos(va) * speed,
          vy: Math.sin(va) * speed,
          g,
          size: (5 + 8 * hash(1563, b, k, 5)) * (ppu / 119),
          seed: 40 + b * 20 + k,
        },
        frame,
      );
      if (look) out.push(look);
    }
  }
  return out;
};

const poleLength = Math.hypot(pole.b[0] - pole.a[0], pole.b[1] - pole.a[1], pole.b[2] - pole.a[2]);

const poleLocal = (camera: Camera, t: number, bend?: (t: number) => number) => {
  const e = 0.004;
  const c = poleScreen(camera, t, bend);
  const p = poleScreen(camera, Math.max(0, t - e), bend);
  const q = poleScreen(camera, Math.min(1, t + e), bend);
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const l = Math.hypot(dx, dy) || 1;
  const along = (t * poleLength) / 0.34;
  const node = Math.exp(-Math.pow((along - Math.round(along)) * 9, 2));
  const nx = dy / l;
  const ny = -dx / l;
  const up = ny < 0 ? [nx, ny] : [-nx, -ny];
  return { x: c.x, y: c.y, scale: c.scale, half: pole.radius * c.scale * (1 + 0.12 * node), nx: up[0], ny: up[1] };
};

const leaveFrames = [78, 80, 83, 85, 88, 93];
const hangSpots: readonly number[] = [0.435, 0.458, 0.478, 0.548, 0.575, 0.562];

type Hang = { t: number; mass: number; leave: number; vx: number; vz: number; seed: number };

const hang: readonly Hang[] = leaveFrames.map((leave, k) => ({
  t: hangSpots[k] + (hash(1564, k, 6) - 0.5) * 0.008,
  mass: 0.35 + 0.35 * hash(1564, k, 2),
  leave,
  vx: (hash(1564, k, 3) - 0.5) * 0.36,
  vz: (1.15 - 0.1 * k) * (0.85 + 0.3 * hash(1564, k, 4)),
  seed: 7 + k * 3,
}));

export const drawSpray = (ctx: CanvasRenderingContext2D, look: DropLook, light: Point) => drawTone(ctx, look, light, sprayTone, true);

export const drawPoleDrops = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number, bend: ((t: number) => number) | undefined, light: Point) => {
  for (const d of hang) {
    const local = poleLocal(camera, d.t, bend);
    const size = local.half * d.mass;
    const x = local.x - local.nx * local.half * 0.95;
    const y = local.y - local.ny * local.half * 0.95 + size * 0.9;
    if (frame < d.leave) {
      const sway = frame >= 9 && frame <= 22 ? 0.05 * Math.sin(frame * 2.1 + d.seed) : 0;
      const v = (poleSag(frame) - poleSag(frame - 1)) * local.scale;
      const stretch = 1 + Math.min(0.35, Math.abs(v) * 0.02);
      drawTone(ctx, { x, y: y + size * 1.4 * (stretch - 1), size, angle: sway, stretch, seed: d.seed }, light, poleTone, false);
      continue;
    }
    const age = frame - d.leave;
    const vx = (d.vx * local.scale) / fps;
    const vy = (-d.vz * local.scale) / fps;
    const look = flyingLook({ born: 0, x, y, vx, vy, g: (gravity * local.scale) / (fps * fps), size, seed: d.seed }, age);
    if (look) drawTone(ctx, look, light, poleTone, false);
  }
};
