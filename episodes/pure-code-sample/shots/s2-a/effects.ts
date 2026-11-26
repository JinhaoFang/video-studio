/**
 * 镜头 S2 的手绘特效与接触道具：
 * 1) 麻雀在竹竿上的柔和带色接触阴影（精确贴合爪底，随竹竿弯曲同步位移，蹬离时淡出）；
 * 2) 挂在竹竿下方、种子固定不跳动的水珠（尺寸自然、先填色再重描水滴轮廓，第 78 帧起陆续甩落配合 pole_drip，并留两颗细小残珠映夕光）；
 * 3) 甩水区间（第 10–21 帧）从羽毛外沿呈自然放射扇面甩出的非均匀水珠与高光（f24 静默前完全飞离主角剪影）；
 * 4) 最快甩动、蹬离与振翅帧上紧贴动作弧线的赛璐璐拖影扇与干笔速度线；
 * 5) 蓬起与起飞后从身侧飘散的细小绒羽（看光前收净，不干扰看光帧）与夕光尘粒。
 * 所有颜色均取自 tokens.ts，不写散落色值。
 */
import { project } from "../../engine/camera.ts";
import type { Camera, Vec3 } from "../../engine/camera.ts";
import type { Point } from "../../engine/figure.ts";
import { boil, drawStrokes, strokes } from "../../engine/ink.ts";
import { hash, rng } from "../../engine/random.ts";
import { clamp01, ease, progress } from "../../engine/timing.ts";
import { poleScreen } from "../../pole.ts";
import { pole, poleAt } from "../../scene.ts";
import { dusk, ink, rain, sparrow as spPalette, warm } from "../../tokens.ts";
import { perch } from "../placeholder.ts";
import type { SparrowState } from "./choreography.ts";
import { perchPoint, poleBendAmount, poleBendAt } from "./choreography.ts";

const hexRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
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

type PoleDropSpec = {
  t: number;
  size: number;
  releaseFrame: number | null;
  vx: number;
  vz: number;
  seed: number;
};

const POLE_DROPS: readonly PoleDropSpec[] = [
  { t: 0.47, size: 0.3, releaseFrame: 81, vx: -0.025, vz: 0.14, seed: 101 },
  { t: 0.525, size: 0.36, releaseFrame: 78, vx: 0.02, vz: 0.22, seed: 102 },
  { t: 0.565, size: 0.23, releaseFrame: null, vx: 0, vz: 0, seed: 109 },
  { t: 0.615, size: 0.37, releaseFrame: 79, vx: -0.02, vz: 0.19, seed: 103 },
  { t: 0.675, size: 0.25, releaseFrame: null, vx: 0, vz: 0, seed: 108 },
  { t: 0.725, size: 0.33, releaseFrame: 85, vx: 0.04, vz: 0.12, seed: 104 },
];

type SprayDrop = {
  spawn: number;
  angle: number;
  startDist: number;
  speed: number;
  gravity: number;
  size: number;
  stretch: number;
  life: number;
  seed: number;
};

const SPRAY_DROPS: readonly SprayDrop[] = (() => {
  const r = rng(155, 88, 29);
  const bursts = [
    { spawn: 10, dir: 1, count: 16 },
    { spawn: 14, dir: -1, count: 18 },
    { spawn: 18, dir: 1, count: 15 },
    { spawn: 21, dir: -1, count: 7 },
  ];
  const out: SprayDrop[] = [];
  for (const burst of bursts) {
    for (let i = 0; i < burst.count; i++) {
      const fanSpread = r.range(-1.32, 0.16);
      const baseAngle = burst.dir > 0 ? fanSpread : Math.PI - fanSpread;
      const isHeroDrop = i < 4;
      const speed = isHeroDrop ? r.range(780, 1280) : r.range(600, 1480);
      out.push({
        spawn: burst.spawn + (burst.spawn < 21 && i % 5 === 0 ? 1 : 0),
        angle: baseAngle,
        startDist: r.range(180, 224),
        speed,
        gravity: r.range(680, 1140),
        size: isHeroDrop ? r.range(5.4, 8.2) : r.range(2.4, 5.2),
        stretch: r.range(1.4, 2.6),
        life: burst.spawn >= 21 ? r.range(2, 3) : r.range(4, 7),
        seed: Math.floor(r.next() * 1e6),
      });
    }
  }
  return out;
})();

