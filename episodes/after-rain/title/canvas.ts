/**
 * 浏览器 Canvas 2D 渲染封装：将 draw.ts 生成的浮点 Paper 合成到 Canvas 2D 上，
 * 并提供第 12 镜暮色天空分层预览背景（仅天色渐变，不含屋子与竹竿）。供 TitlePreview.tsx 与第 12 镜（#191）调用。
 */
import { toBytes, type Paper } from "../../../src/kit/engine/paint.ts";
import { clamp01 } from "../../../src/kit/engine/timing.ts";
import {
  renderTitleFrameParts,
  twilightSkyColorAt,
  type TitleDrawOptions,
} from "./draw.ts";

const paintPaperToCanvas = (
  ctx: CanvasRenderingContext2D,
  src: Paper,
  dx = 0,
  dy = 0,
  alpha = 1,
) => {
  if (alpha <= 0.001) return;
  const bytes = toBytes(src);
  const temp = document.createElement("canvas");
  temp.width = src.width;
  temp.height = src.height;
  const tctx = temp.getContext("2d");
  if (!tctx) return;
  const img = tctx.createImageData(src.width, src.height);
  img.data.set(bytes);
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha *= clamp01(alpha);
  ctx.drawImage(temp, dx, dy);
  ctx.restore();
};

export const drawTwilightSkyBackdrop = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  const stops = 32;
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    const [r, g, b] = twilightSkyColorAt(t);
    grad.addColorStop(
      t,
      `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`,
    );
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
};

export const drawTitleCard = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  options: TitleDrawOptions = {},
) => {
  const parts = renderTitleFrameParts(frame, options);
  if (parts.fadeAlpha <= 0.001) return;
  paintPaperToCanvas(
    ctx,
    parts.calligraphy.art,
    parts.calligraphy.x,
    parts.calligraphy.y,
    parts.fadeAlpha,
  );
  if (parts.seal) {
    const { cx, cy, art, state } = parts.seal;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(state.scale, state.scale);
    paintPaperToCanvas(
      ctx,
      art,
      -art.width * 0.5,
      -art.height * 0.5,
      parts.fadeAlpha * state.alpha,
    );
    ctx.restore();
  }
};
