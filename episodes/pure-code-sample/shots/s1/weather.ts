/**
 * S1 的天气与光：光照遮罩（夕光照到的地方为 1）、雨丝、檐口滴水、主角头顶那颗水珠和打中后溅开的水花。
 * 遮罩在 1/16 分辨率上逐格计算再放大，天上从太阳向外扩，地上按纵深从远往近扫，边缘用噪声做出云影的不规则；
 * 雨丝和檐口滴水放在米制场景里按相机投影，近的长而淡、远的短而密，按雨量逐根退场，不是均匀粒子；院子水洼里的雨点涟漪跟着院子那层底图走，按雨量变稀。
 */
import { layer, project } from "../../engine/camera.ts";
import type { Camera, Vec3 } from "../../engine/camera.ts";
import { hash, noise2 } from "../../engine/random.ts";
import { eave, plates, puddles, reference } from "../../scene.ts";
import { dusk, ink, rain, warm } from "../../tokens.ts";
import { lightFront, rainAmount, skyFront } from "./timing.ts";

const MW = 120;
const MH = 68;
const SUN_REF = { x: 1530, y: 250 };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const lerpRgb = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

const mixHex = (a: string, b: string, t: number) => lerpRgb(toRgb(a), toRgb(b), t);

const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

export const sunScreen = (camera: Camera) => {
  const t = layer(reference, camera, 3000);
  return { x: SUN_REF.x * t.scale + t.dx, y: SUN_REF.y * t.scale + t.dy };
};

export const lightAt = (camera: Camera, frame: number, x: number, y: number) => {
  const f = (camera.focal / 36) * camera.width;
  const sun = sunScreen(camera);
  const below = Math.atan((y - camera.height / 2) / f) - camera.pitch;
  const front = lightFront(frame);
  let ground = 0;
  if (below > 0.002 && Number.isFinite(front)) {
    const d = camera.position[2] / Math.tan(below);
    const wobble = (noise2(x / 260, Math.log(d) * 1.7, 31) - 0.5) * 0.7;
    ground = smooth(-0.25, 0.25, Math.log(d) - Math.log(front) + wobble);
  }
  const r = skyFront(frame);
  const angle = Math.atan2(y - sun.y, x - sun.x);
  const edge = r * (1 + 0.22 * (noise2(Math.cos(angle) * 2 + 3, Math.sin(angle) * 2, 17) - 0.5));
  const sky = r <= 0 ? 0 : smooth(edge + 260, edge - 260, Math.hypot(x - sun.x, y - sun.y));
  const horizon = smooth(-0.01, 0.03, below);
  return Math.max(ground * horizon, sky * (1 - horizon * 0.85));
};

let maskCanvas: HTMLCanvasElement | null = null;