type DustMote = {
  pos: Vec3;
  drift: Vec3;
  radius: number;
  phase: number;
  alpha: number;
};

const DUST_MOTES: readonly DustMote[] = (() => {
  const r = rng(155, 404, 19);
  const out: DustMote[] = [];
  for (let i = 0; i < 24; i++) {
    out.push({
      pos: [
        perchPoint[0] + r.range(-0.52, 0.92),
        perchPoint[1] + r.range(-0.4, 0.95),
        perchPoint[2] + r.range(-0.18, 0.56),
      ],
      drift: [r.range(0.008, 0.025), r.range(-0.005, 0.008), r.range(0.006, 0.022)],
      radius: r.range(1.6, 4.0),
      phase: r.range(0, Math.PI * 2),
      alpha: r.range(0.18, 0.44),
    });
  }
  return out;
})();

type DownFeather = {
  spawn: number;
  life: number;
  origin: [number, number];
  vx: number;
  vy: number;
  size: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  tone: string;
};

const DOWN_FEATHERS: readonly DownFeather[] = [
  { spawn: 22, life: 20, origin: [-182, -88], vx: -84, vy: -24, size: 9.8, swayAmp: 18, swayFreq: 0.24, phase: 0.4, tone: spPalette.belly.lit },
  { spawn: 22, life: 18, origin: [176, -96], vx: 92, vy: -20, size: 8.6, swayAmp: 16, swayFreq: 0.28, phase: 2.1, tone: spPalette.cheek.lit },
  { spawn: 77, life: 34, origin: [-68, -14], vx: -86, vy: -14, size: 10.6, swayAmp: 24, swayFreq: 0.2, phase: 1.3, tone: spPalette.wingBar.lit },
  { spawn: 78, life: 32, origin: [52, 24], vx: -42, vy: 18, size: 8.8, swayAmp: 19, swayFreq: 0.24, phase: 3.7, tone: spPalette.belly.lit },
];

const traceTeardrop = (ctx: CanvasRenderingContext2D, rx: number, ry: number) => {
  ctx.beginPath();
  ctx.moveTo(0, -ry * 1.48);
  ctx.bezierCurveTo(rx * 1.12, -ry * 0.22, rx * 1.04, ry * 0.86, 0, ry);
  ctx.bezierCurveTo(-rx * 1.04, ry * 0.86, -rx * 1.12, -ry * 0.22, 0, -ry * 1.48);
  ctx.closePath();
};

