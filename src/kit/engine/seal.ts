/**
 * 通用篆刻印章工具：在 2 倍超采样浮点 Paper 上刻制白文（阴文）或朱文（阳文）印章。
 * 支持手工设计的归一化小篆印文路径、自然敲边残破（chips）、印泥着色不匀（多尺度斑驳与微孔透气）与刀味边缘。
 * stampStateAt 提供盖印落定帧与按压过渡，确保画面事件与印章落印用同一份时间数据。不依赖浏览器。待定事项：无。
 */
import { paper, polygon, roughen, type Paper, type Pt, type RGB } from "./paint.ts";
import { fbm2, noise1, noise2 } from "./random.ts";
import { clamp01, ease } from "./timing.ts";

export type SealMode = "intaglio" | "relief";

export type SealStroke = {
  points: readonly Pt[];
  width?: number;
};

export type SealChip = {
  side: "top" | "right" | "bottom" | "left";
  at: number;
  width: number;
  depth: number;
};

export type SealSpec = {
  mode: SealMode;
  strokes: readonly SealStroke[];
  chips?: readonly SealChip[];
  margin?: number;
  strokeWidth?: number;
  borderWidth?: number;
  cornerRadius?: number;
  seed: number;
};

export type SealRenderOptions = {
  size: number;
  pasteColor: RGB;
  carveColor: RGB;
  mottleScale?: number;
  mottleAmount?: number;
  drySpots?: number;
  edgeRoughness?: number;
  carveRoughness?: number;
};

export type StampState = {
  visible: boolean;
  scale: number;
  alpha: number;
  settle: number;
};

export const stampStateAt = (
  frame: number,
  stampFrame: number,
  settleFrames = 2,
): StampState => {
  if (frame < stampFrame) {
    return { visible: false, scale: 1.06, alpha: 0, settle: 0 };
  }
  const since = frame - stampFrame;
  const settle = settleFrames <= 0 ? 1 : clamp01(since / settleFrames);
  const eased = ease(settle, 0.7, 1.4);
  return {
    visible: true,
    scale: 1 + (1 - eased) * 0.035,
    alpha: 0.88 + 0.12 * eased,
    settle: eased,
  };
};

const chipIndent = (
  side: SealChip["side"],
  t: number,
  chips: readonly SealChip[],
  size: number,
  seed: number,
): number => {
  let indent = 0;
  for (let i = 0; i < chips.length; i++) {
    const ch = chips[i];
    if (ch.side !== side) continue;
    const d = Math.abs(t - ch.at) / Math.max(1e-4, ch.width * 0.5);
    if (d >= 1) continue;
    const jagged = 0.72 + 0.56 * noise1(t * 48 + i * 11, seed + 91);
    const profile = Math.pow(1 - d * d, 0.52) * jagged;
    indent = Math.max(indent, ch.depth * size * profile);
  }
  return indent;
};

