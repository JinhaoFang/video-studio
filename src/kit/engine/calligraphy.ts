/**
 * 通用毛笔水粉书写工具：沿手工设计的笔画骨架采样（向心 Catmull-Rom 样条，转折处按 corner 断开保留折锋），
 * 按藏锋/露锋起笔、横细竖粗提按压感曲线、转折蓄墨顿笔、出锋/回锋收笔、速度驱动丝状飞白与水粉浓淡质感在浮点 Paper 上栅格化。
 * 支持按帧进度逐步揭示（活动笔锋自然收尖，已落墨部分跨帧像素不变），并提供雨滴状落墨点与 WCAG 对比度计算。
 * 不依赖浏览器，Node 与浏览器共用。待定事项：无。
 */
import { mixRgb, paper, type Paper, type Pt, type RGB } from "./paint.ts";
import { fbm2, noise1, noise2 } from "./random.ts";
import { clamp01, ease, progress as frameProgress } from "./timing.ts";

export type BrushNode = {
  x: number;
  y: number;
  pressure: number;
  speed?: number;
  corner?: boolean;
};

export type StrokeEntry = "hidden" | "exposed";
export type StrokeExit = "taper" | "press" | "hook";

export type CalligraphyStroke = {
  id: string;
  nodes: readonly BrushNode[];
  width?: number;
  alpha?: number;
  entry?: StrokeEntry;
  exit?: StrokeExit;
  dry?: number;
  seed: number;
};

export type DropDot = {
  id: string;
  start: Pt;
  nodes: readonly BrushNode[];
  width?: number;
  seed: number;
};

export type BrushStyle = {
  color: RGB;
  baseWidth: number;
  alpha?: number;
  bristles?: number;
  dry?: number;
  rough?: number;
  streak?: number;
  nibAngle?: number;
  oblique?: number;
  wobble?: number;
};

export type StrokeTiming = {
  id: string;
  startFrame: number;
  endFrame: number;
  leave?: number;
  arrive?: number;
};

export type DropTiming = {
  id: string;
  fallStartFrame: number;
  landFrame: number;
  settleFrames?: number;
};

export type SampledPoint = {
  x: number;
  y: number;
  s: number;
  u: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  pressure: number;
  speed: number;
  cornerWeight: number;
};