const drawTeardrop = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  fill: string,
  shade: string,
  alpha = 1,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);

  traceTeardrop(ctx, rx, ry);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.save();
  traceTeardrop(ctx, rx, ry);
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(-rx * 0.46, ry * 0.16, rx * 0.88, ry * 1.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  traceTeardrop(ctx, rx, ry);
  ctx.lineWidth = Math.max(1.0, Math.min(2.1, rx * 0.24));
  ctx.strokeStyle = ink.color;
  ctx.stroke();

  ctx.fillStyle = warm.dropHighlight;
  ctx.beginPath();
  ctx.arc(rx * 0.26, ry * 0.2, Math.max(1.0, rx * 0.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const drawContactShadow = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frame: number,
  ppu: number,
) => {
  if (frame >= 78) return;
  const bend = poleBendAt(frame);
  const contact = poleScreen(camera, perch, bend);
  const a = poleScreen(camera, Math.max(0, perch - 0.01), bend);
  const b = poleScreen(camera, Math.min(1, perch + 0.01), bend);
  const poleAngle = Math.atan2(b.y - a.y, b.x - a.x);
  const liftFade = frame < 74 ? 1 : clamp01(1 - progress(frame, 74, 77));
  const crouchBoost = frame >= 64 && frame <= 73 ? 1 + 0.14 * ease(progress(frame, 64, 70)) : 1;
  const radiusPx = pole.radius * contact.scale;
  const rx = ppu * 0.78 * crouchBoost;
  const ry = radiusPx * 0.32;

  ctx.save();
  ctx.translate(contact.x + ppu * 0.06, contact.y - radiusPx * 0.76);
  ctx.rotate(poleAngle);
  ctx.scale(1, ry / Math.max(1, rx));
  const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  grad.addColorStop(0, hexRgba(dusk.shadowViolet, 0.44 * liftFade));
  grad.addColorStop(0.55, hexRgba(dusk.shadowViolet, 0.28 * liftFade));
  grad.addColorStop(1, hexRgba(dusk.shadowViolet, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const drawPoleDrops = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frame: number,
) => {
  const bend = poleBendAt(frame);
  const bendVel = poleBendAmount(frame) - poleBendAmount(Math.max(0, frame - 1));
  const litColor = mixHex(warm.bokeh[0], dusk.cloudGap[0], 0.42);
  const shadeColor = mixHex(dusk.shadowTeal, dusk.shadowViolet, 0.45);

  for (let i = 0; i < POLE_DROPS.length; i++) {
    const drop = POLE_DROPS[i];
    const released = drop.releaseFrame !== null && frame >= drop.releaseFrame;
    if (!released) {
      const s = poleScreen(camera, drop.t, bend);
      if (s.x < 40 || s.x > camera.width - 40) continue;
      const half = pole.radius * s.scale;
      const r = half * drop.size;
      const stretch = 1 + clamp01(Math.abs(bendVel) * 32) * 0.45;
      const wobble = Math.sin(frame * 0.35 + drop.seed) * Math.min(2.5, Math.abs(bendVel) * 120);
      const x = s.x + wobble;
      const y = s.y + half * 0.94 + r * 0.82 * stretch;
      drawTeardrop(ctx, x, y, r * 0.85, r * 1.05 * stretch, wobble * 0.04, litColor, shadeColor, 0.94);
    } else {
      const dt = (frame - drop.releaseFrame!) / 24;
      if (dt > 0.85) continue;
      const base = poleAt(drop.t);
      const b0 = poleBendAt(drop.releaseFrame!);
      const z0 = base[2] + (b0 ? b0(drop.t) : 0) - pole.radius * 1.3;
      const pos: Vec3 = [
        base[0] + drop.vx * dt,
        base[1] + 0.02 * dt,
        z0 + drop.vz * dt - 4.9 * dt * dt,
      ];
      const p = project(camera, pos);
      if (p.y > camera.height + 60) continue;
      const r = pole.radius * p.scale * drop.size * 0.88;
      const vz = drop.vz - 9.8 * dt;
      const stretch = 1 + clamp01(Math.abs(vz) / 3.5) * 0.95;
      const angle = Math.atan2(drop.vx, Math.max(0.2, -vz)) * 0.35;
      drawTeardrop(ctx, p.x, p.y, r * 0.74, r * stretch, angle, litColor, shadeColor, 0.92);
    }
  }
};

export const drawShakeSpray = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frame: number,
) => {
  if (frame < 10 || frame > 25) return;
  const origin = project(camera, [perchPoint[0], perchPoint[1], perchPoint[2] + 0.088]);
  const litColor = mixHex(warm.dropHighlight, warm.bokeh[0], 0.28);
  const shadeColor = mixHex(dusk.shadowTeal, rain.paddyWater, 0.42);

  for (let i = 0; i < SPRAY_DROPS.length; i++) {
    const d = SPRAY_DROPS[i];
    const age = frame - d.spawn;
    if (age < 0 || age > d.life) continue;
    const t = age / 24;
    const vx = Math.cos(d.angle) * d.speed * (1 - 0.25 * t);
    const vy = Math.sin(d.angle) * d.speed * (1 - 0.25 * t) + d.gravity * t;
    const x = origin.x + Math.cos(d.angle) * (d.startDist + d.speed * t * (1 - 0.12 * t));
    const y = origin.y + Math.sin(d.angle) * (d.startDist + d.speed * t * (1 - 0.12 * t)) + 0.5 * d.gravity * t * t;
    if (x < -40 || x > 1960 || y < -40 || y > 1120) continue;

    const fade = clamp01(1 - progress(age, d.life * 0.5, d.life));
    const speedNorm = Math.hypot(vx, vy) / 700;
    const angle = Math.atan2(vy, vx) - Math.PI / 2;
    const rx = d.size * (0.52 + 0.28 * (1 - clamp01(speedNorm)));
    const ry = d.size * (1 + d.stretch * 0.5 * clamp01(speedNorm));
    drawTeardrop(ctx, x, y, rx, ry, angle, litColor, shadeColor, 0.9 * fade);
  }
};

const drawCrescentArc = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number,
  color: string,
) => {
  const steps = 12;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const r = rInner + (rOuter - rInner) * Math.sin(Math.PI * t);
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const px = cx + Math.cos(a) * rInner;
    const py = cy + Math.sin(a) * rInner;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
};

export const drawActionSmear = (
  ctx: CanvasRenderingContext2D,
  state: SparrowState,
  x: number,
  y: number,
  ppu: number,
  frame: number,
  behind: boolean,
) => {
  if (state.smearKind === "none" || state.smearStrength <= 0.05) return;
  const seed = Math.floor(hash(155, frame, behind ? 1 : 2) * 1e6);
  const style = {
    seed,
    base: Math.max(1.7, ppu * 0.02),
    min: 0.9,
    max: 3.2,
    light: [0.55, -0.82] as Point,
    breakEvery: [160, 320] as [number, number],
    cornerAngle: 1.4,
    gap: [2, 6] as [number, number],
    litThin: 0.7,
    dropLit: 0.1,
    minLength: 14,
  };

  ctx.save();
  if (state.smearKind === "shake") {
    const dir = state.smearDir;
    const s = state.smearStrength;
    const hx = x + ppu * 0.2;
    const hy = y - ppu * 0.65;
    if (behind) {
      const a0 = dir > 0 ? -2.75 : -0.35;
      const a1 = dir > 0 ? -1.15 : -1.95;
      drawCrescentArc(ctx, hx, hy, ppu * 1.15, ppu * 0.68, a0, a1, hexRgba(spPalette.crown.lit, 0.28 * s));
      drawCrescentArc(ctx, hx, hy, ppu * 1.24, ppu * 0.88, a0 + dir * 0.1, a1, hexRgba(warm.rim, 0.24 * s));
    } else {
      for (let k = 0; k < 4; k++) {
        const rad = ppu * (1.2 + k * 0.2);
        const startA = dir > 0 ? -2.65 + k * 0.12 : -0.48 - k * 0.12;
        const span = (0.78 + 0.24 * hash(seed, k, 4)) * (dir > 0 ? 1 : -1);
        const pts: Point[] = [];
        for (let i = 0; i <= 8; i++) {
          const a = startA + (span * i) / 8;
          pts.push([hx + Math.cos(a) * rad * 1.08, hy + Math.sin(a) * rad * 0.78]);
        }
        const bpts = boil(pts, seed + k * 13, 0.6);
        const col = k % 2 === 0 ? hexRgba(ink.color, 0.68 * s) : hexRgba(warm.rim, 0.82 * s);
        drawStrokes(ctx, strokes(bpts, false, { ...style, seed: seed + k * 91, base: 2.3 * s }), col);
      }
    }
  } else if (state.smearKind === "launch" || state.smearKind === "wingbeat") {
    const s = state.smearStrength;
    const isLaunch = state.smearKind === "launch";
    const wcx = x - ppu * 0.42;
    const wcy = y - ppu * 0.12;
    if (behind) {
      for (let k = 0; k < 4; k++) {
        const rad = ppu * (1.28 + k * 0.24);
        const startA = -2.95 + k * 0.08;
        const endA = -2.02 - k * 0.05;
        const pts: Point[] = [];
        for (let i = 0; i <= 8; i++) {
          const a = startA + ((endA - startA) * i) / 8;
          pts.push([wcx + Math.cos(a) * rad * 1.05, wcy + Math.sin(a) * rad * 0.92]);
        }
        const bpts = boil(pts, seed + k * 23, 0.5);
        const col = k % 2 === 0 ? hexRgba(spPalette.mantle.lit, 0.32 * s) : hexRgba(warm.rim, 0.36 * s);
        drawStrokes(
          ctx,
          strokes(bpts, false, { ...style, seed: seed + k * 67, base: Math.max(2.6, ppu * 0.048) * s, max: 7.5 }),
          col,
        );
      }
    } else {
      for (let k = 0; k < 3; k++) {
        const rad = ppu * (1.52 + k * 0.28);
        const startA = -2.88 + k * 0.1;
        const endA = -2.06 - k * 0.06;
        const pts: Point[] = [];
        for (let i = 0; i <= 8; i++) {
          const a = startA + ((endA - startA) * i) / 8;
          pts.push([wcx + Math.cos(a) * rad * 1.08, wcy + Math.sin(a) * rad * 0.9]);
        }
        const bpts = boil(pts, seed + k * 19, 0.55);
        const col = k === 0 ? hexRgba(warm.rim, 0.78 * s) : hexRgba(ink.color, 0.52 * s);
        drawStrokes(ctx, strokes(bpts, false, { ...style, seed: seed + k * 41, base: 1.9 * s }), col);
      }
      if (isLaunch) {
        for (let k = 0; k < 3; k++) {
          const off = (k - 1) * ppu * 0.34;
          const len = ppu * (1.15 + 0.4 * hash(seed, k, 11));
          const pts: Point[] = [
            [x - ppu * 0.48 + off, y + ppu * 0.58],
            [x - ppu * 0.48 - len * 0.74 + off, y + ppu * 0.58 + len * 0.66],
          ];
          const bpts = boil(pts, seed + k * 31, 0.4);
          drawStrokes(ctx, strokes(bpts, false, { ...style, seed: seed + k * 53, base: 1.8 * s }), hexRgba(warm.rim, 0.68 * s));
        }
      }
    }
  }
  ctx.restore();
};

const drawFeatherWisp = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rot: number,
  tone: string,
  alpha: number,
) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.quadraticCurveTo(-size * 0.2, -size * 0.52, size * 0.9, -size * 0.12);
  ctx.quadraticCurveTo(size * 0.25, size * 0.42, -size, 0);
  ctx.closePath();
  ctx.fillStyle = tone;
  ctx.fill();
  ctx.lineWidth = 0.95;
  ctx.strokeStyle = hexRgba(ink.color, 0.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-size * 1.15, size * 0.04);
  ctx.quadraticCurveTo(0, -size * 0.08, size * 0.78, -size * 0.1);
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = hexRgba(ink.color, 0.55);
  ctx.stroke();
  ctx.restore();
};

