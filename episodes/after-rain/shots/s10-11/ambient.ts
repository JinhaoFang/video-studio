/**
 * 第 10–11 镜（合）里只属于这两个镜头的环境动效（照 motion.md「画面要活，不能假」）：
 * 第 10 镜：夕光里的尘和飞虫（世界坐标里固定的一团，跟着相机的推轨有视差）、檐廊脚下的草被风吹（底图里画了草丛，这里在同样的位置补会动的几簇）、
 * 麻雀在竹竿上的接触影（按光向画在竹竿受背光的一侧，脚下最暗往外变淡，不用椭圆贴片）；
 * 第 11 镜：风吹稻浪成片走过画面（按 layout.md 的风向、波速和波长在世界坐标里排亮带，用底图自己的笔触提亮，不是平涂的色带）、
 * 远处的雾慢慢移、天上的云慢慢飘（每秒不超过画幅的 0.3%）。颜色只从令牌取。
 * 待定事项：TODO(design) 稻浪亮带的强度、雾的浓度是看着定的，motion.md 和 art.md 没有给数值。
 */
import { layer, project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { hash, noise1 } from "../../../../src/kit/engine/random.ts";
import { house, plateSize } from "../../scene.ts";
import type { ViewPlate } from "../../scene.ts";
import { dusk, houseTakeoff, lowYard, paddyWide, warm } from "../../tokens.ts";
import { mixHex } from "../../tokens-sparrow.ts";

export type Offscreen = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
export type OffscreenSlot = { current: Offscreen | null };

const offscreen = (cache: OffscreenSlot, width: number, height: number): Offscreen => {
  if (!cache.current) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("环境动效的离屏画布不可用。");
    cache.current = { canvas, ctx };
  }
  return cache.current;
};

const rgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const cameraAxes = (camera: Camera) => {
  const cp = Math.cos(camera.pitch);
  const forward: Vec3 = [Math.sin(camera.yaw) * cp, Math.cos(camera.yaw) * cp, Math.sin(camera.pitch)];
  const right: Vec3 = [Math.cos(camera.yaw), -Math.sin(camera.yaw), 0];
  const up: Vec3 = [
    -Math.sin(camera.yaw) * Math.sin(camera.pitch),
    -Math.cos(camera.yaw) * Math.sin(camera.pitch),
    Math.cos(camera.pitch),
  ];
  return { forward, right, up };
};

const DUST_COUNT = 9;