export type DropState = {
  phase: "waiting" | "falling" | "settling" | "landed";
  fallProgress: number;
  settleProgress: number;
  x: number;
  y: number;
  elongation: number;
};

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const catmullScalar = (
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t0: number,
  t1: number,
  t2: number,
  t3: number,
  t: number,
): number => {
  const a1 = ((t1 - t) / (t1 - t0)) * p0 + ((t - t0) / (t1 - t0)) * p1;
  const a2 = ((t2 - t) / (t2 - t1)) * p1 + ((t - t1) / (t2 - t1)) * p2;
  const a3 = ((t3 - t) / (t3 - t2)) * p2 + ((t - t2) / (t3 - t2)) * p3;
  const b1 = ((t2 - t) / (t2 - t0)) * a1 + ((t - t0) / (t2 - t0)) * a2;
  const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3;
  return ((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2;
};

const sampleSubPath = (
  nodes: readonly BrushNode[],
  stepPx: number,
): { x: number; y: number; pressure: number; speed: number; corner: boolean }[] => {
  const n = nodes.length;
  if (n === 0) return [];
  if (n === 1) {
    return [
      {
        x: nodes[0].x,
        y: nodes[0].y,
        pressure: nodes[0].pressure,
        speed: nodes[0].speed ?? 0.5,
        corner: Boolean(nodes[0].corner),
      },
    ];
  }
  const out: { x: number; y: number; pressure: number; speed: number; corner: boolean }[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const p0: BrushNode =
      i > 0
        ? nodes[i - 1]
        : {
            x: p1.x * 2 - p2.x,
            y: p1.y * 2 - p2.y,
            pressure: p1.pressure,
            speed: p1.speed ?? 0.5,
          };
    const p3: BrushNode =
      i + 2 < n
        ? nodes[i + 2]
        : {
            x: p2.x * 2 - p1.x,
            y: p2.y * 2 - p1.y,
            pressure: p2.pressure,
            speed: p2.speed ?? 0.5,
          };
    const d01 = Math.max(1e-4, Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const d12 = Math.max(1e-4, Math.hypot(p2.x - p1.x, p2.y - p1.y));
    const d23 = Math.max(1e-4, Math.hypot(p3.x - p2.x, p3.y - p2.y));
    const t0 = 0;
    const t1 = t0 + Math.sqrt(d01);
    const t2 = t1 + Math.sqrt(d12);
    const t3 = t2 + Math.sqrt(d23);
    const steps = Math.max(2, Math.ceil(d12 / Math.max(0.5, stepPx)));
    const s1 = p1.speed ?? 0.5;
    const s2 = p2.speed ?? 0.5;
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const f = k / steps;
      const t = t1 + (t2 - t1) * f;
      const x = catmullScalar(p0.x, p1.x, p2.x, p3.x, t0, t1, t2, t3, t);
      const y = catmullScalar(p0.y, p1.y, p2.y, p3.y, t0, t1, t2, t3, t);
      const pressure = p1.pressure + (p2.pressure - p1.pressure) * f;
      const speed = s1 + (s2 - s1) * f;
      const corner = (k === 0 && Boolean(p1.corner)) || (k === steps && Boolean(p2.corner));
      out.push({ x, y, pressure, speed, corner });
    }
  }
  return out;
};

export const sampleStroke = (
  nodes: readonly BrushNode[],
  stepPx = 2,
): SampledPoint[] => {
  if (nodes.length < 2) return [];
  const raw: { x: number; y: number; pressure: number; speed: number; corner: boolean }[] = [];
  let start = 0;
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].corner || i === nodes.length - 1) {
      const seg = sampleSubPath(nodes.slice(start, i + 1), stepPx);
      if (raw.length > 0 && seg.length > 0) seg.shift();
      raw.push(...seg);
      start = i;
    }
  }
  const n = raw.length;
  if (n < 2) return [];
  const arc = new Float64Array(n);
  const cornerArcs: number[] = [];
  for (let i = 1; i < n; i++) {
    arc[i] = arc[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
    if (raw[i].corner && i > 0 && i < n - 1) cornerArcs.push(arc[i]);
  }
  const total = Math.max(1e-6, arc[n - 1]);
  const out: SampledPoint[] = [];
  for (let i = 0; i < n; i++) {
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(n - 1, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    let cornerWeight = 0;
    for (const ca of cornerArcs) {
      const d = Math.abs(arc[i] - ca);
      const w = Math.exp(-(d * d) / Math.max(28, stepPx * stepPx * 32));
      if (w > cornerWeight) cornerWeight = w;
    }
    out.push({
      x: raw[i].x,
      y: raw[i].y,
      s: arc[i],
      u: arc[i] / total,
      tx,
      ty,
      nx: -ty,
      ny: tx,
      pressure: raw[i].pressure,
      speed: raw[i].speed,
      cornerWeight,
    });
  }
  return out;
};

export const pressureProfile = (
  sample: SampledPoint,
  entry: StrokeEntry,
  exit: StrokeExit,
  baseWidth: number,
  nibAngle = Math.PI * 0.5,
  oblique = 0.42,
): number => {
  const u = clamp01(sample.u);
  let entryFactor = 1;
  if (entry === "hidden") {
    const ramp = clamp01(u / 0.055);
    const heel = 0.76 + 0.24 * Math.sqrt(ramp);
    const press = 1 + 0.18 * Math.exp(-Math.pow((u - 0.055) / 0.055, 2));
    const liftWaist = 1 - 0.12 * Math.exp(-Math.pow((u - 0.24) / 0.14, 2));
    entryFactor = heel * press * liftWaist;
  } else {
    entryFactor = 0.08 + 0.92 * Math.pow(clamp01(u / 0.18), 0.9);
  }
  let exitFactor = 1;
  if (exit === "taper") {
    const remain = clamp01((1 - u) / 0.32);
    exitFactor = Math.pow(remain, 1.32);
  } else if (exit === "hook") {
    const prePress = 1 + 0.14 * Math.exp(-Math.pow((u - 0.84) / 0.045, 2));
    const flick = Math.pow(clamp01((1 - u) / 0.17), 1.18);
    exitFactor = prePress * flick;
  } else {
    const preLift = 1 - 0.08 * Math.exp(-Math.pow((u - 0.78) / 0.09, 2));
    const swell = 1 + 0.16 * Math.exp(-Math.pow((u - 0.915) / 0.055, 2));
    const close = 0.68 + 0.32 * Math.sqrt(clamp01((1 - u) / 0.045));
    exitFactor = preLift * swell * close;
  }
  const dirAngle = Math.atan2(sample.ty, sample.tx);
  const obliqueFactor = 1 - oblique * 0.5 * (1 - Math.cos(2 * (dirAngle - nibAngle)));
  const cornerPress = 1 + 0.2 * sample.cornerWeight;
  const floor = exit === "taper" || exit === "hook" || entry === "exposed" ? 0.12 : 0.3;
  return Math.max(
    floor,
    baseWidth * 0.5 * sample.pressure * entryFactor * exitFactor * obliqueFactor * cornerPress,
  );
};

export const strokeProgressAt = (
  frame: number,
  timing: StrokeTiming,
): number => {
  if (frame < timing.startFrame) return 0;
  if (frame >= timing.endFrame) return 1;
  return ease(
    frameProgress(frame, timing.startFrame, timing.endFrame),
    timing.leave ?? 1.15,
    timing.arrive ?? 1.35,
  );
};

export const dropStateAt = (
  frame: number,
  drop: DropDot,
  timing: DropTiming,
): DropState => {
  const land = drop.nodes[0];
  const settle = timing.settleFrames ?? 3;
  if (frame < timing.fallStartFrame) {
    return {
      phase: "waiting",
      fallProgress: 0,
      settleProgress: 0,
      x: drop.start[0],
      y: drop.start[1],
      elongation: 1,
    };
  }
  if (frame < timing.landFrame) {
    const raw = frameProgress(frame, timing.fallStartFrame, timing.landFrame);
    const fall = raw * raw;
    return {
      phase: "falling",
      fallProgress: fall,
      settleProgress: 0,
      x: drop.start[0] + (land.x - drop.start[0]) * fall,
      y: drop.start[1] + (land.y - drop.start[1]) * fall,
      elongation: 1.25 + raw * 0.95,
    };
  }
  const since = frame - timing.landFrame;
  if (since < settle) {
    return {
      phase: "settling",
      fallProgress: 1,
      settleProgress: clamp01((since + 1) / (settle + 1)),
      x: land.x,
      y: land.y,
      elongation: 1,
    };
  }
  return {
    phase: "landed",
    fallProgress: 1,
    settleProgress: 1,
    x: land.x,
    y: land.y,
    elongation: 1,
  };
};

type Chunk = {
  from: number;
  to: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

const blendPixel = (
  d: Float32Array,
  idx: number,
  r: number,
  g: number,
  b: number,
  a: number,
) => {
  const inv = 1 - a;
  d[idx] = d[idx] * inv + r * a;
  d[idx + 1] = d[idx + 1] * inv + g * a;
  d[idx + 2] = d[idx + 2] * inv + b * a;
  d[idx + 3] = d[idx + 3] * inv + a;
};

const paintPressKnot = (
  c: Paper,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number,
  color: RGB,
  alpha: number,
  rough: number,
  seed: number,
) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const reach = Math.max(rx, ry) * (1 + rough * 0.3) + 2;
  const x0 = Math.max(0, Math.floor(cx - reach));
  const y0 = Math.max(0, Math.floor(cy - reach));
  const x1 = Math.min(c.width - 1, Math.ceil(cx + reach));
  const y1 = Math.min(c.height - 1, Math.ceil(cy + reach));
  const d = c.data;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const ax = Math.abs(lx / Math.max(0.5, rx));
      const ay = Math.abs(ly / Math.max(0.5, ry));
      const q = Math.pow(Math.pow(ax, 2.35) + Math.pow(ay, 2.35), 1 / 2.35);
      if (q > 1.38) continue;
      const edge = 1 + rough * 0.26 * (noise2(x * 0.18, y * 0.18, seed) - 0.5) * 2;
      const aEdge = clamp01((edge - q) * Math.min(rx, ry) * 0.95 + 0.5);
      if (aEdge <= 0.002) continue;
      const mottle = 0.86 + 0.14 * fbm2(x * 0.12, y * 0.12, seed + 17, 2);
      const a = alpha * aEdge * mottle;
      if (a <= 0.002) continue;
      const poolTone = 0.88 + 0.12 * noise2(x * 0.22, y * 0.22, seed + 29);
      blendPixel(
        d,
        (y * c.width + x) * 4,
        color[0] * poolTone,
        color[1] * poolTone,
        color[2] * poolTone,
        a,
      );
    }
  }
};

