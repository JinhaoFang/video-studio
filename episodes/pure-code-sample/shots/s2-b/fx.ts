/**
 * S2 B 版的拖影，以及绕开 pole.ts 一个问题的办法（limitLineWidth）。拖影：一拍一的最快几帧上，把前面一两张画（各自的画张）先画进整幅离屏画布，半透明地衬在当前这张下面（残影），
 * 再在运动部位附近、沿运动方向画几条两端收尖、断开的干笔速度线（引擎的笔画），最后画当前这张，所以残影和速度线只在轮廓外露出。
 * 速度线的起点、方向和散布由镜头按头部、翼尖、身体的屏幕坐标给出。
 * limitLineWidth 给 drawPole 一个代理上下文，把线宽限制在 maxLinePx 以内：pole.ts 对落在相机背后的取样点仍按最小纵深投影，
 * 那几段的高光笔画线宽会到十几万像素、圆头盖住整幅画面（近景机位下竹竿的画张号为 10 时触发），画面内的高光最宽只有二十几像素，限制线宽不影响外观。
 * 待定（设计）：残影的透明度和速度线的条数是本版自定的。
 */
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { resample } from "../../../../src/kit/engine/figure.ts";
import { boil, drawStrokes, strokes } from "../../../../src/kit/engine/ink.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { ink } from "../../../after-rain/tokens.ts";

const maxLinePx = 30;

export const limitLineWidth = (ctx: CanvasRenderingContext2D): CanvasRenderingContext2D =>
  new Proxy(ctx, {
    get: (target, key) => {
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
    set: (target, key, value) => {
      Reflect.set(target, key, key === "lineWidth" && typeof value === "number" && value > maxLinePx ? maxLinePx : value, target);
      return true;
    },
  });

export type Ghost = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

export const ghostLayer = (width: number, height: number): Ghost => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 不可用。");
  return { canvas, ctx };
};

export const ghostAlpha = [0, 0.65, 0.4];
export const shakeGhostAlpha = 0.75;

export const paintGhost = (ctx: CanvasRenderingContext2D, ghost: Ghost, alpha: number) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(ghost.canvas, 0, 0);
  ctx.restore();
};

export const speedLines = (ctx: CanvasRenderingContext2D, from: Point, to: Point, spread: number, beyond: number, count: number, seed: number) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const reach = Math.hypot(dx, dy) + 2 * beyond;
  if (reach < 6 || count <= 0) return;
  const ux = dx === 0 && dy === 0 ? 0 : dx / Math.hypot(dx, dy);
  const uy = dx === 0 && dy === 0 ? 1 : dy / Math.hypot(dx, dy);
  const nx = -uy;
  const ny = ux;
  const start: Point = [from[0] - ux * beyond, from[1] - uy * beyond];
  for (let i = 0; i < count; i++) {
    const off = (hash(seed, i, 1) - 0.5) * 2 * spread;
    const len = reach * (0.4 + 0.6 * hash(seed, i, 2));
    const back = (reach - len) * hash(seed, i, 3);
    const bend = (hash(seed, i, 4) - 0.5) * 4;
    const ex = start[0] + ux * (back + len) + nx * off;
    const ey = start[1] + uy * (back + len) + ny * off;
    const pts = boil(
      resample(
        [
          [ex - ux * len + nx * bend, ey - uy * len + ny * bend],
          [ex - ux * len * 0.5 + nx * bend * 0.4, ey - uy * len * 0.5 + ny * bend * 0.4],
          [ex, ey],
        ],
        3,
        false,
      ),
      seed + i,
      0.6,
    );
    drawStrokes(
      ctx,
      strokes(pts, false, {
        seed: seed + i * 13,
        base: 1.8,
        min: ink.minPx * 0.85,
        max: ink.maxPx,
        light: [ux, uy],
        breakEvery: [14, 44],
        cornerAngle: 1.2,
        gap: [2, 9],
        litThin: 0.9,
        dropLit: 0,
        minLength: 8,
      }),
      ink.color,
    );
  }
};