export const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frame: number,
) => {
  const t = frame / 24;
  ctx.save();
  for (let i = 0; i < DUST_MOTES.length; i++) {
    const m = DUST_MOTES[i];
    const pos: Vec3 = [
      m.pos[0] + m.drift[0] * t + Math.sin(t * 0.9 + m.phase) * 0.015,
      m.pos[1] + m.drift[1] * t,
      m.pos[2] + m.drift[2] * t + Math.cos(t * 0.7 + m.phase) * 0.012,
    ];
    const p = project(camera, pos);
    if (p.x < -20 || p.x > 1940 || p.y < -20 || p.y > 1100) continue;
    const pulse = 0.68 + 0.32 * Math.sin(t * 2.1 + m.phase);
    const rightWarm = clamp01((p.x / 1920) * 1.15);
    const r = m.radius * (0.85 + 0.35 * rightWarm);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.2);
    grad.addColorStop(0, hexRgba(warm.dropHighlight, m.alpha * pulse * (0.65 + 0.5 * rightWarm)));
    grad.addColorStop(0.5, hexRgba(warm.rim, m.alpha * 0.45 * pulse));
    grad.addColorStop(1, hexRgba(warm.rim, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const origin = project(camera, [perchPoint[0], perchPoint[1], perchPoint[2] + 0.06]);
  for (let i = 0; i < DOWN_FEATHERS.length; i++) {
    const f = DOWN_FEATHERS[i];
    const age = frame - f.spawn;
    if (age < 0 || age > f.life) continue;
    const dt = age / 24;
    const x = origin.x + f.origin[0] + f.vx * dt + Math.sin(age * f.swayFreq + f.phase) * f.swayAmp;
    const y = origin.y + f.origin[1] + f.vy * dt + 28 * dt * dt;
    const rot = Math.cos(age * f.swayFreq + f.phase) * 0.65;
    const alpha = clamp01(1 - progress(age, f.life * 0.62, f.life)) * 0.76;
    drawFeatherWisp(ctx, x, y, f.size, rot, f.tone, alpha);
  }
  ctx.restore();
};
