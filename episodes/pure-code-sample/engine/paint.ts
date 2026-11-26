/**
 * 水粉笔触栅格化（Node 里烘焙底图用，也可在浏览器里用）：画布是预乘透明度的浮点 RGBA。
 * stroke 是一笔弯曲、带刷毛、两端收尖的平头笔，按像素到折线的距离栅格化：边缘有干笔的毛糙，刷毛方向有深浅条纹，颜料越往后越少，
 * 不用模糊掩盖形体。polygon 是带抗锯齿的扫描线填充，用来铺大块明暗；roughen 把多边形边加密并按噪声推拉，让边像笔画出来的。
 * mottle 在已经上色的地方加多尺度的斑驳，不用细长的行列噪声。toBytes 输出非预乘的 8 位 RGBA。
 */
import { fbm2, noise1, noise2 } from "./random.ts";

export type Paper = { width: number; height: number; data: Float32Array };
export type RGB = [number, number, number];
export type Pt = [number, number];

export const paper = (width: number, height: number): Paper => ({ width, height, data: new Float32Array(width * height * 4) });

export const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const shadeRgb = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

export type StrokeOptions = {
  width: number;
  color: RGB;
  alpha?: number;
  seed: number;
  taper?: [number, number];
  bristles?: number;
  streak?: number;
  dry?: number;
  rough?: number;
  body?: number;
  wobble?: number;
  widthAt?: (u: number) => number;
};

export const stroke = (c: Paper, pts: readonly Pt[], o: StrokeOptions) => {
  const n = pts.length;
  if (n < 2) return;
  const alpha = o.alpha ?? 1;
  const taper = o.taper ?? [0.12, 0.2];
  const bristles = o.bristles ?? Math.max(3, o.width / 2.5);
  const streak = o.streak ?? 0.12;
  const dry = o.dry ?? 0.3;
  const rough = o.rough ?? 0.5;
  const body = o.body ?? 0.35;
  const wobble = o.wobble ?? 0.15;
  const seed = o.seed;
  const ax = new Float64Array(n - 1);
  const ay = new Float64Array(n - 1);
  const dx = new Float64Array(n - 1);
  const dy = new Float64Array(n - 1);
  const len2 = new Float64Array(n - 1);
  const start = new Float64Array(n - 1);
  let total = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n - 1; i++) {
    ax[i] = pts[i][0];
    ay[i] = pts[i][1];
    dx[i] = pts[i + 1][0] - pts[i][0];
    dy[i] = pts[i + 1][1] - pts[i][1];
    len2[i] = Math.max(1e-9, dx[i] * dx[i] + dy[i] * dy[i]);
    start[i] = total;
    total += Math.sqrt(len2[i]);
  }
  for (const p of pts) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const reach = o.width * 0.5 * (1 + wobble) + 2;
  const x0 = Math.max(0, Math.floor(minX - reach));
  const y0 = Math.max(0, Math.floor(minY - reach));
  const x1 = Math.min(c.width - 1, Math.ceil(maxX + reach));
  const y1 = Math.min(c.height - 1, Math.ceil(maxY + reach));
  const reach2 = reach * reach;
  const [cr, cg, cb] = o.color;
  const d = c.data;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let best = Infinity;
      let bu = 0;
      let side = 1;
      for (let i = 0; i < n - 1; i++) {
        let t = ((x - ax[i]) * dx[i] + (y - ay[i]) * dy[i]) / len2[i];
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax[i] + dx[i] * t - x;
        const py = ay[i] + dy[i] * t - y;
        const dd = px * px + py * py;
        if (dd < best) {
          best = dd;
          bu = start[i] + t * Math.sqrt(len2[i]);
          side = dx[i] * (y - ay[i]) - dy[i] * (x - ax[i]) >= 0 ? 1 : -1;
        }
      }
      if (best > reach2) continue;
      const u = total > 0 ? bu / total : 0;
      const tp = Math.min(1, u / taper[0], (1 - u) / taper[1]);
      const shape = o.widthAt ? o.widthAt(u) : 1;
      const hw = Math.max(0.35, o.width * 0.5 * shape * Math.sqrt(Math.max(0, tp)) * (1 + wobble * (noise1(bu / (o.width * 1.7) + seed * 0.37, seed) - 0.5) * 2));
      const dist = Math.sqrt(best);
      const q = dist / hw;
      const edge = 1 + rough * 0.22 * (noise2(bu * 0.11, side * 3.1 + seed, seed + 1) - 0.5) * 2;
      const aEdge = Math.min(1, Math.max(0, (edge - q) * hw + 0.5));
      if (aEdge <= 0) continue;
      const across = (side * Math.min(1, q) + 1) * 0.5;
      const bristle = noise1(across * bristles + seed * 0.71, seed + 2);
      const fine = noise2(bu * 0.28, across * bristles * 2.3, seed + 3);
      const load = 1 - dry * Math.pow(u, 1.6);
      const raw = bristle * 0.55 + fine * 0.45 + body - (1 - load) * 1.3;
      const cover = raw <= 0.25 ? 0 : raw >= 0.55 ? 1 : (raw - 0.25) / 0.3;
      const a = alpha * aEdge * cover;
      if (a <= 0.002) continue;
      const k = 1 + (bristle - 0.5) * streak * 2;
      const idx = (y * c.width + x) * 4;
      const inv = 1 - a;
      d[idx] = d[idx] * inv + cr * k * a;
      d[idx + 1] = d[idx + 1] * inv + cg * k * a;
      d[idx + 2] = d[idx + 2] * inv + cb * k * a;
      d[idx + 3] = d[idx + 3] * inv + a;
    }
  }
};

