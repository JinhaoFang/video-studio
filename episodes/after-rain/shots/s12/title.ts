/** 按片名定稿的比例把纸面放在左天空里。墨迹用正片叠底，白文印保留本色。盖稳后复用同一张透明画，不重复磨墨。 */
import { drawTitleCard } from "../../title/canvas.ts";
import { defaultTitleLayout } from "../../title/draw.ts";
import { SEAL_PRESS_FRAME, SEAL_SETTLE_FRAMES } from "../../title/timing.ts";

const { charSize, charGap, sealGap, sealSize } = defaultTitleLayout;
const layout = { centerX: charSize, topY: charSize / 2 };
const sealTop = layout.topY + 2 * charSize + charGap + sealGap / 2;
const size = 0.75;
const centerX = 480;
const top = 296;
let sheet: HTMLCanvasElement | undefined;
let lastDrawing = -1;

export const drawEndTitle = (ctx: CanvasRenderingContext2D, frame: number) => {
  if (frame < 0) return;
  if (!sheet) {
    sheet = document.createElement("canvas");
    sheet.width = charSize * 2;
    sheet.height = sealTop + sealGap + sealSize + layout.topY;
  }
  const drawing = Math.min(frame, SEAL_PRESS_FRAME + SEAL_SETTLE_FRAMES);
  if (drawing !== lastDrawing) {
    const paper = sheet.getContext("2d")!;
    paper.clearRect(0, 0, sheet.width, sheet.height);
    drawTitleCard(paper, drawing, { layout, fade: false });
    lastDrawing = drawing;
  }
  ctx.save();
  ctx.translate(centerX - size * layout.centerX, top - size * layout.topY);
  ctx.scale(size, size);
  ctx.globalCompositeOperation = "multiply";
  const stampHeight = sheet.height - sealTop;
  const ink = sheet;
  const drawInk = () => ctx.drawImage(ink, 0, 0, ink.width, sealTop, 0, 0, ink.width, sealTop);
  drawInk();
  ctx.globalAlpha = 0.48;
  drawInk();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(sheet, 0, sealTop, sheet.width, stampHeight, 0, sealTop, sheet.width, stampHeight);
  ctx.restore();
};
