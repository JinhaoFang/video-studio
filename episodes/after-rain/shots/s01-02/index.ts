/** 第 1、2 镜的正式画面。广角沿雨带推向老屋，长焦晚四帧跟随竹竿上的湿麻雀。 */
import { directionToView, focalPx } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { hash, noise1 } from "../../../../src/kit/engine/random.ts";
import { ease, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, pole, poleAt, shotCameras, sky } from "../../scene.ts";
import { drawSparrow, sparrowLight } from "../../sparrow.ts";
import {
  drawViewPlate,
  mixCamera,
  placeSparrow,
  viewImage,
} from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, darkestByMood, houseRain, rain } from "../../tokens.ts";
import { birdAt, wetHuddle } from "./acting.ts";
import {
  S01_FADE_END,
  S01_FADE_START,
  S01_LIGHTNING,
  S02_CLAW_SHIFT,
  S02_SHIVER,
  s01CameraProgress,
  s01Timing,
  s02AimCorrection,
  s02CameraProgress,
  s02Timing,
} from "./timing.ts";
import { drawRainPlane, drawRunoff } from "./weather.ts";

const deg = (v: number) => (v * Math.PI) / 180;
const footAt = (t: number, height = 0): Vec3 => {
  const [x, y, z] = poleAt(t);
  return [x, y, z + pole.radius + height];
};

export const s01: Shot<Surface> = {
  ...s01Timing,
  post: {},
  draw(surface, frame) {
    const ctx = surface.context;
    const camera = mixCamera(
      shotCameras.s1Start,
      shotCameras.s1End,
      s01CameraProgress(frame),
    );
    const amount = 1.6 - 0.2 * progress(frame, 108, 143);
    camera.pitch -= deg(1.15) * (1 - s01CameraProgress(frame));
    ctx.fillStyle = houseRain.sky;
    ctx.fillRect(0, 0, camera.width, camera.height);
    ctx.save();
    ctx.translate(frame * 0.15, 0);
    drawViewPlate(
      ctx,
      viewImage(surface, "house-sky-rain"),
      "house-sky-rain",
      camera,
    );
    ctx.restore();
    const flash = frame - S01_LIGHTNING;
    if (flash >= 0 && flash < 6) {
      const glow = ctx.createRadialGradient(740, 220, 30, 740, 220, 1140);
      glow.addColorStop(0, houseRain.lightningSky);
      glow.addColorStop(1, "transparent");
      ctx.save();
      ctx.globalAlpha = [0.15, 0.46, 0.55, 0.34, 0.16, 0.06][flash];
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, camera.width, camera.height);
      ctx.restore();
    }
    drawRainPlane(ctx, camera, frame, false, 0, amount);
    drawViewPlate(
      ctx,
      viewImage(surface, "house-front-rain"),
      "house-front-rain",
      camera,
    );
    drawRunoff(ctx, camera, frame);
    drawRainPlane(ctx, camera, frame, false, 1, amount);
    drawPole(ctx, camera, { state: "rain", drawing: 1, drops: 6 });
    const place = placeSparrow(camera, footAt(perchT), 0, sky);
    drawSparrow(
      ctx,
      {
        ...place,
        yaw: -Math.PI / 2 - 0.14,
        lighting: sparrowLight("rain", directionToView(camera, sky)),
        drawing: 1,
        seed: 18501,
      },
      wetHuddle,
    );
    drawRainPlane(ctx, camera, frame, false, 2, amount);
    if (frame < S01_FADE_END) {
      ctx.save();
      ctx.globalAlpha = 1 - progress(frame, S01_FADE_START, S01_FADE_END);
      ctx.fillStyle = darkestByMood.rain;
      ctx.fillRect(0, 0, camera.width, camera.height);
      ctx.restore();
    }
  },
};

const start: Camera = {
  ...shotCameras.s2Start,
  position: [0.42, 1.45, 1.81],
  pitch: deg(3.6),
};
const end: Camera = {
  ...shotCameras.s2End,
  position: [0.4, 1.55, 1.815],
  pitch: deg(3.6),
};
const closeCamera = (frame: number) => {
  const c = mixCamera(start, end, s02CameraProgress(frame));
  c.yaw +=
    deg(0.24) * s02AimCorrection(frame) +
    deg(1.51) * ease(progress(frame, S02_CLAW_SHIFT + 4, S02_CLAW_SHIFT + 28));
  c.yaw += ((noise1(frame / 68, 18702) - 0.5) * 4) / focalPx(c);
  c.pitch += ((noise1(frame / 82, 18712) - 0.5) * 2.8) / focalPx(c);
  return c;
};