export const polygon = (c: Paper, pts: readonly Pt[], color: RGB, alpha = 1) => {
  const n = pts.length;
  if (n < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(c.height - 1, Math.ceil(maxY));
  const cover = new Float32Array(c.width + 2);
  const xs: number[] = [];
  const sub = 4;
  const d = c.data;
  for (let y = y0; y <= y1; y++) {
    cover.fill(0);
    let any = false;
    let lo = c.width;
    let hi = 0;
    for (let s = 0; s < sub; s++) {
      const sy = y + (s + 0.5) / sub;
      xs.length = 0;
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.min(c.width, xs[k]));
        const xb = Math.max(0, Math.min(c.width, xs[k + 1]));
        if (xb <= xa) continue;
        any = true;
        const ia = Math.floor(xa);
        const ib = Math.floor(xb);
        lo = Math.min(lo, ia);
        hi = Math.max(hi, ib);
        if (ia === ib) cover[ia] += (xb - xa) / sub;
        else {
          cover[ia] += (ia + 1 - xa) / sub;
          for (let i = ia + 1; i < ib; i++) cover[i] += 1 / sub;
          cover[ib] += (xb - ib) / sub;
        }
      }
    }
    if (!any) continue;
    for (let x = lo; x <= Math.min(hi, c.width - 1); x++) {
      const a = Math.min(1, cover[x]) * alpha;
      if (a <= 0) continue;
      const idx = (y * c.width + x) * 4;
      const inv = 1 - a;
      d[idx] = d[idx] * inv + color[0] * a;
      d[idx + 1] = d[idx + 1] * inv + color[1] * a;
      d[idx + 2] = d[idx + 2] * inv + color[2] * a;
      d[idx + 3] = d[idx + 3] * inv + a;
    }
  }
};

export const roughen = (pts: readonly Pt[], spacing: number, amplitude: number, seed: number, closed = true): Pt[] => {
  const out: Pt[] = [];
  const n = pts.length;
  const segs = closed ? n : n - 1;
  let s = 0;
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(l / spacing));
    const nx = -(b[1] - a[1]) / (l || 1);
    const ny = (b[0] - a[0]) / (l || 1);
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const along = s + l * t;
      const off = (noise1(along / (spacing * 3.1), seed) - 0.5) * 2 * amplitude + (noise1(along / (spacing * 0.9), seed + 9) - 0.5) * amplitude * 0.6;
      out.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
    }
    s += l;
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
};

export const mottle = (c: Paper, scale: number, amount: number, seed: number) => {
  const d = c.data;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const idx = (y * c.width + x) * 4;
      if (d[idx + 3] <= 0) continue;
      const m = (fbm2(x / scale, y / scale, seed, 3) - 0.5) * 2 + (noise2(x / (scale * 0.18), y / (scale * 0.22), seed + 4) - 0.5) * 0.5;
      const k = 1 + m * amount;
      d[idx] *= k;
      d[idx + 1] *= k;
      d[idx + 2] *= k;
    }
  }
};

export const over = (dst: Paper, src: Paper) => {
  const a = dst.data;
  const b = src.data;
  for (let i = 0; i < a.length; i += 4) {
    const s = b[i + 3];
    if (s <= 0) continue;
    const inv = 1 - s;
    a[i] = a[i] * inv + b[i];
    a[i + 1] = a[i + 1] * inv + b[i + 1];
    a[i + 2] = a[i + 2] * inv + b[i + 2];
    a[i + 3] = a[i + 3] * inv + s;
  }
};

export const toBytes = (c: Paper): Uint8Array => {
  const out = new Uint8Array(c.width * c.height * 4);
  const d = c.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a <= 0) continue;
    const k = 1 / a;
    out[i] = Math.max(0, Math.min(255, Math.round(d[i] * k * 255)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(d[i + 1] * k * 255)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(d[i + 2] * k * 255)));
    out[i + 3] = Math.max(0, Math.min(255, Math.round(a * 255)));
  }
  return out;
};

export const curve = (a: Pt, b: Pt, bend: number, steps = 6): Pt[] => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
  }
  return out;
};