export const paintCalligraphyStroke = (
  c: Paper,
  strokeDef: CalligraphyStroke,
  style: BrushStyle,
  reveal = 1,
) => {
  const p = clamp01(reveal);
  if (p <= 0.001) return;
  const pts = sampleStroke(strokeDef.nodes, 1.5);
  const n = pts.length;
  if (n < 2) return;
  const baseWidth = strokeDef.width ?? style.baseWidth;
  const entry = strokeDef.entry ?? "hidden";
  const exit = strokeDef.exit ?? "press";
  const alpha = strokeDef.alpha ?? style.alpha ?? 1;
  const bristles = style.bristles ?? Math.max(10, Math.min(18, Math.round(baseWidth * 0.95)));
  const dry = strokeDef.dry ?? style.dry ?? 0.38;
  const rough = style.rough ?? 0.52;
  const streak = style.streak ?? 0.14;
  const nibAngle = style.nibAngle ?? Math.PI * 0.5;
  const oblique = style.oblique ?? 0.42;
  const wobble = style.wobble ?? 0.08;
  const seed = strokeDef.seed;
  const total = pts[n - 1].s;
  const maxArc = p * total;
  const pressAngle = Math.PI * 0.24;

  let activeSegments = 0;
  for (let i = 0; i < n - 1; i++) {
    if (pts[i].s <= maxArc) activeSegments = i + 1;
    else break;
  }
  if (activeSegments === 0) return;

  const hws = new Float64Array(n);
  let maxHw = 0;
  for (let i = 0; i < n; i++) {
    const hw = pressureProfile(pts[i], entry, exit, baseWidth, nibAngle, oblique);
    hws[i] = hw;
    if (hw > maxHw) maxHw = hw;
  }

  if (entry === "hidden") {
    const head = pts[0];
    const headHw = Math.max(hws[0], hws[Math.min(n - 1, 2)]);
    const tuck = headHw * 0.22;
    const hx = head.x - Math.cos(pressAngle) * tuck * 0.55 - head.tx * tuck * 0.45;
    const hy = head.y - Math.sin(pressAngle) * tuck * 0.55 - head.ty * tuck * 0.45;
    paintPressKnot(
      c,
      hx,
      hy,
      headHw * 0.74,
      headHw * 0.44,
      pressAngle,
      style.color,
      alpha * Math.min(1, p / 0.06),
      rough * 0.75,
      seed + 31,
    );
  }

  for (let i = 1; i < n - 1; i++) {
    if (pts[i].cornerWeight > 0.96 && pts[i].s <= maxArc) {
      const prev = pts[Math.max(0, i - 2)];
      const curr = pts[i];
      const ch = hws[i];
      const arrival = clamp01((maxArc - curr.s) / Math.max(2, ch * 1.4) + 0.5);
      const sx = curr.x + prev.tx * ch * 0.16 - prev.ty * ch * 0.06;
      const sy = curr.y + prev.ty * ch * 0.16 + prev.tx * ch * 0.06;
      paintPressKnot(
        c,
        sx,
        sy,
        ch * 0.68,
        ch * 0.46,
        pressAngle,
        style.color,
        alpha * arrival,
        rough * 0.7,
        seed + 43 + i,
      );
    }
  }

  if (exit === "press" && p > 0.92 && total > baseWidth * 2.1) {
    const tail = pts[n - 1];
    const tailHw = Math.max(hws[n - 1], hws[Math.max(0, n - 4)]);
    const arrival = clamp01((p - 0.92) / 0.08);
    const ex = tail.x + Math.cos(pressAngle) * tailHw * 0.1;
    const ey = tail.y + Math.sin(pressAngle) * tailHw * 0.12;
    paintPressKnot(
      c,
      ex,
      ey,
      tailHw * 0.66,
      tailHw * 0.4,
      pressAngle,
      style.color,
      alpha * arrival,
      rough * 0.72,
      seed + 67,
    );
  }

  const reach = maxHw * (1 + wobble + rough * 0.32) + 3.5;
  const reach2 = reach * reach;
  const ax = new Float64Array(activeSegments);
  const ay = new Float64Array(activeSegments);
  const dx = new Float64Array(activeSegments);
  const dy = new Float64Array(activeSegments);
  const len = new Float64Array(activeSegments);
  const len2 = new Float64Array(activeSegments);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < activeSegments; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ax[i] = a.x;
    ay[i] = a.y;
    const segFull = Math.max(1e-6, b.s - a.s);
    const clip = b.s > maxArc ? clamp01((maxArc - a.s) / segFull) : 1;
    dx[i] = (b.x - a.x) * clip;
    dy[i] = (b.y - a.y) * clip;
    len2[i] = Math.max(1e-9, dx[i] * dx[i] + dy[i] * dy[i]);
    len[i] = Math.sqrt(len2[i]);
    const ex = a.x + dx[i];
    const ey = a.y + dy[i];
    minX = Math.min(minX, a.x, ex);
    minY = Math.min(minY, a.y, ey);
    maxX = Math.max(maxX, a.x, ex);
    maxY = Math.max(maxY, a.y, ey);
  }

  const chunkSize = 8;
  const chunks: Chunk[] = [];
  for (let from = 0; from < activeSegments; from += chunkSize) {
    const to = Math.min(activeSegments, from + chunkSize);
    let cx0 = Infinity;
    let cy0 = Infinity;
    let cx1 = -Infinity;
    let cy1 = -Infinity;
    for (let i = from; i < to; i++) {
      const ex = ax[i] + dx[i];
      const ey = ay[i] + dy[i];
      cx0 = Math.min(cx0, ax[i], ex);
      cy0 = Math.min(cy0, ay[i], ey);
      cx1 = Math.max(cx1, ax[i], ex);
      cy1 = Math.max(cy1, ay[i], ey);
    }
    chunks.push({
      from,
      to,
      x0: cx0 - reach,
      y0: cy0 - reach,
      x1: cx1 + reach,
      y1: cy1 + reach,
    });
  }

  const x0 = Math.max(0, Math.floor(minX - reach));
  const y0 = Math.max(0, Math.floor(minY - reach));
  const x1 = Math.min(c.width - 1, Math.ceil(maxX + reach));
  const y1 = Math.min(c.height - 1, Math.ceil(maxY + reach));
  const [cr, cg, cb] = style.color;
  const d = c.data;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let best = Infinity;
      let bestSeg = -1;
      let bestT = 0;
      let bestSide = 1;
      for (let ci = 0; ci < chunks.length; ci++) {
        const ch = chunks[ci];
        if (x < ch.x0 || x > ch.x1 || y < ch.y0 || y > ch.y1) continue;
        for (let i = ch.from; i < ch.to; i++) {
          let t = ((x - ax[i]) * dx[i] + (y - ay[i]) * dy[i]) / len2[i];
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = ax[i] + dx[i] * t - x;
          const py = ay[i] + dy[i] * t - y;
          const dd = px * px + py * py;
          if (dd < best) {
            best = dd;
            bestSeg = i;
            bestT = t;
            bestSide = dx[i] * (y - ay[i]) - dy[i] * (x - ax[i]) >= 0 ? 1 : -1;
          }
        }
      }
      if (bestSeg < 0 || best > reach2) continue;

      const aNode = pts[bestSeg];
      const bNode = pts[bestSeg + 1];
      const segArc = aNode.s + bestT * len[bestSeg];
      const segFrac = clamp01((segArc - aNode.s) / Math.max(1e-6, bNode.s - aNode.s));
      const u = total > 0 ? segArc / total : 0;
      const baseHw = hws[bestSeg] + (hws[bestSeg + 1] - hws[bestSeg]) * segFrac;
      const speed = aNode.speed + (bNode.speed - aNode.speed) * segFrac;
      const cornerW = aNode.cornerWeight + (bNode.cornerWeight - aNode.cornerWeight) * segFrac;
      const hw = Math.max(
        0.12,
        baseHw * (1 + wobble * (noise1(segArc / Math.max(3.5, baseWidth * 1.25) + seed * 0.37, seed) - 0.5) * 2),
      );
      const distance = Math.sqrt(best);
      let q = distance / hw;
      if (p < 0.999) {
        const remain = maxArc - segArc;
        const tipSpan = Math.max(2, hw * 1.15);
        if (remain < tipSpan) {
          const tipScale = Math.max(0.18, Math.pow(clamp01(remain / tipSpan), 0.65));
          q = distance / (hw * tipScale);
        }
      }

      const edgeNoise =
        1 + rough * 0.28 * (noise2(segArc * 0.16, bestSide * 3.1 + seed, seed + 1) - 0.5) * 2;
      const aEdge = clamp01((edgeNoise - q) * Math.max(0.9, hw * 1.05) + 0.5);
      if (aEdge <= 0.002) continue;

      const signedAcross = bestSide * Math.min(1, q);
      const across = (signedAcross + 1) * 0.5;
      const drift = (noise1(segArc * 0.006 + seed * 0.13, seed + 9) - 0.5) * 0.14;
      const localBristles = Math.min(bristles, Math.max(4.5, hw * 0.88));
      const track = (across + drift) * localBristles;
      const comb = 0.5 + 0.5 * Math.sin(track * Math.PI * 2 + seed * 1.73);
      const bristleMain = noise1(track * 1.05 + seed * 0.71, seed + 2) * 0.72 + comb * 0.28;
      const bristleLong = noise2(segArc * 0.0038, track * 0.8, seed + 3);
      const rx = x * 0.866 - y * 0.5;
      const ry = x * 0.5 + y * 0.866;
      const bristleTooth = fbm2(rx * 0.16, ry * 0.16, seed + 23, 2);

      const entryPool = entry === "hidden" ? Math.exp(-Math.pow(u / 0.12, 2)) : 0;
      const exitPool =
        exit === "press"
          ? Math.exp(-Math.pow((1 - u) / 0.11, 2))
          : exit === "hook"
            ? Math.exp(-Math.pow((u - 0.84) / 0.06, 2))
            : 0;
      const inkPool = clamp01(Math.max(entryPool, exitPool, cornerW));

      const dryCurve = Math.pow(clamp01((u - 0.12) / 0.88), 0.6);
      const speedDrive = 0.16 + 1.08 * speed * speed;
      const poolWet = 1 - 0.94 * inkPool;
      const tipCohere =
        exit === "hook"
          ? 1 - 0.96 * clamp01((u - 0.74) / 0.12)
          : exit === "taper"
            ? 1 - 0.88 * clamp01((u - 0.72) / 0.18)
            : 1;
      const dryStrength = Math.min(
        0.66,
        dry * speedDrive * (0.28 + 0.72 * dryCurve) * poolWet * tipCohere,
      );

      const edgeDryBias = 0.14 * signedAcross * signedAcross;
      const hairField =
        bristleMain * 0.64 + bristleLong * 0.32 + bristleTooth * 0.04 - edgeDryBias;
      const threshold = 0.08 + dryStrength * 0.52;
      const cover =
        dryStrength <= 0.04
          ? 1
          : clamp01((hairField - threshold + 0.12) / 0.11);
      if (cover <= 0.002) continue;

      const broadMottle = (fbm2(rx * 0.065, ry * 0.065, seed + 11, 2) - 0.5) * 2;
      const fineGrain = (bristleTooth - 0.5) * 2;
      const gouacheBody = clamp01(
        0.87 + 0.13 * inkPool + broadMottle * 0.09 + fineGrain * 0.06 - dryStrength * 0.08,
      );
      const edgeFeather = 1 - 0.14 * Math.pow(clamp01(q), 2.2) * (1 - inkPool * 0.7);
      const a = alpha * aEdge * cover * gouacheBody * edgeFeather;
      if (a <= 0.002) continue;

      const poolDarken = 1 - 0.14 * inkPool;
      const toneShift =
        poolDarken *
        (1 +
          (bristleMain - 0.5) * streak * 2 +
          broadMottle * 0.08 +
          dryStrength * 0.08);
      blendPixel(
        d,
        (y * c.width + x) * 4,
        cr * toneShift,
        cg * toneShift,
        cb * toneShift,
        a,
      );
    }
  }
};

