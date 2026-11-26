/**
 * 第 10 → 11 镜遮挡转场的翅膀（只属于这一段的特效）：麻雀右翼的下面，从镜头前掠过。
 * 画法按 motion.md「画面要活，不能假」那一行：初级飞羽一根根分开，每根有羽轴和半透明的浅色羽缘，次级飞羽成排，翼下覆羽两排扇形，
 * 颜色只取 tokens-sparrow.ts 的低夕光·干色板；运动模糊是把整张翅膀沿这一步的位移方向叠几次淡影，不是角色的拖影。
 * 20 步连成一段：第 10 镜第 74–83 帧是第 0–9 步（翅膀扑下来遮满画面，第 76 帧起遮住大半，满屏只有第 81 帧到第 11 镜第 0 帧），
 * 第 11 镜第 0–9 帧是第 10–19 步（翅膀往画右移开，从左下露出稻田）；切点两侧是同一段里相邻的两步，形状和颜色接得上。
 * 翅尖的起落跟着 timing.ts 的翅拍相位（上举、下扫、到底）。
 * 待定事项：TODO(design) 翅膀离镜头这么近时在画面上的大小、倾斜和羽片数目是按剧场版遮挡转场的习惯定的，没有参照可取。
 */
import { boil, drawStrokes, strokes } from "../../../../src/kit/engine/ink.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { ink } from "../../tokens.ts";
import { mixHex, sparrowPalettes } from "../../tokens-sparrow.ts";

export const WING_PASS_STEPS = 20;
export const WING_PASS_FULL_FROM = 7;
export const WING_PASS_FULL_TO = 10;
const BOB_OFFSET = 1;

const STEPS = WING_PASS_STEPS;
const TIP_X = [460, 320, 60, -320, -640, -840, -910, -940, -980, -940, -860, -700, -400, -60, 300, 680, 1060, 1430, 1700, 1950];
const SPAN = [2100, 2200, 2400, 2650, 2900, 3100, 3180, 3250, 3350, 3400, 3400, 3350, 3250, 3150, 3050, 2950, 2850, 2740, 2640, 2580];
const SLOPE = [25, 24, 21, 17, 13, 10, 9, 9, 9, 9, 9, 8, 7, 6, 5, 4, 2, 0, -2, -4];
const SHOULDER_Y = [-540, -520, -520, -500, -480, -460, -470, -500, -500, -500, -500, -480, -450, -420, -390, -390, -390, -400, -430, -480];
const CHORD = [1190, 1240, 1300, 1360, 1420, 1450, 1490, 1600, 1600, 1600, 1600, 1500, 1440, 1380, 1320, 1260, 1200, 1150, 1100, 1060];

const BUMP = 150;
const SWEEP = (40 * Math.PI) / 180;

const at = (table: readonly number[], step: number) => table[Math.max(0, Math.min(STEPS - 1, Math.round(step)))];

export const wingPassBob = (step: number) => {
  const phase = (((step + BOB_OFFSET) % 3) + 3) % 3;
  const key = phase === 0 ? 1 : phase === 1 ? -1 : 0;
  const next = phase === 0 ? -1 : phase === 1 ? 0 : 1;
  return key + (next - key) * (step - Math.floor(step));
};

export type WingPassPose = {
  tip: Point;
  spanDir: Point;
  spanLength: number;
  chord0: number;
};

export const wingPassPose = (step: number): WingPassPose => {
  const s = Math.max(0, Math.min(STEPS - 1, step));
  const slope = ((at(SLOPE, s) + wingPassBob(s) * 1.2) * Math.PI) / 180;
  const spanLength = at(SPAN, s);
  const tipX = at(TIP_X, s);
  const tip: Point = [tipX, at(SHOULDER_Y, s) + spanLength * Math.sin(slope)];
  return {
    tip,
    spanDir: [Math.cos(slope), -Math.sin(slope)],
    spanLength,
    chord0: at(CHORD, s),
  };
};

export const wingPassVelocity = (step: number): Point => {
  const a = wingPassPose(Math.max(0, step - 0.5));
  const b = wingPassPose(Math.min(STEPS - 1, step + 0.5));
  return [(b.tip[0] - a.tip[0]) * 0.5, (b.tip[1] - a.tip[1]) * 0.5];
};

type Layer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

