/**
 * S2 B 版的背景：同一个院子的夕光底图在长焦近景里整体虚焦，画法分四步，只由相机决定。近景只画远景、稻田、树篱三层：
 * 不画檐口（派发说明），也不画院子那层：树篱脚下的暗线和院子压在树篱上的土沿，在长焦近景里成了横过画面底部的毛刺黑线。
 * 树篱根部以下（含那条暗线）用树篱身上的十几行向下拉平补上（extendHedge），虚焦后看不出接缝。
 * 1. 底图按相机画到 1/6 小图，缩到 1/30 再经 1/12 放回来做模糊。
 * 2. 调色：每个像素按亮度（越靠画右上越提亮，因为云缝在那里）落到一条取自令牌的色带上，偏紫的是天（青紫阴影 → 暖橙 → 云缝的淡金），
 *    偏绿黄的是地（青阴影 → 草绿 → 暖棕 → 淡金）；亮度分成六级软边的色阶，加一点斑驳，再混回两成原色，像大笔摆出来的色块而不是模糊的照片。
 * 3. 虚焦光斑（颜色取自 warm.bokeh 和云缝的淡金）：稻田带里是一组较大的光斑，近处树篱里是一组小而亮的碎光，位置都登记在树篱层的参考画面坐标里、
 *    跟着相机动，大小、扁圆和角度各不相同；另有按小图上「比周围亮多少」补的光斑（细小的受光叶子、水面反光才出，天上不出）。
 * 4. 画右上方（云缝下方的那片天）画一团径向的夕光柔光：开头只有下沿探进画面，相机上摇后亮的一角露出来。
 * 待定（设计）：色带的分段、色阶级数、提亮量、光斑的数量和大小、柔光的范围是本版自定的，见汇报的推断清单。
 */
import { layer, project } from "../../engine/camera.ts";
import type { Camera } from "../../engine/camera.ts";
import { fbm2, hash } from "../../engine/random.ts";
import { reference } from "../../scene.ts";
import { drawPlate } from "../../stage.ts";
import type { PlateImages } from "../../stage.ts";
import { dusk, warm } from "../../tokens.ts";

const frameSize = { width: 1920, height: 1080 };
const low = { width: 320, height: 180 };
const middle = { width: 160, height: 90 };
const tiny = { width: 64, height: 36 };
const discDistance = 11;
const glowDistance = 3000;
const discSeeds = 360;
const keep = 0.2;
const lift = 0.26;
const steps = 6;
const mottle = 0.06;
const mottleFine = 0.035;
const glowAt: readonly [number, number] = [1480, 460];
const glowRadius = 720;

type Size = { width: number; height: number };
type Buffer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
type Disc = { x: number; y: number; r: number; alpha: number; tone: number; squash: number; spin: number };
type RGB = [number, number, number];
type Patch = {
  count: number;
  seed: number;
  y: readonly [number, number];
  r: readonly [number, number];
  alpha: readonly [number, number];
  tones: readonly number[];
};

const buffer = (size: Size): Buffer => {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用。");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
};

const channels = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const ramp = (stops: readonly (readonly [number, RGB])[]) => {
  const table = new Float32Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const k = i / 255;
    let color = stops[stops.length - 1][1];
    for (let s = 1; s < stops.length; s++) {
      if (k <= stops[s][0]) {
        const t = (k - stops[s - 1][0]) / (stops[s][0] - stops[s - 1][0]);
        color = mixRgb(stops[s - 1][1], stops[s][1], Math.max(0, t));
        break;
      }
    }
    table[i * 3] = color[0];
    table[i * 3 + 1] = color[1];
    table[i * 3 + 2] = color[2];
  }
  return table;
};