const paintTeardrop = (
  c: Paper,
  cx: number,
  cy: number,
  radius: number,
  elongation: number,
  color: RGB,
  alpha: number,
  seed: number,
) => {
  const rx = radius * 0.82;
  const ry = radius * elongation;
  const x0 = Math.max(0, Math.floor(cx - rx * 1.5 - 2));
  const y0 = Math.max(0, Math.floor(cy - ry * 1.6 - 2));
  const x1 = Math.min(c.width - 1, Math.ceil(cx + rx * 1.5 + 2));
  const y1 = Math.min(c.height - 1, Math.ceil(cy + ry * 1.3 + 2));
  const d = c.data;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ny = (y - cy) / Math.max(1, ry);
      if (ny < -1.35 || ny > 1.05) continue;
      const taper = ny < 0 ? Math.max(0.18, 1 + ny * 0.68) : 1;
      const nx = (x - cx) / Math.max(0.8, rx * taper);
      const q = Math.hypot(nx, ny * (ny < 0 ? 0.78 : 1.05));
      if (q > 1.25) continue;
      const edge = 1 + 0.1 * (noise2(x * 0.2, y * 0.2, seed) - 0.5) * 2;
      const aEdge = clamp01((edge - q) * radius * 0.9 + 0.5);
      if (aEdge <= 0.002) continue;
      const grain = 0.9 + 0.1 * noise2(x * 0.24, y * 0.24, seed + 13);
      blendPixel(d, (y * c.width + x) * 4, color[0] * grain, color[1] * grain, color[2] * grain, alpha * aEdge);
    }
  }
};