export const drawDust = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  anchor: Camera,
  frame: number,
  near: boolean,
) => {
  const { forward, right, up } = cameraAxes(anchor);
  ctx.save();
  ctx.fillStyle = houseTakeoff.roof;
  for (let i = 0; i < DUST_COUNT; i++) {
    const isNear = i % 3 === 0;
    if (isNear !== near) continue;
    const r = (k: number) => hash(1901, i, k);
    const depth = isNear ? 0.5 + 0.8 * r(1) : 1.5 + 2.4 * r(1);
    const age = frame + r(7) * 400;
    const lateral = ((r(2) - 0.45) * depth * 1.1 + (r(4) - 0.5) * 0.05 * (age - 200) + 3) % 3 - 1.5;
    const vertical = (r(3) - 0.5) * depth * 0.7 - 0.004 * (0.4 + r(5)) * age + 0.02 * Math.sin(age * 0.21 + r(6) * 6);
    const world: Vec3 = [
      anchor.position[0] + forward[0] * depth + right[0] * lateral * depth + up[0] * vertical,
      anchor.position[1] + forward[1] * depth + right[1] * lateral * depth + up[1] * vertical,
      anchor.position[2] + forward[2] * depth + right[2] * lateral * depth + up[2] * vertical,
    ];
    const p = project(camera, world);
    if (p.depth <= 0.05 || p.x < -10 || p.x > camera.width + 10 || p.y < -10 || p.y > camera.height + 10) continue;
    const radius = Math.max(0.8, (isNear ? 2.2 : 1.7) / depth);
    ctx.globalAlpha = (0.2 + 0.3 * r(8)) * Math.min(1, 1.6 / depth);
    ctx.fillStyle = warm.dropHighlight;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const taperedBlade = (
  ctx: CanvasRenderingContext2D,
  base: Point,
  height: number,
  lean: number,
  width: number,
) => {
  const tipX = base[0] + lean;
  const tipY = base[1] - height;
  const cx = base[0] + lean * 0.25;
  const cy = base[1] - height * 0.55;
  ctx.beginPath();
  ctx.moveTo(base[0] - width / 2, base[1]);
  ctx.quadraticCurveTo(cx - width * 0.2, cy, tipX, tipY);
  ctx.quadraticCurveTo(cx + width * 0.2, cy, base[0] + width / 2, base[1]);
  ctx.closePath();
  ctx.fill();
};

const GRASS_X = [-4.05, -3.65, -3.3, -3.0, -2.72, -2.5, -2.3] as const;

export const drawVerandaGrass = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  const shade = mixHex(lowYard.hedge, houseTakeoff.veranda, 0.3);
  const lit = mixHex(lowYard.hedge, houseTakeoff.wallLit, 0.5);
  for (let t = 0; t < GRASS_X.length; t++) {
    const base = project(camera, [GRASS_X[t], house.verandaY, 0]);
    if (base.depth <= 0 || base.x < -30 || base.x > camera.width + 30 || base.y > camera.height + 24) continue;
    const scale = base.scale;
    const blades = 4 + Math.floor(hash(1902, t, 1) * 3);
    const period = 48 + 60 * hash(1902, t, 2);
    const phase = hash(1902, t, 3) * Math.PI * 2;
    for (let k = 0; k < blades; k++) {
      const h = (0.05 + 0.09 * hash(1902, t, 10 + k)) * scale;
      const w = Math.max(1.4, 0.012 * scale);
      const gust = 0.5 + 0.5 * Math.sin((Math.PI * 2 * frame) / 92 + phase * 0.3);
      const sway = Math.sin((Math.PI * 2 * frame) / period + phase + k) * h * (0.12 + 0.2 * gust);
      const staticLean = (hash(1902, t, 20 + k) - 0.5) * h * 0.7;
      ctx.fillStyle = k % 2 === 0 ? shade : lit;
      taperedBlade(
        ctx,
        [base.x + (hash(1902, t, 30 + k) - 0.5) * 0.09 * scale, base.y + (hash(1902, t, 40 + k) - 0.5) * 0.02 * scale],
        h,
        staticLean + sway,
        w,
      );
    }
  }
};

export const drawPoleContactShadow = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  perch: { x: number; y: number; scale: number },
  along: Point,
  tightness: number,
) => {
  const reach = (0.5 + 0.45 * (1 - tightness)) * perch.scale * 0.042 * 1.6;
  const halfWidth = Math.max(2.5, perch.scale * 0.021);
  const ux = along[0];
  const uy = along[1];
  const nx = -uy;
  const ny = ux;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(perch.x - ux * reach + nx * halfWidth * 1.1, perch.y - uy * reach + ny * halfWidth * 1.1);
  ctx.lineTo(perch.x + ux * reach + nx * halfWidth * 1.1, perch.y + uy * reach + ny * halfWidth * 1.1);
  ctx.lineTo(perch.x + ux * reach - nx * halfWidth * 0.3, perch.y + uy * reach - ny * halfWidth * 0.3);
  ctx.lineTo(perch.x - ux * reach - nx * halfWidth * 0.3, perch.y - uy * reach - ny * halfWidth * 0.3);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createRadialGradient(perch.x, perch.y, 0, perch.x, perch.y, reach);
  g.addColorStop(0, `rgba(34,28,40,${0.5 + 0.2 * tightness})`);
  g.addColorStop(0.45, `rgba(34,28,40,${0.3 + 0.14 * tightness})`);
  g.addColorStop(1, "rgba(34,28,40,0)");
  ctx.fillStyle = g;
  const angle = Math.atan2(uy, ux);
  ctx.translate(perch.x, perch.y);
  ctx.rotate(angle);
  ctx.scale(1, halfWidth / reach);
  ctx.translate(-perch.x, -perch.y);
  ctx.fillRect(perch.x - reach, perch.y - reach, reach * 2, reach * 2);
  ctx.restore();
};

export const viewPlateRect = (plate: ViewPlate, camera: Camera) => {
  const t = layer(plate.reference, camera, plate.distance);
  const size = plateSize(plate);
  return {
    x: plate.rect.x0 * t.scale + t.dx,
    y: plate.rect.y0 * t.scale + t.dy,
    width: (size.width / plate.k) * t.scale,
    height: (size.height / plate.k) * t.scale,
  };
};

const WAVE_SPEED = 0.058;
const WAVE_LENGTH = 4.6;
const WAVE_HALF_WIDTH = 0.75;

export type WaveCaches = {
  maskA: OffscreenSlot;
  maskB: OffscreenSlot;
  lit: OffscreenSlot;
  tint: OffscreenSlot;
};

