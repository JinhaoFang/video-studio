/** 第 4、6 镜的 W1。用本机位的树篱和天空画翻转的倒影，波峰局部折射同一幅画。前水面与后水面共用轮廓和采样坐标。 */
import { layer, project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { noise1 } from "../../../../src/kit/engine/random.ts";
import { hedgeWorld, puddleW1, viewPlates } from "../../scene.ts";
import { mixHex } from "./walk.ts";

export type PuddleLook = { bank: string; bankWet: string; hedge: string; sky: string; warm: string; cloud: string; foam: string };
export type Ripple = { frame: number; x: number; y: number; rings?: number; speed?: number; life?: number };
type PuddleState = {
  frame: number;
  look: PuddleLook;
  ripples: readonly Ripple[];
  shatter?: { frame: number; x: number; y: number };
  frontFromY?: number;
  image: HTMLImageElement;
  id: "low-s4" | "low-s6";
};

export const puddleOutline = (steps = 48): Vec3[] => Array.from({ length: steps }, (_, i) => {
  const a = (i / steps) * Math.PI * 2;
  const lobe = 1.04 + 0.14 * Math.sin(2 * a + 0.7) + 0.1 * Math.cos(3 * a - 0.5) + 0.07 * Math.sin(5 * a + 1.4) + (noise1(i * 0.75, 1881) - 0.5) * 0.14;
  return [puddleW1.x + Math.cos(a) * puddleW1.rx * lobe, puddleW1.y + Math.sin(a) * puddleW1.ry * lobe, 0];
});
const shore = puddleOutline();
export const insidePuddle = (x: number, y: number): boolean => {
  let inside = false;
  for (let i = 0, j = shore.length - 1; i < shore.length; j = i++) {
    const [xi, yi] = shore[i];
    const [xj, yj] = shore[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export const drawPuddle = (ctx: CanvasRenderingContext2D, camera: Camera, state: PuddleState) => {
  const { frame, look, image, id } = state;
  const bank = shore.map((p) => project(camera, p));
  const top = Math.min(...bank.map(p => p.y));
  const bottom = Math.max(...bank.map(p => p.y));
  const center = project(camera, [puddleW1.x, puddleW1.y, 0]);
  const height = bottom - top;
  const path = (grow: number, rise: number) => {
    const contour = new Path2D();
    const points = bank.map(p => [p.x + (p.x - center.x) * grow, p.y + (p.y - center.y) * rise] as Point);
    const last = points[points.length - 1];
    contour.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
    points.forEach(([x, y], i) => {
      const next = points[(i + 1) % points.length];
      contour.quadraticCurveTo(x, y, (x + next[0]) / 2, (y + next[1]) / 2);
    });
    contour.closePath();
    return contour;
  };
  const plate = viewPlates.find(p => p.id === id)!;
  const transform = layer(plate.reference, camera, plate.distance);
  const hedgeY = project(plate.reference, [id === "low-s4" ? -2 : 0.5, hedgeWorld.y, 0]).y;
  const srcHeight = (hedgeY - plate.rect.y0 - 6) * plate.k;
  const reflect = (dx: number, dy: number) => {
    ctx.save();
    ctx.translate(plate.rect.x0 * transform.scale + transform.dx + dx, bottom + dy + 2);
    ctx.scale(1, -1);
    ctx.drawImage(image, 0, 0, image.width, srcHeight, 0, 0, image.width * transform.scale / plate.k, height + 4);
    ctx.restore();
  };
  ctx.save();
  if (state.frontFromY !== undefined) {
    ctx.beginPath();
    ctx.rect(0, state.frontFromY, camera.width, camera.height);
    ctx.clip();
  } else {
    ctx.fillStyle = look.bankWet;
    for (let i = 4; i >= 1; i--) {
      ctx.fillStyle = i > 2 ? look.bank : look.bankWet;
      ctx.globalAlpha = 0.16 + (4 - i) * 0.10;
      ctx.fill(path(i * 0.016, i * 0.11));
    }
  }
  ctx.globalAlpha = 1;
  ctx.clip(path(0, 0));
  const drift = frame * 0.16;
  reflect(drift, 0);
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9;
    const x = center.x + (noise1(i * 2.7, 1884) - 0.5) * center.scale;
    const y = top + u * height;
    const wave = Math.sin(frame / 15 + i * 2.4);
    const width = (0.08 + 0.18 * noise1(i * 3.6, 1886)) * center.scale;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - width, y);
    ctx.quadraticCurveTo(x, y - 3 + wave, x + width, y + wave);
    ctx.quadraticCurveTo(x, y + 2.4 + wave, x - width, y);
    ctx.clip();
    reflect(drift + 3 * wave, 3 + wave);
    ctx.restore();
  }
  for (const ripple of state.ripples) {
    const life = (ripple.life ?? 0.75) * 24;
    const heavy = ripple.frame === state.shatter?.frame;
    for (let k = 0; k < (ripple.rings ?? 2); k++) {
      const age = frame - ripple.frame - k * 4;
      if (age < 0 || age >= life) continue;
      const radius = 0.025 + (ripple.speed ?? 0.22) * age / 24;
      const fade = 1 - age / life;
      const arc = new Path2D();
      for (let i = 0; i <= 48; i++) {
        const a = i * Math.PI / 24;
        const q = project(camera, [ripple.x + radius * Math.cos(a), ripple.y + radius * Math.sin(a), 0]);
        if (i === 0) arc.moveTo(q.x, q.y); else arc.lineTo(q.x, q.y);
      }
      arc.closePath();
      ctx.save();
      ctx.clip(arc);
      ctx.globalAlpha = fade;
      reflect(drift + (heavy ? 15 : 4) * fade, (heavy ? -8 : -2) * fade);
      ctx.restore();
      ctx.lineWidth = (heavy ? 3.6 : 1.1) * fade;
      ctx.strokeStyle = heavy ? look.foam : look.sky;
      ctx.globalAlpha = 0.55 * fade;
      if (heavy) {
        const glint = new Path2D();
        for (let j = 0; j <= 2; j++) {
          const start = (j + k * 0.28) * 2.1;
          for (let i = 0; i <= 16; i++) {
            const a = start + i / 16 * 1.3;
            const q = project(camera, [ripple.x + radius * Math.cos(a), ripple.y + radius * Math.sin(a), 0]);
            if (i === 0) glint.moveTo(q.x, q.y); else glint.lineTo(q.x, q.y);
          }
          for (let i = 16; i >= 0; i--) {
            const a = start + i / 16 * 1.3;
            const inner = radius * (1 - 0.19 * Math.sin(i / 16 * Math.PI));
            const q = project(camera, [ripple.x + inner * Math.cos(a), ripple.y + inner * Math.sin(a), 0]);
            glint.lineTo(q.x, q.y);
          }
          glint.closePath();
        }
        ctx.fillStyle = look.warm;
        ctx.globalAlpha = 0.86 * fade;
        ctx.fill(glint);
      }
      ctx.stroke(arc);
      ctx.globalAlpha = 1;
    }
  }
  ctx.fillStyle = mixHex(look.cloud, look.hedge, 0.62);
  ctx.globalAlpha = 0.38;
  ctx.fillRect(0, top - 2, camera.width, height + 4);
  ctx.strokeStyle = look.bankWet;
  for (let i = 1; i <= 3; i++) {
    ctx.lineWidth = i * 2.4;
    ctx.globalAlpha = 0.18;
    ctx.stroke(path(0, 0));
  }
  ctx.restore();
};