const bambooSkin = (ctx: CanvasRenderingContext2D, camera: Camera) => {
  ctx.save();
  ctx.lineCap = "round";
  const knots = 14;
  for (let i = 0; i < knots; i++) {
    const from = (i + 0.28) / knots;
    const length = (0.38 + hash(187, i) * 0.47) / knots;
    const points = Array.from({ length: 12 }, (_, j) => {
      const t = from + (length * j) / 11;
      const p = poleScreen(camera, t);
      const edge = 0.48 + 0.38 * noise1(t * 90, 187);
      return { p, edge };
    });
    if (points.some(({ p }) => p.depth < 0.3)) continue;
    ctx.beginPath();
    for (const [j, { p, edge }] of points.entries()) {
      const y = p.y - pole.radius * p.scale * edge;
      if (j === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    }
    for (const { p } of points.reverse())
      ctx.lineTo(p.x, p.y - pole.radius * p.scale * 0.39);
    ctx.closePath();
    ctx.fillStyle = rain.pole;
    ctx.globalAlpha = 0.78;
    ctx.fill();
  }
  for (let i = 0; i < 520; i++) {
    const t = hash(187, i, 1),
      z = hash(187, i, 2) * 1.76 - 0.88;
    const a = poleScreen(camera, t);
    if (a.depth < 0.3 || a.x < -120 || a.x > camera.width + 120) continue;
    const b = poleScreen(camera, t + 0.0008 + hash(187, i, 3) ** 2 * 0.007);
    ctx.strokeStyle = z > 0.48 ? rain.pole : rain.poleShadow;
    ctx.globalAlpha = 0.28 + hash(187, i, 4) * 0.35;
    ctx.lineWidth = Math.max(0.8, a.scale * pole.radius * 0.034);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - z * a.scale * pole.radius);
    ctx.lineTo(b.x, b.y - z * b.scale * pole.radius + 0.7);
    ctx.stroke();
  }
  ctx.restore();
};

const featherWater = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  place: ReturnType<typeof placeSparrow>,
  featherEdge: (dx: number) => number,
) => {
  const { x, y, ppu } = place;
  const bead = (
    dx: number,
    dy: number,
    r: number,
    elongation: number,
    angle = 0,
  ) => {
    ctx.beginPath();
    ctx.ellipse(dx, dy, r, r * elongation, angle, 0, Math.PI * 2);
    ctx.fillStyle = rain.paddyWater;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      dx + r * 0.2,
      dy + r * 0.25,
      r * 0.48,
      r * 0.61,
      angle,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = rain.cloud.edge;
    ctx.fill();
  };
  ctx.save();
  for (const [ax, period, offset] of [
    [-1.36, 27, 3],
    [-0.49, 23, 15],
  ]) {
    const age = (frame + offset) % period;
    const growth = Math.min(1, (age + 1) / (period - 7));
    const fall = Math.max(0, age - period + 7);
    const dx = x + ax * ppu,
      dy = featherEdge(ax * ppu);
    if (!Number.isFinite(dy)) continue;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rain.paddyWater;
    ctx.beginPath();
    ctx.moveTo(dx + 2, dy - 8 * growth);
    ctx.lineTo(dx, dy + growth * 2);
    ctx.stroke();
    bead(
      dx,
      dy + 3 * growth + fall * fall * 1.1,
      0.8 + growth * 2.4,
      1.1 + fall * 0.15,
    );
  }
  for (let i = 0; i < 7; i++) {
    const age = frame - S02_SHIVER - (i % 3);
    if (age < 0 || age > 13) continue;
    const sign = i % 2 ? -1 : 1;
    const dx =
      x +
      ppu *
        (sign * (0.68 + hash(187, i, 6) * 0.4) +
          age * sign * (0.045 + hash(187, i, 7) * 0.06));
    const dy =
      y +
      ppu * (-0.05 - 0.4 * hash(187, i, 8) - age * 0.082 + age * age * 0.0065);
    bead(
      dx,
      dy,
      ppu * (0.012 + hash(187, i, 9) * 0.016),
      1 + Math.max(0, 4 - age) * 0.18,
      sign * 1.1,
    );
  }
  ctx.restore();
};

export const s02: Shot<Surface> = {
  ...s02Timing,
  post: {},
  draw(surface, frame) {
    const ctx = surface.context,
      camera = closeCamera(frame),
      beat = birdAt(frame);
    const amount = 1.4 - 0.4 * progress(frame, 0, 143);
    ctx.fillStyle = closeup.s2.eavesDark;
    ctx.fillRect(0, 0, camera.width, camera.height);
    ctx.save();
    ctx.translate(camera.width / 2, camera.height / 2);
    ctx.scale(1.16, 1.16);
    ctx.translate(-camera.width / 2, -camera.height / 2);
    drawViewPlate(ctx, viewImage(surface, "closeup-s2"), "closeup-s2", camera);
    ctx.restore();
    drawRainPlane(ctx, camera, frame, true, 0, amount);
    drawRainPlane(ctx, camera, frame, true, 1, amount);
    drawPole(ctx, camera, { state: "rain", drawing: 1, drops: 0 });
    bambooSkin(ctx, camera);
    const feet = footAt(perchT + beat.shift, beat.height);
    const place = placeSparrow(camera, feet, 0, sky);
    const yaw =
      deg(144) -
      Math.atan2(feet[0] - camera.position[0], feet[1] - camera.position[1]) -
      Math.PI / 2;
    const plumage = document.createElement("canvas");
    const radius = Math.ceil(place.ppu * 3);
    plumage.width = 2 * radius;
    plumage.height = 2 * radius;
    const cel = plumage.getContext("2d", { willReadFrequently: true })!;
    drawSparrow(
      cel,
      {
        ...place,
        x: radius,
        y: radius,
        yaw,
        lighting: sparrowLight("rain", directionToView(camera, sky)),
        drawing: beat.drawing,
        seed: 18502,
      },
      beat.pose,
    );
    ctx.drawImage(plumage, place.x - radius, place.y - radius);
    featherWater(ctx, frame, place, (dx) => {
      const column = cel.getImageData(
        Math.round(radius + dx),
        radius,
        1,
        radius,
      ).data;
      for (let i = radius - 1; i >= 0; i--)
        if (column[i * 4 + 3] > 128) return place.y + i;
      return NaN;
    });
    drawRainPlane(ctx, camera, frame, true, 2, amount);
  },
};