const ground = ramp([
  [0.24, mixRgb(channels(dusk.shadowTeal), channels(warm.bokeh[2]), 0.45)],
  [0.46, channels(warm.bokeh[2])],
  [0.64, channels(warm.bokeh[1])],
  [0.8, channels(warm.bokeh[0])],
  [0.92, channels(dusk.cloudGap[1])],
]);
const sky = ramp([
  [0.3, mixRgb(channels(dusk.cloud.shadow), channels(warm.backSide), 0.5)],
  [0.5, mixRgb(channels(dusk.cloud.shadow), channels(dusk.cloud.warm), 0.45)],
  [0.68, mixRgb(channels(dusk.cloud.warm), channels(dusk.cloud.edge), 0.6)],
  [0.84, mixRgb(channels(dusk.cloud.edge), channels(dusk.cloudGap[0]), 0.5)],
  [1, channels(dusk.cloudGap[0])],
]);

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const colorize = (b: Buffer) => {
  const image = b.ctx.getImageData(0, 0, b.canvas.width, b.canvas.height);
  const d = image.data;
  const w = b.canvas.width;
  const h = b.canvas.height;
  for (let y = 0; y < h; y++) {
    const high = 1 - y / (h - 1);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      const raw = Math.max(0, Math.min(1, l + lift * high * (0.35 + (0.65 * x) / (w - 1))));
      const q = raw * steps;
      const k = Math.round(255 * Math.min(1, (Math.floor(q) + smoothstep(0.36, 0.64, q - Math.floor(q))) / steps));
      const violet = Math.max(0, Math.min(1, (d[i + 2] - d[i + 1] + 10) / 40));
      const uneven = 1 + mottle * (fbm2(x / 7, y / 7, 1565, 2) - 0.5) * 2 + mottleFine * (fbm2(x / 2.2, y / 2.2, 1566, 2) - 0.5) * 2;
      for (let c = 0; c < 3; c++) {
        const mapped = ground[k * 3 + c] * (1 - violet) + sky[k * 3 + c] * violet;
        d[i + c] = (d[i + c] * keep + mapped * (1 - keep)) * uneven;
      }
    }
  }
  b.ctx.putImageData(image, 0, 0);
};

