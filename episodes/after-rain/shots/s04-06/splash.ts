/**
 * 第 4 镜踩进水洼的溅水（motion.md「溅水」）：斜着踩进去，水先被推开、贴着水面排成一圈亮边，再立成前高后低的水扇（偏向前进的一侧，不是对称的皇冠），
 * 边缘拉出水指，水指尖端断成大小、方向各不相同的水滴。水片一拍二，水滴一拍一；全部在场景坐标里围着落点画，经镜头投影。
 * 水扇的半径和高度沿角度有三四个大起伏（不是一圈尖角），顶上一条泡沫亮边加断续的墨线，片身有竖向水纹，靠近镜头的一半是水扇的内侧、偏冷。
 * 分「后层」「前层」两次画：后层是背离镜头那一半的外侧（映着天，亮），前层是朝镜头这一半，人夹在两层之间。
 * 待定事项：无。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { drawStrokes, strokes } from "../../../../src/kit/engine/ink.ts";
import { hash, noise1, rng } from "../../../../src/kit/engine/random.ts";
import { clamp01 } from "../../../../src/kit/engine/timing.ts";
import { mixHex } from "./walk.ts";

export type SplashLook = { lit: string; warm: string; shade: string; foam: string; ink: string };

const RADII = [0.07, 0.12, 0.17, 0.21, 0.25];
const HEIGHTS = [0.004, 0.045, 0.09, 0.12, 0.135];
const SAMPLES = 120;
const THETA0 = -2.95;
const THETA1 = 2.55;
const LOBES = 5;
const LOBE_PHASE = 1.3;

type Drop = { spawn: number; theta: number; up: number; out: number; size: number; life: number };

const lobeTheta = (k: number) => ((2 * Math.PI * k - LOBE_PHASE) / LOBES);

const DROPS: readonly Drop[] = (() => {
  const r = rng(1884, 62);
  const out: Drop[] = [];
  for (let k = 0; k < 26; k++) {
    const lobe = Math.floor(r.next() * LOBES);
    const front = r.next() < 0.7;
    const theta = front ? lobeTheta(lobe) + r.range(-0.5, 0.5) : r.range(THETA0, THETA1);
    out.push({
      spawn: 65 + Math.floor(r.next() * 6),
      theta: Math.min(THETA1, Math.max(THETA0, theta)),
      up: r.range(1.0, 2.8),
      out: r.range(0.3, 1.6),
      size: r.next() < 0.3 ? r.range(6, 8.5) : r.range(2.6, 5.2),
      life: r.range(6, 11),
    });
  }
  return out;
})();

const forwardBias = (theta: number) => {
  const c = Math.cos(theta - 0.45);
  return c > 0 ? 0.55 + 0.45 * Math.pow(c, 0.7) : 0.55 - 0.14 * Math.min(1, -c * 2);
};

const lobeProfile = (theta: number) => Math.pow(0.5 + 0.5 * Math.cos(LOBES * theta - LOBE_PHASE), 1.6);

export const splashAge = (frame: number) => Math.max(0, Math.min(4, (Math.floor(frame / 2) * 2 - 62) / 2));

const sheetPoint = (sole: Vec3, azimuth: number, theta: number, radius: number, height: number, lean: number): Vec3 => {
  const ux = Math.sin(azimuth) * Math.cos(theta) + Math.cos(azimuth) * Math.sin(theta);
  const uy = Math.cos(azimuth) * Math.cos(theta) - Math.sin(azimuth) * Math.sin(theta);
  const r = radius + lean * height;
  return [sole[0] + ux * r, sole[1] + uy * r, height];
};

type Sample = { theta: number; radius: number; height: number; base: Vec3; top: Vec3; outer: boolean };

const buildSamples = (frame: number, sole: Vec3, azimuth: number, facing: (theta: number) => number): Sample[] => {
  const age = splashAge(frame);
  const rise = clamp01((age - 1) / 3);
  return Array.from({ length: SAMPLES }, (_, i) => {
    const theta = THETA0 + ((THETA1 - THETA0) * i) / (SAMPLES - 1);
    const l = lobeProfile(theta);
    const radius = RADII[age] * (0.92 + 0.12 * l);
    const height = HEIGHTS[age] * forwardBias(theta) * (0.5 + 0.62 * l);
    return {
      theta,
      radius,
      height,
      base: sheetPoint(sole, azimuth, theta, radius, 0, 0),
      top: sheetPoint(sole, azimuth, theta, radius, height, 0.25 * rise + 0.35 * l * rise),
      outer: facing(theta) < 0,
    };
  });
};

const traceSmooth = (ctx: CanvasRenderingContext2D, pts: readonly Point[]) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
};

export const drawSplash = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  options: { frame: number; drawing: number; sole: Vec3; azimuth: number; look: SplashLook; layer: "back" | "front" },
) => {
  const { frame, drawing, sole, azimuth, look, layer } = options;
  if (frame < 62) return;
  const screen = (p: Vec3): Point => {
    const q = project(camera, p);
    return [q.x, q.y];
  };
  const camDir: Vec3 = [camera.position[0] - sole[0], camera.position[1] - sole[1], 0];
  const camLen = Math.hypot(camDir[0], camDir[1]) || 1;
  const facing = (theta: number) => {
    const ux = Math.sin(azimuth) * Math.cos(theta) + Math.cos(azimuth) * Math.sin(theta);
    const uy = Math.cos(azimuth) * Math.cos(theta) - Math.sin(azimuth) * Math.sin(theta);
    return (ux * camDir[0] + uy * camDir[1]) / camLen;
  };
  const samples = buildSamples(frame, sole, azimuth, facing);
  const age = splashAge(frame);
  const scale = project(camera, sole).scale;
  const lineW = Math.max(1.3, Math.min(2.4, scale / 460));
  const wantOuter = layer === "back";
  const seed = Math.floor(hash(1884, drawing, wantOuter ? 1 : 2) * 1e6);

  if (!wantOuter) {
    for (const drop of DROPS) {
      const t = (frame - drop.spawn) / 24;
      if (t < 0 || t * 24 > drop.life) continue;
      const originSample = samples[Math.round(((drop.theta - THETA0) / (THETA1 - THETA0)) * (SAMPLES - 1))];
      const origin = sheetPoint(sole, azimuth, drop.theta, originSample.radius, originSample.height * 0.9 + 0.015, 0.5);
      const ux = Math.sin(azimuth) * Math.cos(drop.theta) + Math.cos(azimuth) * Math.sin(drop.theta);
      const uy = Math.cos(azimuth) * Math.cos(drop.theta) - Math.sin(azimuth) * Math.sin(drop.theta);
      const pos: Vec3 = [origin[0] + ux * drop.out * t, origin[1] + uy * drop.out * t, origin[2] + drop.up * t - 4.9 * t * t];
      if (pos[2] <= 0.002) continue;
      const vel: Vec3 = [ux * drop.out, uy * drop.out, drop.up - 9.8 * t];
      const p = screen(pos);
      const ahead = screen([pos[0] + vel[0] / 48, pos[1] + vel[1] / 48, pos[2] + vel[2] / 48]);
      const r = Math.max(1.8, drop.size * Math.min(1, scale / 800));
      const speed = Math.hypot(vel[0], vel[1], vel[2]);
      const stretch = 1 + Math.min(1.5, speed * 0.5);
      const ang = Math.atan2(ahead[1] - p[1], ahead[0] - p[0]);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.5 * stretch);
      ctx.bezierCurveTo(r * 0.95, -r * 0.2 * stretch, r * 0.9, r * 0.9, 0, r);
      ctx.bezierCurveTo(-r * 0.9, r * 0.9, -r * 0.95, -r * 0.2 * stretch, 0, -r * 1.5 * stretch);
      ctx.closePath();
      ctx.fillStyle = mixHex(look.lit, look.warm, 0.3);
      ctx.fill();
      if (r > 2.4) {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = look.shade;
        ctx.fillRect(-r * 1.2, r * 0.1, r * 2.4, r * 1.2);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(r * 0.22, r * 0.05, r * 0.26, 0, Math.PI * 2);
        ctx.fillStyle = look.foam;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.5 * stretch);
      ctx.bezierCurveTo(r * 0.95, -r * 0.2 * stretch, r * 0.9, r * 0.9, 0, r);
      ctx.bezierCurveTo(-r * 0.9, r * 0.9, -r * 0.95, -r * 0.2 * stretch, 0, -r * 1.5 * stretch);
      ctx.strokeStyle = look.ink;
      ctx.lineWidth = Math.max(0.9, lineW * 0.6);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (age === 0) {
    if (!wantOuter) return;
    const ring: Point[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ring.push(screen(sheetPoint(sole, azimuth, a, RADII[0] * (0.92 + 0.12 * lobeProfile(a)), 0, 0)));
    }
    ctx.save();
    traceSmooth(ctx, ring);
    ctx.strokeStyle = look.foam;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = lineW * 3;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const inLayer = (i: number) => samples[i].outer === wantOuter;
  ctx.save();
  if (wantOuter) {
    const ring = splashBaseRing(frame, sole, azimuth, drawing);
    if (ring) {
      traceSmooth(ctx, ring.map(screen));
      ctx.strokeStyle = look.foam;
      ctx.globalAlpha = 0.85 - age * 0.13;
      ctx.lineWidth = lineW * (3.4 - age * 0.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const runs: Sample[][] = [];
  let run: Sample[] = [];
  for (const s of samples) {
    if (s.outer === wantOuter) run.push(s);
    else if (run.length >= 3) {
      runs.push(run);
      run = [];
    } else run = [];
  }
  if (run.length >= 3) runs.push(run);

  const traceSheet = (list: readonly Sample[], topScale: number, lean: number) => {
    const bases = list.map((s) => screen(s.base));
    const tops = list.map((s) => screen(sheetPoint(sole, azimuth, s.theta, s.radius, s.height * topScale, lean)));
    ctx.beginPath();
    ctx.moveTo(bases[0][0], bases[0][1]);
    for (let i = 1; i < bases.length - 1; i++) {
      const a = bases[i];
      const b = bases[i + 1];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    for (let i = tops.length - 1; i > 0; i--) {
      const a = tops[i];
      const b = tops[i - 1];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    const last = tops[0];
    ctx.lineTo(last[0], last[1]);
    ctx.closePath();
    return { bases, tops };
  };

  for (const list of runs) {
    const midX = list.reduce((sum, s) => sum + screen(s.top)[0], 0) / list.length;
    const sunSide = clamp01(midX / camera.width);
    const { bases, tops } = traceSheet(list, 1, 0.4 * clamp01((age - 1) / 3));
    ctx.fillStyle = wantOuter
      ? mixHex(look.lit, look.warm, 0.1 + 0.5 * sunSide)
      : mixHex(look.shade, look.lit, 0.45 + 0.25 * sunSide);
    ctx.fill();
    ctx.strokeStyle = look.ink;
    ctx.lineWidth = lineW * 1.1;
    ctx.lineJoin = "round";
    ctx.stroke();

    const band = traceSheet(list, 0.34, 0.12);
    ctx.fillStyle = mixHex(look.shade, look.lit, wantOuter ? 0.3 : 0.1);
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
    void band;

    for (let i = 6; i < list.length - 4; i += 17) {
      const s = list[i];
      const low = 0.12 + 0.1 * noise1(i, drawing);
      const high = 0.62 + 0.25 * noise1(i + 9, drawing);
      const from = screen(sheetPoint(sole, azimuth, s.theta, s.radius, s.height * low, 0.1));
      const to = screen(sheetPoint(sole, azimuth, s.theta + 0.03, s.radius, s.height * high, 0.25));
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = look.shade;
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = lineW * 5;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = 9; i < list.length - 2; i += 19) {
      const from = tops[i];
      const to = [
        bases[i][0] + (tops[i][0] - bases[i][0]) * 0.35,
        bases[i][1] + (tops[i][1] - bases[i][1]) * 0.35,
      ];
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.strokeStyle = look.foam;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = lineW * 2.4;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const rim: Point[][] = [];
  let current: Point[] = [];
  for (let i = 0; i < samples.length; i++) {
    if (inLayer(i)) current.push(screen(samples[i].top));
    else if (current.length >= 3) {
      rim.push(current);
      current = [];
    } else current = [];
  }
  if (current.length >= 3) rim.push(current);
  for (const seg of rim) {
    traceSmooth(ctx, seg);
    ctx.strokeStyle = look.foam;
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = lineW * (2.3 - age * 0.2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const style = {
    seed,
    base: lineW * 1.25,
    min: lineW * 0.8,
    max: lineW * 1.6,
    light: [0.6, -0.8] as Point,
    breakEvery: [70, 170] as [number, number],
    cornerAngle: 1.2,
    gap: [2, 5] as [number, number],
    litThin: 0.75,
    dropLit: 0.22,
    minLength: 10,
  };
  for (const seg of rim) drawStrokes(ctx, strokes(seg, false, style), look.ink);
  ctx.restore();
};

export const splashBaseRing = (frame: number, sole: Vec3, azimuth: number, drawing: number): Vec3[] | null => {
  const age = splashAge(frame);
  if (age < 1) return null;
  const out: Vec3[] = [];
  for (let i = 0; i <= 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    out.push(sheetPoint(sole, azimuth, a, RADII[age] * (1.05 + 0.06 * Math.sin(a * 5 + drawing)), 0, 0));
  }
  return out;
};
