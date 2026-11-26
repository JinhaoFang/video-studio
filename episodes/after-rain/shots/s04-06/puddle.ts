/**
 * 第 4、6 镜共用的活水洼：在底图里烘死的水洼上重画一层会动的水（motion.md「画面要活，不能假」）。
 * 岸边的湿泥、靠岸一头倒映的树篱、倒映的放晴的天、慢慢漂的云影（每秒不超过画幅的 0.3%）、一圈圈往外扩的涟漪、被踩时按行错开又合拢的倒影。
 * 轮廓在场景坐标里围着 scene.ts 的 puddleW1（带几个瓣和不规则的边），经镜头投影，跟着摇和变焦走；
 * 每一行是一道横向的水粉笔触，画法和底图一致。frontFromY 用来在人画完之后把比脚更近的那几行水重画一遍，鞋陷进水里的那一段就被水盖住。
 * 待定事项：底图里的水洼是烘死的，这一层把它整个盖住；底图的轮廓若改，这里的瓣要跟着改。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { fbm2, noise1 } from "../../../../src/kit/engine/random.ts";
import { clamp01 } from "../../../../src/kit/engine/timing.ts";
import { puddleW1 } from "../../scene.ts";
import { mixHex } from "./walk.ts";

export type PuddleLook = {
  bank: string;
  bankWet: string;
  hedge: string;
  sky: string;
  warm: string;
  cloud: string;
  foam: string;
};

export type Ripple = {
  frame: number;
  x: number;
  y: number;
  rings?: number;
  speed?: number;
  life?: number;
};

export type PuddleState = {
  frame: number;
  drawing: number;
  look: PuddleLook;
  ripples: readonly Ripple[];
  shatter?: { frame: number; x: number; y: number; strength?: number };
  frontFromY?: number;
};

export const puddleOutline = (steps = 48): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const lobe =
      1.04 +
      0.14 * Math.sin(2 * a + 0.7) +
      0.1 * Math.cos(3 * a - 0.5) +
      0.07 * Math.sin(5 * a + 1.4) +
      (noise1(i * 0.75, 1881) - 0.5) * 0.14;
    out.push([puddleW1.x + Math.cos(a) * puddleW1.rx * lobe, puddleW1.y + Math.sin(a) * puddleW1.ry * lobe, 0]);
  }
  return out;
};

export const insidePuddle = (x: number, y: number): boolean => {
  const outline = puddleOutline();
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [xi, yi] = outline[i];
    const [xj, yj] = outline[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const rowSpans = (poly: readonly Point[], y: number): [number, number][] => {
  const xs: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
      xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
  }
  xs.sort((p, q) => p - q);
  const spans: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) spans.push([xs[i], xs[i + 1]]);
  return spans;
};

export const drawPuddle = (ctx: CanvasRenderingContext2D, camera: Camera, state: PuddleState) => {
  const projected = puddleOutline().map((p) => {
    const q = project(camera, p);
    return [q.x, q.y] as Point;
  });
  if (projected.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return;
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  if (xMax < -20 || xMin > camera.width + 20 || yMax < -20 || yMin > camera.height + 20) return;
  const { frame, drawing, look } = state;
  const scale = project(camera, [puddleW1.x, puddleW1.y, 0]).scale;
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;
  const height = Math.max(1, yMax - yMin);
  const frontFromY = state.frontFromY ?? -Infinity;
  const front = state.frontFromY !== undefined;

  const outlinePath = (grow: number, vertical: number) => {
    ctx.beginPath();
    projected.forEach(([x, y], i) => {
      const px = cx + (x - cx) * (1 + grow) + (noise1(i * 1.3, drawing + 9) - 0.5) * 3;
      const py = cy + (y - cy) * (1 + vertical) + (noise1(i * 1.3 + 40, drawing + 9) - 0.5) * 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  };

  ctx.save();
  if (!front) {
    ctx.save();
    outlinePath(0.1, 0.5);
    ctx.fillStyle = look.bank;
    ctx.globalAlpha = 0.88;
    ctx.fill();
    outlinePath(0.035, 0.2);
    ctx.fillStyle = look.bankWet;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.rect(0, Math.max(0, frontFromY - 1), camera.width, camera.height);
    ctx.clip();
  }
  outlinePath(0, 0);
  ctx.clip();

  const rowH = Math.max(3, Math.min(7, height / 11));
  const drift = frame * 0.24;
  const shatter = state.shatter && frame >= state.shatter.frame ? state.shatter : undefined;
  const shatterAge = shatter ? frame - shatter.frame : 0;
  const shatterAmp = shatter ? 13 * (shatter.strength ?? 1) * Math.exp(-shatterAge / 9) : 0;
  const impact = shatter ? project(camera, [shatter.x, shatter.y, 0]) : null;

  for (let y = yMin + rowH * 0.5; y < yMax; y += rowH) {
    if (y < frontFromY) continue;
    const v = clamp01((y - yMin) / height);
    let dx = 0;
    if (shatter && impact) {
      const dy = y - impact.y;
      dx = shatterAmp * Math.sin(dy * 0.31 + shatterAge * 1.2) * Math.exp(-Math.abs(dy) / 36);
      dx += shatterAmp * 0.45 * Math.tanh(dy / 14) * Math.exp(-Math.abs(dy) / 48);
    }
    const rowSeed = drawing * 13 + Math.round(y / rowH);
    for (const [sx0, sx1] of rowSpans(projected, y)) {
      const span = sx1 - sx0;
      if (span < 4) continue;
      const segCount = Math.max(1, Math.round(span / Math.max(40, span / 7)));
      const rowColor = mixHex(look.hedge, look.sky, Math.pow(clamp01((v - 0.05) / 0.3), 0.65));
      for (let s = 0; s < segCount; s++) {
        const x0 = sx0 + (span * s) / segCount;
        const x1 = sx0 + (span * (s + 1)) / segCount;
        const xm = (x0 + x1) / 2;
        let color = rowColor;
        const cloud = fbm2((xm + drift) / 250, (y - yMin) / 36 + drift / 500, 1884, 3);
        if (cloud < 0.56 && v > 0.1) color = mixHex(color, look.cloud, Math.min(1, (0.56 - cloud) * 2.4));
        const sunSide = clamp01((xm - cx) / (xMax - xMin || 1) + 0.5);
        color = mixHex(color, look.warm, 0.5 * sunSide * sunSide * (0.35 + 0.65 * v));
        const brush = noise1(xm / 29 + rowSeed * 0.37, 1886);
        color = mixHex(color, brush > 0.5 ? look.sky : look.cloud, Math.abs(brush - 0.5) * 0.75);
        const jx = (noise1(xm * 0.31 + rowSeed, 7) - 0.5) * 2.2;
        const jy = (noise1(rowSeed * 1.7 + s, 11) - 0.5) * 0.9;
        ctx.fillStyle = color;
        ctx.fillRect(x0 + dx + jx, y - rowH / 2 + jy, x1 - x0 + 1, rowH + 0.7);
        ctx.fillStyle = mixHex(color, look.bank, 0.4);
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x0 + dx + jx, y + rowH / 2 - 1 + jy, x1 - x0 + 1, 1);
        ctx.globalAlpha = 1;
      }
      if (v < 0.12 && dx === 0) {
        ctx.strokeStyle = mixHex(look.hedge, look.bank, 0.3);
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx0 + 2, yMin + 1.5);
        ctx.lineTo(sx1 - 2, yMin + 1.5 + (noise1(rowSeed, 3) - 0.5) * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
  ctx.restore();

  ctx.save();
  if (front) {
    ctx.beginPath();
    ctx.rect(0, Math.max(0, frontFromY - 1), camera.width, camera.height);
    ctx.clip();
  }
  const lineW = Math.max(1.1, Math.min(2.0, scale / 520));
  for (const ripple of state.ripples) {
    const rings = ripple.rings ?? 2;
    const speed = ripple.speed ?? 0.22;
    const life = (ripple.life ?? 0.75) * 24;
    for (let ring = 0; ring < rings; ring++) {
      const age = frame - ripple.frame - ring * 4;
      if (age < 0 || age > life) continue;
      const radius = 0.025 + (speed * age) / 24;
      const fade = 1 - age / life;
      const pts: Point[] = [];
      for (let i = 0; i <= 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const q = project(camera, [ripple.x + Math.cos(a) * radius, ripple.y + Math.sin(a) * radius, 0]);
        pts.push([q.x, q.y]);
      }
      ctx.beginPath();
      pts.forEach(([x, yy], i) => (i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)));
      ctx.strokeStyle = mixHex(look.bank, look.sky, 0.3);
      ctx.globalAlpha = 0.6 * fade;
      ctx.lineWidth = lineW * 1.15;
      ctx.stroke();
      ctx.beginPath();
      pts.slice(0, 20).forEach(([x, yy], i) => (i === 0 ? ctx.moveTo(x, yy - lineW) : ctx.lineTo(x, yy - lineW)));
      ctx.strokeStyle = look.foam;
      ctx.globalAlpha = 0.85 * fade;
      ctx.lineWidth = lineW;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
};
