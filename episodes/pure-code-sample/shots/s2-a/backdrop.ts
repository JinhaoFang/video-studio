/**
 * 镜头 S2 的长焦虚焦背景：从烘焙好的四层夕光底图（far、field、hedge、yard，不画檐口）按相机投影到缩小离屏画布，
 * 经分层景深虚化回贴全画幅，保持与 S1 完全一致的空间与色调连贯；在虚化层内柔和融入画右上云缝斜洒的夕光空气光柱
 * （无硬直边），再按 3D 锚点叠画柔和的水粉式暖金/橄榄色虚焦光斑，让画面始终保持 3–5 块清晰大明暗。
 */
import { project } from "../../engine/camera.ts";
import type { Camera, Vec3 } from "../../engine/camera.ts";
import { hash, rng } from "../../engine/random.ts";
import { drawPlate } from "../../stage.ts";
import type { PlateImages } from "../../stage.ts";
import { dusk, rain, warm } from "../../tokens.ts";

type BokehPatch = {
  pos: Vec3;
  radiusM: number;
  color: string;
  alpha: number;
  aspect: number;
  angle: number;
  softEdge: number;
};

const mixRgb = (a: string, b: string, t: number, alpha = 1) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
};

const hexRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
};

const BOKEH_PATCHES: readonly BokehPatch[] = (() => {
  const random = rng(155, 2026, 17);
  const out: BokehPatch[] = [];

  for (let i = 0; i < 20; i++) {
    const rightSide = i < 13;
    const x = rightSide ? random.range(0.95, 5.4) : random.range(-4.4, -0.8);
    const d = random.range(9.6, 13.4);
    const z = random.range(0.2, 1.75);
    const roll = random.next();
    const color =
      roll < 0.42
        ? warm.bokeh[0]
        : roll < 0.74
          ? warm.bokeh[1]
          : warm.bokeh[2];
    out.push({
      pos: [x, d, z],
      radiusM: random.range(0.18, 0.44),
      color,
      alpha: rightSide ? random.range(0.12, 0.22) : random.range(0.08, 0.16),
      aspect: random.range(0.9, 1.18),
      angle: random.range(-0.3, 0.3),
      softEdge: random.range(0.52, 0.72),
    });
  }

  for (let i = 0; i < 14; i++) {
    const x = random.range(4, 34);
    const d = random.range(42, 88);
    const z = random.range(0.4, 3.6);
    const color = random.next() < 0.55 ? dusk.waterGlint : warm.bokeh[0];
    out.push({
      pos: [x, d, z],
      radiusM: random.range(1.2, 2.8),
      color,
      alpha: random.range(0.1, 0.2),
      aspect: random.range(1.05, 1.35),
      angle: random.range(-0.12, 0.12),
      softEdge: random.range(0.45, 0.65),
    });
  }

  for (let i = 0; i < 8; i++) {
    const x = random.range(-3.6, 4.6);
    const d = random.range(10.5, 12.8);
    const z = random.range(0.3, 1.35);
    out.push({
      pos: [x, d, z],
      radiusM: random.range(0.12, 0.22),
      color: dusk.cloudGap[1],
      alpha: random.range(0.14, 0.26),
      aspect: random.range(0.92, 1.08),
      angle: random.range(-0.2, 0.2),
      softEdge: 0.64,
    });
  }

  return out;
})();

const makeSoftLayer = (
  w: number,
  h: number,
  blurPx: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用。");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = `blur(${blurPx}px)`;
  paint(ctx);
  ctx.filter = "none";
  return c;
};