export const sealOutline = (
  size: number,
  inset: number,
  chips: readonly SealChip[],
  roughness: number,
  seed: number,
  cornerRadius = 0.04,
): Pt[] => {
  const x0 = inset;
  const y0 = inset;
  const x1 = size - inset;
  const y1 = size - inset;
  const span = x1 - x0;
  const r = Math.min(span * 0.12, cornerRadius * size);
  const steps = Math.max(36, Math.round(span / 2.2));
  const raw: Pt[] = [];
  const pushEdge = (side: SealChip["side"], ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      const indent = chipIndent(side, t, chips, size, seed);
      const jitter = (noise1(t * 28 + seed * 0.31, seed + side.length * 13) - 0.5) * 2 * roughness;
      raw.push([px + nx * (indent + jitter), py + ny * (indent + jitter)]);
    }
  };
  const pushCorner = (cx: number, cy: number, a0: number, a1: number) => {
    const segs = 4;
    for (let i = 0; i < segs; i++) {
      const a = a0 + ((a1 - a0) * i) / segs;
      raw.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  pushEdge("top", x0 + r, y0, x1 - r, y0, 0, 1);
  pushCorner(x1 - r, y0 + r, -Math.PI / 2, 0);
  pushEdge("right", x1, y0 + r, x1, y1 - r, -1, 0);
  pushCorner(x1 - r, y1 - r, 0, Math.PI / 2);
  pushEdge("bottom", x1 - r, y1, x0 + r, y1, 0, -1);
  pushCorner(x0 + r, y1 - r, Math.PI / 2, Math.PI);
  pushEdge("left", x0, y1 - r, x0, y0 + r, 1, 0);
  pushCorner(x0 + r, y0 + r, Math.PI, Math.PI * 1.5);
  return roughen(raw, Math.max(2.5, size / 48), roughness * 0.45, seed + 19, true);
};

export const mapSealStroke = (
  points: readonly Pt[],
  size: number,
  margin: number,
): Pt[] => {
  const pad = margin * size;
  const inner = size - pad * 2;
  return points.map(([nx, ny]) => [pad + nx * inner, pad + ny * inner]);
};

const paintChiselStroke = (
  c: Paper,
  pts: readonly Pt[],
  width: number,
  color: RGB,
  rough: number,
  seed: number,
) => {
  const n = pts.length;
  if (n < 2) return;
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
    minX = Math.min(minX, pts[i][0], pts[i + 1][0]);
    minY = Math.min(minY, pts[i][1], pts[i + 1][1]);
    maxX = Math.max(maxX, pts[i][0], pts[i + 1][0]);
    maxY = Math.max(maxY, pts[i][1], pts[i + 1][1]);
  }
  const reach = width * 0.8 + 2.5;
  const reach2 = reach * reach;
  const x0 = Math.max(0, Math.floor(minX - reach));
  const y0 = Math.max(0, Math.floor(minY - reach));
  const x1 = Math.min(c.width - 1, Math.ceil(maxX + reach));
  const y1 = Math.min(c.height - 1, Math.ceil(maxY + reach));
  const d = c.data;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let best = Infinity;
      let bu = 0;
      let side = 1;
      for (let i = 0; i < n - 1; i++) {
        const segLen = Math.sqrt(len2[i]);
        const ux = dx[i] / segLen;
        const uy = dy[i] / segLen;
        const rx = x - ax[i];
        const ry = y - ay[i];
        const proj = rx * ux + ry * uy;
        const clamped = proj < 0 ? 0 : proj > segLen ? segLen : proj;
        const alongExcess = Math.abs(proj - clamped);
        const perp = Math.abs(rx * -uy + ry * ux);
        const euclid = Math.hypot(alongExcess, perp);
        const chisel =
          alongExcess > 0
            ? Math.max(alongExcess * 1.15, perp) * 0.65 + euclid * 0.35
            : perp;
        const dd = chisel * chisel;
        if (dd < best) {
          best = dd;
          bu = start[i] + clamped;
          side = dx[i] * ry - dy[i] * rx >= 0 ? 1 : -1;
        }
      }
      if (best > reach2) continue;
      const u = total > 0 ? bu / total : 0;
      const endFlare = 1 + 0.06 * Math.exp(-Math.pow(Math.min(u, 1 - u) / 0.08, 2));
      const chiselWobble = 1 + 0.09 * (noise1(bu * 0.16 + seed * 0.41, seed) - 0.5) * 2;
      const hw = Math.max(0.6, width * 0.5 * endFlare * chiselWobble);
      const q = Math.sqrt(best) / hw;
      const edge = 1 + rough * 0.18 * (noise2(bu * 0.25, side * 2.3 + seed, seed + 7) - 0.5) * 2;
      const a = clamp01((edge - q) * hw * 1.25 + 0.5);
      if (a <= 0.002) continue;
      const idx = (y * c.width + x) * 4;
      if (d[idx + 3] <= 0.05) continue;
      const tone = 0.96 + 0.04 * noise2(x * 0.22, y * 0.22, seed + 19);
      const inv = 1 - a;
      d[idx] = d[idx] * inv + color[0] * tone * a * d[idx + 3];
      d[idx + 1] = d[idx + 1] * inv + color[1] * tone * a * d[idx + 3];
      d[idx + 2] = d[idx + 2] * inv + color[2] * tone * a * d[idx + 3];
    }
  }
};