export const paintDropDot = (
  c: Paper,
  drop: DropDot,
  style: BrushStyle,
  frame: number,
  timing: DropTiming,
) => {
  const state = dropStateAt(frame, drop, timing);
  if (state.phase === "waiting") return;
  const width = drop.width ?? style.baseWidth * 0.92;
  const alpha = style.alpha ?? 1;
  if (state.phase === "falling") {
    const r = width * (0.36 + 0.16 * state.fallProgress);
    paintTeardrop(
      c,
      state.x,
      state.y,
      r,
      state.elongation,
      style.color,
      alpha * (0.78 + 0.22 * state.fallProgress),
      drop.seed,
    );
    return;
  }
  const reveal = state.phase === "landed" ? 1 : 0.42 + 0.58 * ease(state.settleProgress, 0.8, 1.4);
  paintCalligraphyStroke(
    c,
    {
      id: drop.id,
      nodes: drop.nodes,
      width,
      entry: "exposed",
      exit: "press",
      dry: 0.1,
      seed: drop.seed,
    },
    { ...style, oblique: 0.2, rough: (style.rough ?? 0.5) * 0.55, wobble: (style.wobble ?? 0.08) * 0.5 },
    reveal,
  );
};

export const renderCalligraphyPaper = (
  width: number,
  height: number,
  strokes: readonly CalligraphyStroke[],
  drops: readonly DropDot[],
  style: BrushStyle,
  frame: number,
  strokeTimings: readonly StrokeTiming[],
  dropTimings: readonly DropTiming[],
): Paper => {
  const out = paper(width, height);
  const strokeMap = new Map(strokeTimings.map((t) => [t.id, t]));
  for (const s of strokes) {
    const t = strokeMap.get(s.id);
    const p = t ? strokeProgressAt(frame, t) : 1;
    if (p > 0) paintCalligraphyStroke(out, s, style, p);
  }
  const dropMap = new Map(dropTimings.map((t) => [t.id, t]));
  for (const d of drops) {
    const t = dropMap.get(d.id);
    if (t) paintDropDot(out, d, style, frame, t);
    else {
      paintCalligraphyStroke(
        out,
        {
          id: d.id,
          nodes: d.nodes,
          width: d.width ?? style.baseWidth * 0.92,
          entry: "exposed",
          exit: "press",
          dry: 0.12,
          seed: d.seed,
        },
        { ...style, oblique: 0.2 },
        1,
      );
    }
  }
  return out;
};

const srgbChannel = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

export const relativeLuminance = (color: RGB): number =>
  0.2126 * srgbChannel(color[0]) +
  0.7152 * srgbChannel(color[1]) +
  0.0722 * srgbChannel(color[2]);

export const contrastRatio = (a: RGB, b: RGB): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

export const mixColor = mixRgb;
export const pointDistance = dist;
