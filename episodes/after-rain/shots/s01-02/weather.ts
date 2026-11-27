/** 起段的逐帧雨景。雨带随风掠过各自的景深平面，檐流和地面的落点用烘焙老屋的参考机位定位。 */
import { focalPx, layer, project } from "../../../../src/kit/engine/camera.ts";
import type { Camera } from "../../../../src/kit/engine/camera.ts";
import { hash, noise1 } from "../../../../src/kit/engine/random.ts";
import {
  house,
  puddleW1,
  shotCameras,
  viewPlates,
  yardPuddlesWorld,
} from "../../scene.ts";
import { houseRain, rain } from "../../tokens.ts";

const tau = Math.PI * 2;
const ranges = [
  [18, 36, 610],
  [6, 16, 240],
  [3.6, 7, 50],
] as const;
const makeStorm = (seed: number) =>
  ranges.map(([near, far, count], plane) =>
    Array.from({ length: Math.round(count * 1.6) }, (_, i) => {
      const rand = (n: number) => hash(seed + plane, i, n);
      const size = rand(0) ** 2;
      return {
        depth: near + (far - near) * rand(1),
        x: rand(2),
        phase: rand(3),
        size,
        speed: (2 + 7 * size) * (0.85 + 0.3 * rand(4)),
        keep: rand(5),
        shine: 0.8 + 0.4 * rand(6),
      };
    }),
  );
const storms = [makeStorm(18701), makeStorm(18702)];

export const drawRainPlane = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frame: number,
  close: boolean,
  plane: number,
  amount: number,
) => {
  const reference = close ? shotCameras.s2Start : shotCameras.s1Start;
  const sign = close ? -1 : 1;
  const f = focalPx(reference);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = rain.cloud.edge;
  for (const drop of storms[+close][plane]) {
    const t = layer(reference, camera, drop.depth);
    const step = ((f / drop.depth) * drop.speed) / 24;
    const travel = drop.phase * 1450 + step * frame;
    const y = (travel % 1450) - 150;
    const cycle = Math.floor(travel / 1450);
    const x =
      ((drop.x * 2600 +
        hash(187, cycle, Math.floor(drop.phase * 12345)) * 2600) %
        2600) -
      350 +
      sign * y * 0.123;
    const px = x * t.scale + t.dx,
      py = y * t.scale + t.dy;
    const length = step * t.scale * 0.5;
    if (
      px < -60 ||
      px > camera.width + 60 ||
      py < 0 ||
      py - length > camera.height
    )
      continue;
    const gust = noise1(x / 580 - (sign * frame) / 65 + plane * 0.31, 187);
    const visibility = Math.min(
      1,
      Math.max(0, ((amount / 1.6) * (0.55 + gust * 0.62) - drop.keep) * 8),
    );
    if (!visibility) continue;
    ctx.globalAlpha =
      visibility * drop.shine * (0.22 + 0.09 * plane) * (0.7 + drop.size * 0.5);
    ctx.lineWidth = Math.max(
      1.0 + plane * 0.42,
      ((f * t.scale) / drop.depth) * (0.0012 + drop.size * 0.0035),
    );
    ctx.beginPath();
    ctx.moveTo(px - sign * length * 0.123, py - length);
    ctx.lineTo(px, py);
    ctx.stroke();
    if (plane === 2 && drop.size > 0.75) {
      ctx.globalAlpha *= 0.22;
      ctx.lineWidth *= 2.8;
      ctx.stroke();
    }
  }
  ctx.restore();
};

const plate = viewPlates.find((p) => p.id === "house-front-rain")!;
const reference = plate.reference;
const gutterCount = 58;
const gutters = Array.from({ length: gutterCount }, (_, i) => {
  const u = (i + 0.73) / gutterCount;
  const x = house.xMax + 0.68 - (house.xMax - house.xMin + 1.36) * u;
  const z =
    house.eaveZ -
    0.02 -
    Math.sin(Math.PI * u) * 0.11 +
    (noise1((1 - u) * 5.2, 728) - 0.5) * 0.03;
  return project(reference, [x, house.eaveY, z]);
});
const pools = [
  ...yardPuddlesWorld,
  puddleW1,
  { x: 3.9, y: 1.97, rx: 1.1, ry: 0.34 },
  { x: 0.6, y: 2.3, rx: 0.8, ry: 0.3 },
  { x: -1.7, y: 1.83, rx: 0.65, ry: 0.24 },
].map((p) => {
  const c = project(reference, [p.x, p.y, 0]);
  return {
    c,
    rx: Math.abs(project(reference, [p.x + p.rx, p.y, 0]).x - c.x),
    ry: Math.abs(project(reference, [p.x, p.y + p.ry, 0]).y - c.y),
  };
});