const LAYER = { x: -1300, y: -1500, width: 5800, height: 3600 };
let layerCache: Layer | null = null;

const layer = (): Layer => {
  if (!layerCache) {
    const canvas = document.createElement("canvas");
    canvas.width = LAYER.width;
    canvas.height = LAYER.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("翅膀特效的离屏画布不可用。");
    layerCache = { canvas, ctx };
  }
  const { ctx } = layerCache;
  ctx.setTransform(1, 0, 0, 1, -LAYER.x, -LAYER.y);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(LAYER.x, LAYER.y, LAYER.width, LAYER.height);
  return layerCache;
};

const quadPoint = (p0: Point, p1: Point, p2: Point, t: number): Point => {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
};

const rotate = (v: Point, angle: number): Point => [
  v[0] * Math.cos(angle) - v[1] * Math.sin(angle),
  v[0] * Math.sin(angle) + v[1] * Math.cos(angle),
];

type FeatherColors = { fill: string; root: string; edge: string; shaft: string };

const feather = (
  ctx: CanvasRenderingContext2D,
  base: Point,
  tip: Point,
  width: number,
  bend: number,
  colors: FeatherColors,
  seed: number,
  amp: number,
) => {
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ctrl: Point = [(base[0] + tip[0]) / 2 + nx * bend, (base[1] + tip[1]) / 2 + ny * bend];
  const outline = (scale: number, end: number, tipStart: number): Point[] => {
    const n = 22;
    const center: Point[] = [];
    const half: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * end;
      center.push(quadPoint(base, ctrl, tip, t));
      const root = 0.82 + 0.18 * Math.min(1, t / 0.15);
      const taper = t > tipStart ? 1 - 0.7 * Math.pow((t - tipStart) / (end - tipStart), 1.6) : 1;
      const round = t > end - 0.1 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - (end - 0.1)) / 0.1, 2))) : 1;
      half.push((width / 2) * scale * root * taper * (0.3 + 0.7 * round));
    }
    const side = (sign: number): Point[] =>
      center.map((p, i): Point => [p[0] + nx * half[i] * sign, p[1] + ny * half[i] * sign]);
    return [...side(1), ...side(-1).reverse()];
  };
  const fringe = boil(outline(1, 1, 0.62), seed, amp);
  const core = boil(outline(0.78, 0.97, 0.68), seed + 1, amp);
  const trace = (loop: Point[]) => {
    ctx.beginPath();
    loop.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    ctx.closePath();
  };

  ctx.save();
  ctx.globalAlpha = 0.74;
  trace(fringe);
  const fg = ctx.createLinearGradient(base[0], base[1], tip[0], tip[1]);
  fg.addColorStop(0, colors.root);
  fg.addColorStop(0.4, colors.edge);
  fg.addColorStop(1, colors.edge);
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.restore();

  trace(core);
  const g = ctx.createLinearGradient(base[0], base[1], tip[0], tip[1]);
  g.addColorStop(0, colors.root);
  g.addColorStop(0.5, colors.fill);
  g.addColorStop(1, colors.fill);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  trace(core);
  ctx.clip();
  const r = (k: number) => hash(seed, k);
  const barbs = 26;
  ctx.strokeStyle = colors.edge;
  ctx.globalAlpha = 0.13;
  ctx.lineWidth = Math.max(1.2, width * 0.012);
  for (let k = 0; k < barbs; k++) {
    const t = 0.12 + (k / barbs) * 0.82;
    const c = quadPoint(base, ctrl, tip, t);
    const c2 = quadPoint(base, ctrl, tip, Math.min(1, t + 0.05));
    const tx = c2[0] - c[0];
    const ty = c2[1] - c[1];
    const reach = width * (0.3 + 0.12 * r(k));
    for (const sign of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c[0] + nx * reach * sign + tx * 1.6, c[1] + ny * reach * sign + ty * 1.6);
      ctx.stroke();
    }
  }
  ctx.restore();

  const shaftEnd = 0.9;
  const nShaft = 14;
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= nShaft; i++) {
    const t = (i / nShaft) * shaftEnd;
    const c = quadPoint(base, ctrl, tip, t);
    const w = 3 - (i / nShaft) * 1.8;
    top.push([c[0] + nx * w, c[1] + ny * w]);
    bottom.push([c[0] - nx * w, c[1] - ny * w]);
  }
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = colors.shaft;
  ctx.beginPath();
  [...top, ...bottom.reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.7;
  const trailSide = fringe.slice(0, 23);
  drawStrokes(
    ctx,
    strokes(trailSide, false, {
      seed: seed + 11,
      base: 2.6,
      min: 1.2,
      max: 3.4,
      light: [0.5, -0.86],
      breakEvery: [280, 560],
      cornerAngle: 1.2,
      gap: [-1.5, 2],
      litThin: 0.75,
      dropLit: 0.08,
      minLength: 40,
    }),
    ink.color,
  );
  ctx.restore();
};

