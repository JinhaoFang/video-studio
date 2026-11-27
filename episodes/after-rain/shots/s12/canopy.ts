/** 暮色屋正面把树和屋子烘在同一张水粉纸上。只取左侧树冠的原笔触作横向风剪切，树根和靠屋檐的边固定，再按檐廊所在深度投影。 */
import { layer, type Camera } from "../../../../src/kit/engine/camera.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { viewPlates } from "../../scene.ts";

const front = viewPlates.find((plate) => plate.id === "house-front-twilight")!;
const makeCrownLayer = (source: HTMLImageElement) => {
  const paper = document.createElement("canvas");
  paper.width = source.naturalWidth;
  paper.height = source.naturalHeight;
  const ctx = paper.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const top = Math.floor(paper.height * 0.46);
  const width = Math.floor(paper.width * 0.28);
  const height = Math.floor(paper.height * 0.30);
  const edgePaint = ctx.getImageData(0, top, width, height);
  for (let n = 0; n < 96; n++) {
    const x = Math.floor(hash(191, n, 4) * (width - 12)) + 6;
    let y = 0;
    while (y < height && edgePaint.data[(y * width + x) * 4 + 3] < 210) y++;
    if (y < 6 || y + 8 >= height) continue;
    const i = ((y + 7) * width + x) * 4;
    const [r, g, b] = edgePaint.data.subarray(i, i + 3);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const reach = 2 + 4 * hash(191, n, 5);
    ctx.beginPath();
    ctx.moveTo(x - 2, top + y + 2);
    ctx.quadraticCurveTo(x - 3, top + y - reach, x + reach, top + y - reach);
    ctx.quadraticCurveTo(x + reach / 2, top + y, x - 2, top + y + 2);
    ctx.fill();
  }
  const paint = ctx.getImageData(0, top, width, height);
  const blown = ctx.createImageData(width, height);
  const gust = new Float32Array(width);
  return (frame: number) => {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const edge = Math.min(1, x / 16, (width - 1 - x) / 64);
      gust[x] = edge * (4 * Math.sin(frame * Math.PI * 2 / 96 - u * 7) + 2 * Math.sin(frame * Math.PI * 2 / 65 - u * 11));
    }
    for (let y = 0; y < height; y++) {
      const reach = (1 - y / (height - 1)) ** 2;
      for (let x = 0; x < width; x++) {
        const from = x + reach * gust[x];
        const left = Math.floor(from);
        const t = from - left;
        const i = (y * width + x) * 4;
        const a = (y * width + left) * 4;
        const b = left < width - 1 ? a + 4 : a;
        const alphaA = paint.data[a + 3] * (1 - t);
        const alphaB = paint.data[b + 3] * t;
        const alpha = alphaA + alphaB;
        blown.data[i + 3] = alpha;
        if (alpha === 0) continue;
        for (let c = 0; c < 3; c++) blown.data[i + c] = (paint.data[a + c] * alphaA + paint.data[b + c] * alphaB) / alpha;
      }
    }
    ctx.putImageData(blown, 0, top);
    return paper;
  };
};

const crowns = new WeakMap<HTMLImageElement, ReturnType<typeof makeCrownLayer>>();

export const drawBreezyFront = (ctx: CanvasRenderingContext2D, source: HTMLImageElement, camera: Camera, frame: number) => {
  let crown = crowns.get(source);
  if (!crown) {
    crown = makeCrownLayer(source);
    crowns.set(source, crown);
  }
  const { dx, dy, scale } = layer(front.reference, camera, front.distance);
  const paper = crown(frame);
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(paper, dx + front.rect.x0 * scale, dy + front.rect.y0 * scale, paper.width * scale / front.k, paper.height * scale / front.k);
  ctx.restore();
};