export const lightMask = (camera: Camera, frame: number) => {
  if (!maskCanvas) {
    maskCanvas = document.createElement("canvas");
    maskCanvas.width = MW;
    maskCanvas.height = MH;
  }
  const ctx = maskCanvas.getContext("2d")!;
  const image = ctx.createImageData(MW, MH);
  const sx = camera.width / MW;
  const sy = camera.height / MH;
  for (let j = 0; j < MH; j++) {
    for (let i = 0; i < MW; i++) {
      const m = lightAt(camera, frame, (i + 0.5) * sx, (j + 0.5) * sy);
      const o = (j * MW + i) * 4;
      image.data[o] = 255;
      image.data[o + 1] = 255;
      image.data[o + 2] = 255;
      image.data[o + 3] = Math.round(m * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return maskCanvas;
};

const STREAKS = 900;
const FALL = 8.5;
const WIND = 1.1;
const TOP = 6;

export const drawRain = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number, warmth: number) => {
  const amount = rainAmount(frame);
  if (amount <= 0.001) return;
  const t = frame / 24;
  const pale = mixHex(rain.cloud.edge, warm.rim, warmth * 0.7);
  const fascia = fasciaPoint(camera, camera.position[0]);
  ctx.save();
  if (fascia) {
    ctx.beginPath();
    ctx.rect(0, fascia.y, camera.width, camera.height - fascia.y);
    ctx.clip();
  }
  ctx.lineCap = "round";
  for (let i = 0; i < STREAKS; i++) {
    const keep = hash(147, i, 1);
    if (keep > amount) continue;
    const depth = 1.7 + Math.pow(hash(147, i, 2), 1.6) * 16;
    const x0 = camera.position[0] + (hash(147, i, 3) - 0.5) * depth * 1.5;
    const speed = FALL * (0.85 + 0.3 * hash(147, i, 4));
    const phase = hash(147, i, 5) * TOP;
    const z = TOP - ((phase + speed * t) % TOP);
    const drift = WIND * (z / speed);
    const head: Vec3 = [x0 + drift, depth, z];
    const tailLen = speed / 24 * (0.45 + 0.4 * hash(147, i, 6));
    const tail: Vec3 = [head[0] + (WIND / speed) * tailLen, depth, z + tailLen];
    const a = project(camera, head);
    const b = project(camera, tail);
    if (a.depth < 0.3) continue;
    if ((a.x < -40 && b.x < -40) || (a.x > camera.width + 40 && b.x > camera.width + 40)) continue;
    const near = Math.max(0, 1 - depth / 18);
    const fade = Math.min(1, (amount - keep) * 6);
    const alpha = (0.1 + 0.32 * near) * fade * (0.6 + 0.4 * hash(147, i, 7));
    ctx.strokeStyle = rgba(pale, alpha);
    ctx.lineWidth = Math.max(0.6, 0.006 * a.scale * (0.5 + hash(147, i, 8)));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
};

const dropShape = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stretch: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y - r * (1.2 + stretch));
  ctx.bezierCurveTo(x + r * 0.55, y - r * (0.5 + stretch * 0.5), x + r, y - r * 0.1, x + r, y + r * 0.25);
  ctx.bezierCurveTo(x + r, y + r * 0.85, x + r * 0.5, y + r, x, y + r);
  ctx.bezierCurveTo(x - r * 0.5, y + r, x - r, y + r * 0.85, x - r, y + r * 0.25);
  ctx.bezierCurveTo(x - r, y - r * 0.1, x - r * 0.55, y - r * (0.5 + stretch * 0.5), x, y - r * (1.2 + stretch));
  ctx.closePath();
};

export const drawDrop = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stretch: number, warmth: number, angle = 0) => {
  if (angle !== 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawDrop(ctx, 0, 0, r, stretch, warmth);
    ctx.restore();
    return;
  }
  const body = lerpRgb(mixHex(rain.paddyWater, rain.cloud.edge, 0.35), toRgb(dusk.cloudGap[1]), warmth * 0.6);
  dropShape(ctx, x, y, r, stretch);
  ctx.fillStyle = rgba(body, 0.92);
  ctx.fill();
  const shade = mixHex(dusk.shadowTeal, dusk.shadowViolet, 0.4);
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y + r * 0.45, r * 0.9, r * 0.75, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = rgba(shade, 0.55);
  ctx.fill();
  ctx.restore();
  dropShape(ctx, x, y, r, stretch);
  ctx.lineWidth = Math.max(1, Math.min(ink.maxPx, r * 0.16));
  ctx.strokeStyle = ink.color;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + r * 0.35, y - r * 0.1, Math.max(0.8, r * 0.2), Math.max(0.8, r * 0.3), -0.3, 0, Math.PI * 2);
  ctx.fillStyle = warm.dropHighlight;
  ctx.fill();
};

export const fasciaPoint = (camera: Camera, worldX: number) => {
  const ref = project(reference, [worldX, eave.edge, eave.height]);
  const t = layer(reference, camera, eave.edge);
  if (!(t.scale > 0 && t.scale < 40)) return null;
  return { x: ref.x * t.scale + t.dx, y: ref.y * t.scale + t.dy, scale: t.scale };
};

const EAVE_DRIPS = 46;

