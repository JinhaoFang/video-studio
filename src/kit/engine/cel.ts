/**
 * 赛璐璐：一个体块先按剪影平涂底色，再按顺序平涂各个色区（后画的盖住先画的），然后只在阴影区里用同一套色区的阴影色重画一遍，
 * 所以每个色区都只有受光、阴影两种颜色，边缘是硬的；可选一条轮廓光色带；最后画线。
 * 所有折线都是画面 1 倍坐标；layer 是按 2 倍尺寸开的离屏画布，画完缩小贴回画面。
 * 待定事项：无。
 */
import { drawStrokes } from "./ink.ts";
import type { Stroke } from "./ink.ts";
import type { Point } from "./figure.ts";

export const tracePath = (ctx: CanvasRenderingContext2D, loops: readonly Point[][], factor = 1) => {
  ctx.beginPath();
  for (let k = 0; k < loops.length; k++) {
    const loop = loops[k];
    ctx.moveTo(loop[0][0] * factor, loop[0][1] * factor);
    for (let i = 1; i < loop.length; i++) ctx.lineTo(loop[i][0] * factor, loop[i][1] * factor);
    ctx.closePath();
  }
};

export type Tone = { lit: string; shade: string };

export type CelPart = {
  silhouette: Point[][];
  base: Tone;
  regions: { loops: Point[][]; tone: Tone }[];
  shadow: Point[][];
  rim?: { loops: Point[][]; color: string; alpha: number };
  lines: Stroke[];
  lineColor: string;
};

export type Layer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  factor: number;
};

export const createLayer = (x: number, y: number, width: number, height: number, factor: number): Layer => {
  const canvas = document.createElement("canvas");
  const left = Math.floor(x);
  const top = Math.floor(y);
  const w = Math.ceil(x + width) - left;
  const h = Math.ceil(y + height) - top;
  canvas.width = Math.max(1, w * factor);
  canvas.height = Math.max(1, h * factor);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用。");
  ctx.setTransform(factor, 0, 0, factor, -left * factor, -top * factor);
  ctx.lineJoin = "round";
  return { canvas, ctx, x: left, y: top, width: w, height: h, factor };
};

export const placeLayer = (target: CanvasRenderingContext2D, layer: Layer, alpha = 1) => {
  target.save();
  target.globalAlpha = alpha;
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = "high";
  target.drawImage(layer.canvas, layer.x, layer.y, layer.width, layer.height);
  target.restore();
};

const fillLoops = (ctx: CanvasRenderingContext2D, loops: readonly Point[][], color: string) => {
  if (loops.length === 0) return;
  ctx.fillStyle = color;
  tracePath(ctx, loops);
  ctx.fill("evenodd");
};

export const drawCel = (ctx: CanvasRenderingContext2D, part: CelPart) => {
  if (part.silhouette.length === 0) return;
  ctx.save();
  tracePath(ctx, part.silhouette);
  ctx.clip("evenodd");
  fillLoops(ctx, part.silhouette, part.base.lit);
  for (const region of part.regions) fillLoops(ctx, region.loops, region.tone.lit);
  if (part.shadow.length > 0) {
    ctx.save();
    tracePath(ctx, part.shadow);
    ctx.clip("evenodd");
    fillLoops(ctx, part.silhouette, part.base.shade);
    for (const region of part.regions) fillLoops(ctx, region.loops, region.tone.shade);
    ctx.restore();
  }
  if (part.rim && part.rim.loops.length > 0) {
    ctx.save();
    ctx.globalAlpha = part.rim.alpha;
    fillLoops(ctx, part.rim.loops, part.rim.color);
    ctx.restore();
  }
  ctx.restore();
  drawStrokes(ctx, part.lines, part.lineColor);
};