const drawSoftBokeh = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  patch: BokehPatch,
) => {
  if (r < 5 || x + r * 1.5 < 0 || x - r * 1.5 > 1920 || y + r * 1.5 < 0 || y - r * 1.5 > 1080) return;
  const quietDist = Math.hypot((x - 770) / 360, (y - 450) / 290);
  const quietAtten = Math.min(1, Math.max(0.25, (quietDist - 0.55) / 0.85));
  const a = patch.alpha * quietAtten;

  const nx = (x - 960) / 960;
  const ny = (y - 540) / 540;
  const edge = Math.min(1, Math.hypot(nx, ny));
  const catsEye = 1 - 0.14 * edge * edge;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(patch.angle);
  ctx.scale(patch.aspect * catsEye, 1 / Math.sqrt(patch.aspect));

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, hexRgba(patch.color, a));
  grad.addColorStop(patch.softEdge * 0.72, hexRgba(patch.color, a * 0.86));
  grad.addColorStop(patch.softEdge, hexRgba(patch.color, a * 0.45));
  grad.addColorStop(1, hexRgba(patch.color, 0));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const drawFeatheredBeams = (ctx: CanvasRenderingContext2D, W: number, H: number, frame: number) => {
  const breathe = 0.93 + 0.07 * Math.sin(frame * 0.035);
  const beams: readonly [number, number, number, number][] = [
    [W * 0.85, H * 0.12, 460, 0.14],
    [W * 0.67, H * 0.24, 340, 0.09],
    [W * 0.96, H * 0.28, 380, 0.1],
  ];
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < beams.length; i++) {
    const [cx, cy, len, alpha] = beams[i];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.56);
    ctx.scale(0.32, 1.8);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    grad.addColorStop(0, hexRgba(dusk.cloudGap[0], alpha * breathe));
    grad.addColorStop(0.45, hexRgba(warm.rim, alpha * 0.45 * breathe));
    grad.addColorStop(1, hexRgba(warm.bokeh[0], 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, len, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

export const drawTelephotoBackdrop = (
  ctx: CanvasRenderingContext2D,
  plates: PlateImages,
  camera: Camera,
  frame: number,
) => {
  const W = camera.width;
  const H = camera.height;

  const farScale = 1 / 6;
  const farCanvas = makeSoftLayer(Math.round(W * farScale), Math.round(H * farScale), 3.4, (bctx) => {
    bctx.fillStyle = mixRgb(dusk.cloud.shadow, rain.sky[1], 0.35);
    bctx.fillRect(0, 0, W * farScale, H * farScale);
    bctx.save();
    bctx.scale(farScale, farScale);
    drawPlate(bctx, plates.far, "far", camera);
    drawPlate(bctx, plates.field, "field", camera);
    bctx.restore();
  });

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(farCanvas, 0, 0, W, H);
  ctx.restore();

  const sunSky = ctx.createRadialGradient(W * 0.88, H * 0.12, 40, W * 0.82, H * 0.18, W * 0.68);
  sunSky.addColorStop(0, hexRgba(dusk.cloudGap[0], 0.46));
  sunSky.addColorStop(0.26, hexRgba(dusk.cloudGap[1], 0.28));
  sunSky.addColorStop(0.56, hexRgba(warm.bokeh[0], 0.1));
  sunSky.addColorStop(1, hexRgba(dusk.shadowViolet, 0));
  ctx.fillStyle = sunSky;
  ctx.fillRect(0, 0, W, H);

  const coolCorner = ctx.createRadialGradient(W * 0.08, H * 0.1, 20, W * 0.12, H * 0.16, W * 0.55);
  coolCorner.addColorStop(0, hexRgba(dusk.shadowViolet, 0.34));
  coolCorner.addColorStop(0.52, hexRgba(dusk.cloud.shadow, 0.14));
  coolCorner.addColorStop(1, hexRgba(dusk.shadowViolet, 0));
  ctx.fillStyle = coolCorner;
  ctx.fillRect(0, 0, W, H);

  const midScale = 1 / 5;
  const hedgeCanvas = makeSoftLayer(Math.round(W * midScale), Math.round(H * midScale), 3.0, (bctx) => {
    bctx.save();
    bctx.scale(midScale, midScale);
    drawPlate(bctx, plates.hedge, "hedge", camera);
    drawPlate(bctx, plates.yard, "yard", camera);
    bctx.restore();
  });

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(hedgeCanvas, 0, 0, W, H);
  ctx.restore();

  const lowerAnchor = ctx.createLinearGradient(0, H * 0.6, 0, H);
  lowerAnchor.addColorStop(0, hexRgba(dusk.shadowTeal, 0));
  lowerAnchor.addColorStop(0.55, hexRgba(rain.hedge, 0.22));
  lowerAnchor.addColorStop(1, hexRgba(dusk.shadowTeal, 0.38));
  ctx.fillStyle = lowerAnchor;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < BOKEH_PATCHES.length; i++) {
    const patch = BOKEH_PATCHES[i];
    const p = project(camera, patch.pos);
    const shimmer = 0.96 + 0.04 * Math.sin(frame * 0.04 + hash(155, i, 5) * 12);
    const r = patch.radiusM * p.scale * shimmer;
    drawSoftBokeh(ctx, p.x, p.y, r, patch);
  }
  ctx.restore();

  drawFeatheredBeams(ctx, W, H, frame);

  const warmVeil = ctx.createLinearGradient(W * 0.96, H * 0.02, W * 0.25, H * 0.76);
  warmVeil.addColorStop(0, hexRgba(dusk.cloudGap[0], 0.12));
  warmVeil.addColorStop(0.32, hexRgba(warm.rim, 0.055));
  warmVeil.addColorStop(0.68, hexRgba(warm.bokeh[1], 0.015));
  warmVeil.addColorStop(1, hexRgba(warm.bokeh[1], 0));
  ctx.fillStyle = warmVeil;
  ctx.fillRect(0, 0, W, H);
};