const paintWing = (pose: WingPassPose, step: number) => {
  const { ctx } = layer();
  const pal = sparrowPalettes.lowDuskDry;
  const shoulder: Point = [
    pose.tip[0] + pose.spanDir[0] * pose.spanLength,
    pose.tip[1] + pose.spanDir[1] * pose.spanLength,
  ];
  const down: Point = [pose.spanDir[1], -pose.spanDir[0]];
  if (down[1] < 0) {
    down[0] = -down[0];
    down[1] = -down[1];
  }
  const up: Point = [-down[0], -down[1]];
  const chordAt = (u: number) => pose.chord0 * (1 - 0.32 * u) * (1 + 0.1 * Math.sin(Math.PI * u));
  const leadAt = (u: number): Point => [
    shoulder[0] - pose.spanDir[0] * pose.spanLength * u + up[0] * BUMP * Math.sin(Math.PI * Math.pow(u, 0.85)),
    shoulder[1] - pose.spanDir[1] * pose.spanLength * u + up[1] * BUMP * Math.sin(Math.PI * Math.pow(u, 0.85)),
  ];
  const trailDir = (u: number) => rotate(down, SWEEP * u);

  ctx.save();
  ctx.beginPath();
  const edge: Point[] = [];
  for (let i = 0; i <= 48; i++) edge.push(leadAt(i / 48));
  edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  for (let i = 48; i >= 0; i--) {
    const u = i / 48;
    const p = leadAt(u);
    const d = trailDir(u);
    ctx.lineTo(p[0] + d[0] * chordAt(u) * 1.05, p[1] + d[1] * chordAt(u) * 1.05);
  }
  ctx.closePath();
  ctx.clip();

  const back = ctx.createLinearGradient(shoulder[0], shoulder[1], pose.tip[0], pose.tip[1]);
  back.addColorStop(0, pal.streak.shade);
  back.addColorStop(0.55, pal.streak.lit);
  back.addColorStop(1, pal.mantle.shade);
  ctx.fillStyle = back;
  ctx.fillRect(LAYER.x, LAYER.y, LAYER.width, LAYER.height);

  const seedBase = Math.floor(hash(190, Math.floor(step / 2)) * 1e6);
  const amp = 1.1;
  const warmBrown = mixHex(pal.streak.lit, pal.mantle.lit, 0.42);
  const flightColors = (k: number): FeatherColors => ({
    fill: k % 2 === 0 ? warmBrown : mixHex(warmBrown, pal.streak.shade, 0.28),
    root: mixHex(pal.streak.shade, pal.mantle.shade, 0.3),
    edge: mixHex(pal.wingBar.lit, pal.belly.lit, 0.55),
    shaft: pal.wingBar.lit,
  });

  for (let i = 8; i >= 0; i--) {
    const k = i / 8;
    const u = 0.46 + k * 0.52;
    const root = leadAt(u);
    const d = trailDir(u);
    const chord = chordAt(u) * (1.08 + 0.3 * k);
    const b: Point = [root[0] + d[0] * chord * 0.36, root[1] + d[1] * chord * 0.36];
    const t: Point = [root[0] + d[0] * chord, root[1] + d[1] * chord];
    feather(ctx, b, t, chord * (0.26 - 0.1 * k), chord * 0.1, flightColors(i), seedBase + 200 + i * 23, amp);
  }
  for (let i = 5; i >= 0; i--) {
    const u = 0.03 + (i / 5) * 0.41;
    const root = leadAt(u);
    const d = trailDir(u);
    const chord = chordAt(u) * 1.04;
    const b: Point = [root[0] + d[0] * chord * 0.34, root[1] + d[1] * chord * 0.34];
    const t: Point = [root[0] + d[0] * chord, root[1] + d[1] * chord];
    feather(ctx, b, t, chord * 0.38, chord * 0.03, flightColors(i + 1), seedBase + i * 17, amp);
  }

  const covertRow = (
    v0: number,
    v1: number,
    count: number,
    fill: string,
    shade: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const u0 = i / count;
      const u1 = (i + 1) / count;
      const um = (u0 + u1) / 2;
      const p0 = leadAt(u0);
      const p1 = leadAt(u1);
      const pm = leadAt(um);
      const d0 = trailDir(u0);
      const d1 = trailDir(u1);
      const dm = trailDir(um);
      const c0 = chordAt(u0);
      const c1 = chordAt(u1);
      const cm = chordAt(um);
      ctx.beginPath();
      ctx.moveTo(p0[0] + d0[0] * c0 * v0, p0[1] + d0[1] * c0 * v0);
      ctx.lineTo(p1[0] + d1[0] * c1 * v0, p1[1] + d1[1] * c1 * v0);
      ctx.lineTo(p1[0] + d1[0] * c1 * v1 * 0.93, p1[1] + d1[1] * c1 * v1 * 0.93);
      ctx.quadraticCurveTo(pm[0] + dm[0] * cm * v1 * 1.14, pm[1] + dm[1] * cm * v1 * 1.14, p0[0] + d0[0] * c0 * v1 * 0.93, p0[1] + d0[1] * c0 * v1 * 0.93);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (shade > 0) {
        ctx.fillStyle = `rgba(54,41,43,${shade})`;
        ctx.fill();
      }
      ctx.strokeStyle = ink.color;
      ctx.lineWidth = 1.7;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };
  covertRow(0.29, 0.45, 11, pal.belly.lit, 0.32);
  covertRow(0.17, 0.3, 14, pal.belly.lit, 0.1);
  covertRow(0.07, 0.18, 18, pal.wingBar.lit, 0);

  const arm = ctx.createLinearGradient(shoulder[0], shoulder[1], pose.tip[0], pose.tip[1]);
  arm.addColorStop(0, pal.mantle.lit);
  arm.addColorStop(1, pal.mantle.shade);
  ctx.fillStyle = arm;
  ctx.beginPath();
  edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  for (let i = 48; i >= 0; i--) {
    const u = i / 48;
    const p = leadAt(u);
    const d = trailDir(u);
    ctx.lineTo(p[0] + d[0] * chordAt(u) * 0.08, p[1] + d[1] * chordAt(u) * 0.08);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink.color;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const shade = ctx.createRadialGradient(shoulder[0], shoulder[1], 0, shoulder[0], shoulder[1], pose.spanLength * 0.75);
  shade.addColorStop(0, "rgba(54,41,43,0.5)");
  shade.addColorStop(0.5, "rgba(54,41,43,0.14)");
  shade.addColorStop(1, "rgba(54,41,43,0)");
  ctx.fillStyle = shade;
  ctx.fillRect(LAYER.x, LAYER.y, LAYER.width, LAYER.height);
  ctx.restore();

  drawStrokes(
    ctx,
    strokes(edge, false, {
      seed: seedBase + 900,
      base: 3.6,
      min: 1.6,
      max: 4,
      light: [0.5, -0.86],
      breakEvery: [320, 640],
      cornerAngle: 1.2,
      gap: [-2, 3],
      litThin: 0.7,
      dropLit: 0.06,
      minLength: 60,
    }),
    ink.color,
  );
};

export const drawWingPass = (
  ctx: CanvasRenderingContext2D,
  step: number,
) => {
  const s = Math.max(0, Math.min(STEPS - 1, step));
  paintWing(wingPassPose(s), s);
  if (!layerCache) return;
  const velocity = wingPassVelocity(s);
  const speed = Math.hypot(velocity[0], velocity[1]);
  const copies: number = speed > 300 ? 9 : speed > 120 ? 6 : speed > 30 ? 2 : 1;
  const shutter = 0.4;
  ctx.save();
  for (let i = 0; i < copies; i++) {
    const k = copies === 1 ? 0 : i / (copies - 1);
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(layerCache.canvas, LAYER.x - velocity[0] * shutter * k, LAYER.y - velocity[1] * shutter * k);
  }
  ctx.restore();
};