export const drawRunoff = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  frame: number,
) => {
  const t = layer(reference, camera, plate.distance);
  ctx.save();
  ctx.translate(t.dx, t.dy);
  ctx.scale(t.scale, t.scale);
  ctx.lineCap = "round";
  const sky = rain.cloud.edge;
  const gust = 0.04 + 0.16 * noise1(frame / 54, 187);
  gutters.forEach((g, i) => {
    const channel = hash(187, i, 5);
    const flow = i === 23 || i === 42 ? 1.6 : 0.06 + 0.85 * channel ** 2;
    const period = 12 + Math.floor(hash(187, i, 1) * 23);
    const pulseAt = (f: number) => noise1(f / (8 + period / 2) + i * 4.1, 187);
    const reachAt = (f: number) => flow * g.scale * (0.04 + 0.36 * pulseAt(f) ** 2);
    const pulse = pulseAt(frame);
    const length = reachAt(frame);
    const drift = length * gust;
    ctx.strokeStyle = sky;
    ctx.globalAlpha = (0.22 + 0.2 * pulse) * Math.min(1, 0.3 + flow);
    ctx.lineWidth = 0.7 + flow * (1.4 + pulse);
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.quadraticCurveTo(g.x, g.y + length * 0.65, g.x + drift, g.y + length);
    ctx.stroke();
    const age = (frame + i * 9) % period;
    const release = frame - age;
    const neck = reachAt(release);
    const fall = 4.9 * (age / 24) ** 2 * g.scale;
    const landingX = g.x + neck * (0.04 + 0.16 * noise1(release / 54, 187)) + fall * (gust + 0.03 * (channel - 0.5));
    ctx.lineWidth *= 0.76;
    ctx.beginPath();
    ctx.moveTo(landingX, g.y + neck + fall);
    ctx.lineTo(landingX + gust * age * 0.55, g.y + neck + fall + age * 0.55);
    ctx.stroke();
  });
  pools.forEach(({ c, rx, ry }, p) => {
    if (
      c.depth < 0.1 ||
      c.y - ry > plate.rect.y1 ||
      c.y * t.scale + t.dy - ry * t.scale > camera.height
    )
      return;
    ctx.save();
    ctx.beginPath();
    for (let s = 0; s <= 40; s++) {
      const a = (tau * s) / 40,
        rim =
          0.84 + 0.23 * noise1(Math.cos(a) * 4 + Math.sin(a) * 1.8, p + 187);
      const x = c.x + Math.cos(a) * rx * rim,
        y = c.y + Math.sin(a) * ry * rim;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.clip();
    ctx.fillStyle = houseRain.puddle;
    ctx.globalAlpha = 0.45;
    ctx.fill();
    for (let s = 0; s < 14; s++) {
      const z = (s - 7) / 7,
        xc = c.x + rx * (noise1(z * 2 + frame / 75, p) - 0.5);
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = s % 3 ? houseRain.sky : sky;
      ctx.lineWidth = Math.max(0.8, ry / 8);
      ctx.beginPath();
      ctx.moveTo(xc - rx * 0.62, c.y + ry * z);
      ctx.quadraticCurveTo(
        xc,
        c.y + ry * z + Math.sin(s + frame / 6) * 2,
        xc + rx * 0.65,
        c.y + ry * z,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 38; i++) {
      const phase = frame + Math.floor(hash(p, i, 1) * 48),
        cycle = Math.floor(phase / 23),
        age = phase % 23;
      const a = tau * hash(p + cycle, i, 2),
        r = Math.sqrt(hash(p + cycle, i, 3));
      const x = c.x + rx * r * Math.cos(a),
        y = c.y + ry * r * Math.sin(a);
      for (let j = 0; j < 2; j++) {
        const elapsed = age - j * 4;
        if (elapsed < 0) continue;
        const radius = 1 + (c.scale * 0.25 * elapsed) / 24;
        ctx.lineWidth = Math.max(0.72, c.scale * 0.004);
        ctx.globalAlpha = (1 - elapsed / 24) * (j ? 0.22 : 0.42);
        ctx.strokeStyle = j ? houseRain.sky : sky;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, Math.max(0.55, radius * 0.19), 0, a, a + 4.9);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
  const groundY = project(reference, [0, house.verandaY, 0]).y;
  for (let i = 0; i < 88; i++) {
    const phase = frame + Math.floor(hash(187, i, 3) * 37),
      age = phase % 13;
    if (age > 6) continue;
    const cycle = Math.floor(phase / 13);
    const x =
        plate.rect.x0 + hash(cycle, i, 1) * (plate.rect.x1 - plate.rect.x0),
      y = groundY + hash(cycle, i, 2) * (plate.rect.y1 - groundY);
    const rise = (6 - age) * age * 0.28;
    ctx.strokeStyle = sky;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.48 * (1 - age / 8);
    ctx.beginPath();
    ctx.moveTo(x - age * 0.62, y - rise);
    ctx.lineTo(x - age * 0.7, y - rise - 1.4);
    ctx.moveTo(x + age * 0.82, y - rise * 0.68);
    ctx.lineTo(x + age, y - rise * 0.68 - 1);
    ctx.stroke();
  }
  ctx.restore();
};