const luminance = (b: Buffer): { light: Float32Array; violet: Float32Array } => {
  const d = b.ctx.getImageData(0, 0, b.canvas.width, b.canvas.height).data;
  const light = new Float32Array(b.canvas.width * b.canvas.height);
  const violet = new Float32Array(light.length);
  for (let i = 0; i < light.length; i++) {
    light[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    violet[i] = (d[i * 4 + 2] - d[i * 4 + 1]) / 255;
  }
  return { light, violet };
};

const sample = (f: Float32Array, width: number, height: number, x: number, y: number) => {
  const cx = Math.max(0, Math.min(width - 1, x));
  const cy = Math.max(0, Math.min(height - 1, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;
  const top = f[y0 * width + x0] * (1 - fx) + f[y0 * width + x1] * fx;
  const bottom = f[y1 * width + x0] * (1 - fx) + f[y1 * width + x1] * fx;
  return top * (1 - fy) + bottom * fy;
};

const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = channels(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

const sprite = (hex: string) => {
  const b = buffer({ width: 128, height: 128 });
  const g = b.ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(hex, 0.62));
  g.addColorStop(0.74, rgba(hex, 0.6));
  g.addColorStop(0.92, rgba(hex, 0.95));
  g.addColorStop(1, rgba(hex, 0));
  b.ctx.fillStyle = g;
  b.ctx.fillRect(0, 0, 128, 128);
  return b.canvas;
};

const horizon = project(reference, [0, 1e5, 0]).y;
const hedgeTop = project(reference, [0, discDistance, 1.0]).y;
const hedgeBase = project(reference, [0, discDistance, 0]).y;
const extendRows = 12;
const extendAbove = 8;

const extendHedge = (base: Buffer, camera: Camera, ratio: number) => {
  const near = layer(reference, camera, discDistance);
  const cut = Math.round(((hedgeBase - 8) * near.scale + near.dy) / ratio);
  if (cut < extendRows + extendAbove || cut >= low.height) return;
  base.ctx.drawImage(base.canvas, 0, cut - extendRows - extendAbove, low.width, extendRows, 0, cut, low.width, low.height - cut);
};

const patches: readonly Patch[] = [
  { count: 24, seed: 1566, y: [horizon + 45, hedgeTop - 15], r: [14, 40], alpha: [0.2, 0.42], tones: [0, 1, 1, 2] },
  { count: 34, seed: 1567, y: [hedgeBase + 12, hedgeBase + 125], r: [5, 15], alpha: [0.34, 0.7], tones: [0, 1, 1] },
];

const bokeh = (ctx: CanvasRenderingContext2D, camera: Camera, sharp: { light: Float32Array; violet: Float32Array }, soft: Float32Array) => {
  const near = layer(reference, camera, discDistance);
  const far = layer(reference, camera, glowDistance);
  const tones = [sprite(dusk.cloudGap[0]), sprite(warm.bokeh[0]), sprite(warm.bokeh[1]), sprite(warm.bokeh[2])];
  const discs: Disc[] = [];
  const place = (x: number, y: number, r: number, alpha: number, tone: number, seed: number) => {
    const sx = x * near.scale + near.dx;
    const sy = y * near.scale + near.dy;
    const sr = r * near.scale;
    if (sx < -sr || sx > frameSize.width + sr || sy < -sr || sy > frameSize.height + sr) return;
    discs.push({ x: sx, y: sy, r: sr, alpha, tone, squash: 0.86 + 0.14 * hash(seed, 1), spin: hash(seed, 2) * Math.PI });
  };
  for (const patch of patches)
    for (let i = 0; i < patch.count; i++) {
      const pick = Math.floor(hash(patch.seed, i, 5) * patch.tones.length);
      place(
        720 + hash(patch.seed, i, 1) * 1080,
        patch.y[0] + hash(patch.seed, i, 2) * (patch.y[1] - patch.y[0]),
        patch.r[0] + hash(patch.seed, i, 3) * (patch.r[1] - patch.r[0]),
        patch.alpha[0] + hash(patch.seed, i, 4) * (patch.alpha[1] - patch.alpha[0]),
        patch.tones[pick],
        patch.seed + i * 31,
      );
    }
  for (let i = 0; i < discSeeds; i++) {
    const x = (-180 + hash(1561, i, 1) * 2280) * near.scale + near.dx;
    const y = (380 + hash(1561, i, 2) * 630) * near.scale + near.dy;
    if (x < -160 || x > frameSize.width + 160 || y < -160 || y > frameSize.height + 160) continue;
    const r = (9 + 60 * Math.pow(hash(1561, i, 3), 2.2)) * near.scale * (0.8 + 0.4 * hash(1561, i, 4));
    const fine = sample(sharp.light, low.width, low.height, (x * low.width) / frameSize.width, (y * low.height) / frameSize.height);
    const wide = sample(soft, tiny.width, tiny.height, (x * tiny.width) / frameSize.width, (y * tiny.height) / frameSize.height);
    const skyward = sample(sharp.violet, low.width, low.height, (x * low.width) / frameSize.width, (y * low.height) / frameSize.height);
    const alpha = Math.min(0.55, Math.max(0, fine - wide - 0.05) * 3);
    if (alpha < 0.04 || skyward > 0.03) continue;
    discs.push({ x, y, r, alpha, tone: fine > 0.7 ? 0 : fine > 0.56 ? 1 : fine > 0.42 ? 2 : 3, squash: 0.86 + 0.14 * hash(1561, i, 6), spin: hash(1561, i, 7) * Math.PI });
  }
  discs.sort((a, b) => b.r - a.r);
  for (const d of discs) {
    ctx.globalAlpha = d.alpha;
    ctx.setTransform(d.squash, 0, 0, 1, d.x * (1 - d.squash), 0);
    ctx.translate(d.x, d.y);
    ctx.rotate(d.spin);
    ctx.drawImage(tones[d.tone], -d.r, -d.r, d.r * 2, d.r * 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.globalAlpha = 1;
  const gx = glowAt[0] * far.scale + far.dx;
  const gy = glowAt[1] * far.scale + far.dy;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowRadius);
  glow.addColorStop(0, rgba(dusk.cloudGap[0], 0.8));
  glow.addColorStop(0.45, rgba(dusk.cloudGap[1], 0.34));
  glow.addColorStop(1, rgba(dusk.cloudGap[1], 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, frameSize.width, frameSize.height);
};

export const drawBackground = (ctx: CanvasRenderingContext2D, plates: PlateImages, camera: Camera) => {
  const base = buffer(low);
  const small: Camera = { ...camera, width: low.width, height: low.height };
  drawPlate(base.ctx, plates.far, "far", small);
  drawPlate(base.ctx, plates.field, "field", small);
  drawPlate(base.ctx, plates.hedge, "hedge", small);
  extendHedge(base, camera, frameSize.width / low.width);
  const sharp = luminance(base);
  const coarse = buffer(tiny);
  coarse.ctx.drawImage(base.canvas, 0, 0, tiny.width, tiny.height);
  const soft = luminance(coarse).light;
  const smooth = buffer(middle);
  smooth.ctx.drawImage(coarse.canvas, 0, 0, middle.width, middle.height);
  colorize(smooth);
  base.ctx.drawImage(smooth.canvas, 0, 0, low.width, low.height);
  ctx.drawImage(base.canvas, 0, 0, frameSize.width, frameSize.height);
  bokeh(ctx, camera, sharp, soft);
};