export const drawEaveDrips = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number, warmth: number) => {
  for (let k = 0; k < EAVE_DRIPS; k++) {
    const start = Math.floor(hash(148, k, 1) * 110) - 12;
    if (rainAmount(Math.max(0, start)) < hash(148, k, 2) * 0.9) continue;
    const age = (frame - start) / 24;
    if (age < 0 || age > 0.9) continue;
    const x = -3.2 + 6.4 * hash(148, k, 3);
    const z = eave.height - 0.5 * 9.8 * age * age;
    if (z < 0) continue;
    const p = project(camera, [x, eave.edge, z]);
    if (p.depth < 0.3 || p.y < -60 || p.y > camera.height + 60 || p.x < -40 || p.x > camera.width + 40) continue;
    const v = 9.8 * age;
    const r = Math.max(1.4, 0.006 * p.scale * (0.8 + 0.5 * hash(148, k, 4)));
    const stretch = Math.min(5, (v / 24) * p.scale / r * 0.35);
    drawDrop(ctx, p.x, p.y, r, stretch, warmth);
  }
};

export const splash = (ctx: CanvasRenderingContext2D, x: number, y: number, unit: number, age: number, warmth: number) => {
  if (age <= 1) {
    const w = unit * (0.5 + 0.3 * age);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y + unit * 0.04, w, unit * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(mixHex(rain.paddyWater, warm.dropHighlight, 0.45), 0.85);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = ink.color;
    ctx.stroke();
    ctx.restore();
  }
  for (let k = 0; k < 10; k++) {
    const life = 6 + Math.floor(hash(149, k, 1) * 5);
    if (age > life) continue;
    const a = -Math.PI / 2 + (hash(149, k, 2) - 0.5) * 2.4;
    const speed = unit * (0.24 + 0.22 * hash(149, k, 3));
    const g = unit * 0.035;
    const vx = Math.cos(a) * speed;
    const vy = Math.sin(a) * speed + g * age;
    const px = x + vx * age;
    const py = y + Math.sin(a) * speed * age + 0.5 * g * age * age;
    const r = Math.max(1.6, unit * (0.07 + 0.06 * hash(149, k, 4)) * (1 - age / (life + 3)));
    const v = Math.hypot(vx, vy);
    drawDrop(ctx, px, py, r, Math.min(2.5, (v / r) * 0.25), warmth, Math.atan2(vy, vx) - Math.PI / 2);
  }
};

export const drawRipples = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number, warmth: number) => {
  const amount = rainAmount(frame);
  if (amount <= 0.01) return;
  const yard = plates.find((p) => p.id === "yard")!;
  const t = layer(reference, camera, yard.distance);
  if (!(t.scale > 0 && t.scale < 40)) return;
  const col = mixHex(rain.cloud.edge, warm.rim, warmth * 0.6);
  puddles.forEach((p, n) => {
    const y = project(reference, [0, p.depth, 0]).y;
    const perMeter = project(reference, [1, p.depth, 0]).x - project(reference, [0, p.depth, 0]).x;
    const h = (project(reference, [0, p.depth * 0.9, 0]).y - y) * 0.9;
    const cx = p.x * t.scale + t.dx;
    const cy = y * t.scale + t.dy;
    const rx = p.width * perMeter * t.scale;
    const ry = h * t.scale;
    if (cy - ry > camera.height || cx + rx < 0 || cx - rx > camera.width) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.96, ry * 0.9, 0, 0, Math.PI * 2);
    ctx.clip();
    const slots = Math.round(8 + p.width * 7);
    for (let k = 0; k < slots; k++) {
      const id = n * 64 + k;
      const period = 9 + Math.floor(hash(150, id, 1) * 7);
      const local = frame + hash(150, id, 2) * period;
      const cycle = Math.floor(local / period);
      const age = (local % period) / period;
      if (hash(151, id, cycle) > amount) continue;
      const a = hash(152, id, cycle) * Math.PI * 2;
      const rr = Math.sqrt(hash(153, id, cycle));
      const x = cx + Math.cos(a) * rr * rx * 0.85;
      const yy = cy + Math.sin(a) * rr * ry * 0.75;
      const R = (0.03 + 0.2 * Math.sqrt(age)) * perMeter * t.scale;
      ctx.lineWidth = Math.max(1, 2.4 * (1 - age * 0.6) * Math.sqrt(t.scale));
      ctx.strokeStyle = rgba(col, (1 - age) * 0.85);
      ctx.beginPath();
      ctx.ellipse(x, yy, R, R * (ry / rx) * 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (age > 0.25) {
        ctx.strokeStyle = rgba(col, (1 - age) * 0.5);
        ctx.beginPath();
        ctx.ellipse(x, yy, R * 0.55, R * 0.55 * (ry / rx) * 1.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
};