const applyPasteTexture = (
  c: Paper,
  scale: number,
  amount: number,
  drySpots: number,
  seed: number,
) => {
  const d = c.data;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const idx = (y * c.width + x) * 4;
      const a = d[idx + 3];
      if (a <= 0.002) continue;
      const rx1 = x * 0.866 - y * 0.5;
      const ry1 = x * 0.5 + y * 0.866;
      const rx2 = x * 0.643 + y * 0.766;
      const ry2 = -x * 0.766 + y * 0.643;
      const broad = (fbm2(rx1 / scale, ry1 / scale, seed + 41, 3) - 0.5) * 2;
      const tooth = (fbm2(rx2 / (scale * 0.24), ry2 / (scale * 0.24), seed + 59, 2) - 0.5) * 2;
      const poreScale = Math.max(1.8, scale * 0.11);
      const pinhole = fbm2(rx2 / poreScale, ry2 / poreScale, seed + 73, 2);
      const pore =
        pinhole < drySpots * 0.36
          ? clamp01((pinhole - drySpots * 0.1) / Math.max(0.05, drySpots * 0.26))
          : 1;
      const density = clamp01(1 + broad * amount * 0.56 + tooth * amount * 0.32) * (0.28 + 0.72 * pore);
      const shade = 1 + broad * amount * 0.22 + tooth * amount * 0.1;
      const nextA = a * clamp01(0.62 + 0.38 * density);
      const factor = (nextA / a) * shade;
      d[idx] *= factor;
      d[idx + 1] *= factor;
      d[idx + 2] *= factor;
      d[idx + 3] = nextA;
    }
  }
};

const downsample2x = (src: Paper): Paper => {
  const w = Math.floor(src.width / 2);
  const h = Math.floor(src.height / 2);
  const dst = paper(w, h);
  const s = src.data;
  const d = dst.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i00 = ((y * 2) * src.width + x * 2) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + src.width * 4;
      const i11 = i01 + 4;
      const o = (y * w + x) * 4;
      d[o] = (s[i00] + s[i10] + s[i01] + s[i11]) * 0.25;
      d[o + 1] = (s[i00 + 1] + s[i10 + 1] + s[i01 + 1] + s[i11 + 1]) * 0.25;
      d[o + 2] = (s[i00 + 2] + s[i10 + 2] + s[i01 + 2] + s[i11 + 2]) * 0.25;
      d[o + 3] = (s[i00 + 3] + s[i10 + 3] + s[i01 + 3] + s[i11 + 3]) * 0.25;
    }
  }
  return dst;
};

export const renderSeal = (spec: SealSpec, options: SealRenderOptions): Paper => {
  const hiSize = Math.max(32, Math.round(options.size) * 2);
  const canvas = paper(hiSize, hiSize);
  const chips = spec.chips ?? [];
  const margin = spec.margin ?? 0.11;
  const edgeRough = (options.edgeRoughness ?? 0.012) * hiSize;
  const carveRough = options.carveRoughness ?? 0.36;
  const strokeBase = (spec.strokeWidth ?? 0.036) * hiSize;
  const outer = sealOutline(
    hiSize,
    hiSize * 0.03,
    chips,
    edgeRough,
    spec.seed,
    spec.cornerRadius ?? 0.035,
  );

  if (spec.mode === "intaglio") {
    polygon(canvas, outer, options.pasteColor, 1);
    applyPasteTexture(
      canvas,
      (options.mottleScale ?? 0.26) * hiSize,
      options.mottleAmount ?? 0.42,
      options.drySpots ?? 0.45,
      spec.seed,
    );
    for (let i = 0; i < spec.strokes.length; i++) {
      const st = spec.strokes[i];
      const mapped = mapSealStroke(st.points, hiSize, margin);
      const w = st.width ? st.width * hiSize : strokeBase;
      paintChiselStroke(canvas, mapped, w, options.carveColor, carveRough, spec.seed + 101 + i * 17);
    }
  } else {
    polygon(canvas, outer, options.pasteColor, 1);
    const border = (spec.borderWidth ?? 0.055) * hiSize;
    const inner = sealOutline(
      hiSize,
      hiSize * 0.03 + border,
      [],
      edgeRough * 0.55,
      spec.seed + 7,
      (spec.cornerRadius ?? 0.035) * 0.6,
    );
    polygon(canvas, inner, options.carveColor, 1);
    for (let i = 0; i < spec.strokes.length; i++) {
      const st = spec.strokes[i];
      const mapped = mapSealStroke(st.points, hiSize, margin);
      const w = st.width ? st.width * hiSize : strokeBase;
      paintChiselStroke(canvas, mapped, w, options.pasteColor, carveRough, spec.seed + 101 + i * 17);
    }
    applyPasteTexture(
      canvas,
      (options.mottleScale ?? 0.26) * hiSize,
      options.mottleAmount ?? 0.38,
      options.drySpots ?? 0.35,
      spec.seed,
    );
  }
  return downsample2x(canvas);
};