const paintCrestMask = (c: Offscreen, camera: Camera, frame: number, shift: number) => {
  const width = camera.width / 2;
  const height = camera.height / 2;
  c.ctx.setTransform(1, 0, 0, 1, 0, 0);
  c.ctx.clearRect(0, 0, width, height);
  const m = c.ctx;
  m.scale(0.5, 0.5);
  const offset = ((frame * WAVE_SPEED + shift) % WAVE_LENGTH) - WAVE_LENGTH;
  const gust = 0.5 + 0.5 * Math.sin((Math.PI * 2 * frame) / 52 - 0.6);
  const f = (camera.focal / 36) * camera.width;
  const horizon = camera.height / 2 + f * Math.tan(camera.pitch);
  for (let k = 0; k < 30; k++) {
    const crestX = -14 + k * WAVE_LENGTH + offset;
    for (let s = 0; s <= 90; s++) {
      const y = 13.8 + Math.pow(s / 90, 1.9) * 150;
      const patch = noise1(y * 0.075 + crestX * 0.11, 1903) * 0.7 + 0.3;
      const strength = gust * patch * (0.7 + 0.3 * Math.sin(crestX * 0.9 + y * 0.05));
      if (strength < 0.12) continue;
      const p = project(camera, [crestX, y, 0]);
      if (p.depth <= 0.4 || p.x < -200 || p.x > camera.width + 200 || p.y < horizon - 4 || p.y > camera.height + 200) continue;
      const radius = Math.max(10, WAVE_HALF_WIDTH * p.scale);
      const a = 0.5 * strength;
      const g = m.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.55, `rgba(255,255,255,${a * 0.7})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      m.fillStyle = g;
      m.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    }
  }
};

const tintMask = (tint: Offscreen, mask: Offscreen, color: string) => {
  const c = tint.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.clearRect(0, 0, tint.canvas.width, tint.canvas.height);
  c.drawImage(mask.canvas, 0, 0, tint.canvas.width, tint.canvas.height);
  c.globalCompositeOperation = "source-in";
  c.fillStyle = color;
  c.fillRect(0, 0, tint.canvas.width, tint.canvas.height);
  c.globalCompositeOperation = "source-over";
};

export const drawPaddyWaves = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  plate: ViewPlate,
  camera: Camera,
  frame: number,
  caches: WaveCaches,
) => {
  const rect = viewPlateRect(plate, camera);
  const width = camera.width;
  const height = camera.height;
  const maskA = offscreen(caches.maskA, width / 2, height / 2);
  const maskB = offscreen(caches.maskB, width / 2, height / 2);
  const lit = offscreen(caches.lit, width, height);
  const tint = offscreen(caches.tint, width, height);
  paintCrestMask(maskA, camera, frame, 0);
  paintCrestMask(maskB, camera, frame, WAVE_LENGTH / 2);

  const l = lit.ctx;
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.globalCompositeOperation = "source-over";
  l.clearRect(0, 0, width, height);
  l.imageSmoothingEnabled = true;
  l.imageSmoothingQuality = "high";
  l.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  l.globalCompositeOperation = "destination-in";
  l.imageSmoothingQuality = "high";
  l.drawImage(maskA.canvas, 0, 0, width, height);
  l.globalCompositeOperation = "source-over";

  tintMask(tint, maskB, paddyWide.rowShadow);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.36;
  ctx.drawImage(tint.canvas, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.7;
  ctx.drawImage(lit.canvas, 0, 0);
  tintMask(tint, maskA, dusk.paddyLit[0]);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.3;
  ctx.drawImage(tint.canvas, 0, 0);
  ctx.restore();
};

const mistCache: OffscreenSlot = { current: null };
const cloudCache: OffscreenSlot = { current: null };

export const drawFarMist = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  const width = camera.width;
  const height = camera.height;
  const mist = offscreen(mistCache, width, height);
  const c = mist.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, width, height);
  const f = (camera.focal / 36) * camera.width;
  const horizon = height / 2 + f * Math.tan(camera.pitch);
  const drift = frame * 0.32;
  for (let i = 0; i < 7; i++) {
    const r = (k: number) => hash(1904, i, k);
    const cx = ((r(1) * 1.5 - 0.25 + (r(2) - 0.5) * 0.02 * Math.sin(frame * 0.013 + i)) * width + drift * (0.4 + r(3))) % (width * 1.5) - width * 0.25;
    const cy = horizon - 30 + r(4) * 70;
    const rx = (0.16 + 0.2 * r(5)) * width;
    const ry = 14 + 26 * r(6);
    c.save();
    c.translate(cx, cy);
    c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    const a = 0.1 + 0.1 * r(7);
    g.addColorStop(0, rgba(paddyWide.mist, a));
    g.addColorStop(0.6, rgba(paddyWide.mist, a * 0.6));
    g.addColorStop(1, rgba(paddyWide.mist, 0));
    c.fillStyle = g;
    c.fillRect(-rx, -rx, rx * 2, rx * 2);
    c.restore();
  }
  ctx.save();
  ctx.drawImage(mist.canvas, 0, 0);
  ctx.restore();
};

export const CLOUD_DRIFT_PER_FRAME = 0.24;
export const CLOUD_FADE_ROW = 170;

export const drawCloudDrift = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  plate: ViewPlate,
  camera: Camera,
  frame: number,
) => {
  const rect = viewPlateRect(plate, camera);
  const width = camera.width;
  const height = camera.height;
  const cloud = offscreen(cloudCache, width, height);
  const c = cloud.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, width, height);
  const offset = frame * CLOUD_DRIFT_PER_FRAME;
  const rows = CLOUD_FADE_ROW;
  const k = rect.width / image.width;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(image, 0, 0, image.width, rows + 6, rect.x + offset, rect.y, rect.width, (rows + 6) * k);
  c.globalCompositeOperation = "destination-in";
  const g = c.createLinearGradient(0, rect.y, 0, rect.y + rows * k);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.72, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(rect.x + offset, rect.y, rect.width, rows * k);
  c.globalCompositeOperation = "source-over";
  ctx.drawImage(cloud.canvas, 0, 0);
};

