/** 长焦机位里的竹皮、脚下接触影、逆光浮尘和三阵甩水。竹纹钉在杆轴上，落杆的三颗水珠以实际碰到竹皮的那一帧分裂。 */
import { hash } from "../../../../src/kit/engine/random.ts";
import type { Camera } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { mix } from "../../../../src/kit/engine/timing.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, pole } from "../../scene.ts";
import { mixHex } from "../../tokens-sparrow.ts";
import { darkestByMood, dusk, props, rain, warm } from "../../tokens.ts";
import {
  S07_DROP_LANDS,
  S07_SHAKE_1,
  S07_SHAKE_2,
  S07_SHAKE_3,
} from "./timing.ts";

type Ctx = CanvasRenderingContext2D;
const length = Math.hypot(...pole.b.map((n, i) => n - pole.a[i]));
const nodePitch = 0.34 / length;
const skin = (c: Camera, t: number, side: number): Point => {
  const p = poleScreen(c, t);
  const next = poleScreen(c, t + 0.001);
  const a = Math.atan2(next.y - p.y, next.x - p.x);
  const ring = Math.exp(
    -(((t / nodePitch - Math.round(t / nodePitch)) * 9) ** 2),
  );
  const r =
    side * pole.radius * p.scale * (1 + 0.12 * ring) * Math.sign(Math.cos(a));
  return [p.x + Math.sin(a) * r, p.y - Math.cos(a) * r];
};
const polygon = (ctx: Ctx, pts: Point[], color: string) => {
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (const p of pts.slice(1)) ctx.lineTo(...p);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
};

export const drawPerch = (
  ctx: Ctx,
  c: Camera,
  light: number,
  shift: number,
  height: number,
  crouch: number,
) => {
  drawPole(ctx, c, { state: "dusk", drawing: 1, drops: 0 });
  const top = mixHex(props.pole.dusk.lit, props.pole.lowDusk.lit, light);
  const shade = mixHex(props.pole.dusk.shade, props.pole.lowDusk.shade, light);
  const mid = mixHex(rain.pole, top, 0.32);
  const visible = (t: number) => {
    const p = poleScreen(c, t);
    return p.depth > 0.3 && p.x > -360 && p.x < c.width + 360;
  };
  const samples = Array.from({ length: 601 }, (_, k) => k / 600).filter(
    visible,
  );
  if (samples.length < 2) return;
  const rim = (side: number, sway: number) =>
    samples.map((t) =>
      skin(c, t, side + sway * Math.sin(t * 246 + Math.sin(t * 560))),
    );
  ctx.save();
  polygon(ctx, [...rim(0.992, 0), ...rim(-0.992, 0).reverse()], shade);
  polygon(ctx, [...rim(0.992, 0), ...rim(-0.29, 0.046).reverse()], mid);
  polygon(ctx, [...rim(0.992, 0), ...rim(0.52, 0.042).reverse()], top);
  for (let k = 0; k < 2400; k++) {
    const t = hash(189, k);
    if (!visible(t)) continue;
    const side = mix(-0.93, 0.94, hash(k, 2));
    const shoulder = Math.exp(
      -((t / nodePitch - Math.round(t / nodePitch)) ** 2) * 90,
    );
    const fleck = hash(k, 6) < 0.17 + shoulder * 0.36;
    const span = fleck
      ? 0.0005 + 0.0018 * hash(k, 3)
      : 0.0005 + 0.012 * hash(k, 3) ** 3;
    const width = (fleck ? 0.066 : 0.022) * (0.22 + hash(k, 4));
    ctx.globalAlpha = 0.12 + 0.38 * hash(k, 5);
    polygon(
      ctx,
      [
        skin(c, t, side),
        skin(c, t + span * 0.27, side + width),
        skin(c, t + span, side + width * 0.36),
        skin(c, t + span * 0.58, side - width * 0.19),
      ],
      k % 3 ? rain.poleShadow : top,
    );
  }
  ctx.globalAlpha = 1;
  for (let t = nodePitch; t < 1; t += nodePitch) {
    if (!visible(t)) continue;
    const line = (off: number) =>
      Array.from({ length: 21 }, (_, i) => {
        const h = 0.98 - i * 0.098;
        return skin(c, t + off + 0.0017 * Math.sqrt(1 - h * h), h);
      });
    polygon(
      ctx,
      [...line(-0.00072), ...line(0.0001).reverse()],
      mixHex(mid, shade, 0.58),
    );
    polygon(
      ctx,
      [...line(0.0001), ...line(0.00048).reverse()],
      mixHex(mid, top, 0.65),
    );
  }
  const anchor = perchT + shift;
  const fall = (0.03 + light * 0.016) * (1 - crouch * 0.24);
  ctx.fillStyle = darkestByMood.dusk;
  for (const [offset, reach, opacity] of [
    [0, fall, 0.17],
    [-0.001, fall * 0.66, 0.19],
    [0.0014, 0.008, 0.34],
    [-0.0017, 0.007, 0.34],
  ]) {
    const t = anchor + offset;
    ctx.globalAlpha = opacity * (1 - Math.min(0.78, height * 42));
    ctx.beginPath();
    ctx.moveTo(...skin(c, t + 0.002, 0.99));
    ctx.bezierCurveTo(
      ...skin(c, t, 0.78),
      ...skin(c, t - reach * 0.44, 0.67),
      ...skin(c, t - reach, 0.52),
    );
    ctx.quadraticCurveTo(
      ...skin(c, t - reach * 0.62, 0.89),
      ...skin(c, t - reach * 0.12, 0.98),
    );
    ctx.fill();
  }
  ctx.restore();
};

export const lightInAir = (
  ctx: Ctx,
  f: number,
  shot: number,
  dx: number,
  dy: number,
) => {
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const phase = hash(shot, i) * Math.PI * 2;
    const wind = Math.sin(phase + f / (10 + 8 * hash(i, 1)));
    const x = dx + hash(shot, i, 2) * 1920 + wind * 3;
    const y = dy + hash(shot, i, 3) * 950;
    const r = 36 + 80 * hash(i, 5);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, warm.bokeh[0]);
    grad.addColorStop(0.62, warm.bokeh[0] + "b0");
    grad.addColorStop(1, warm.bokeh[0] + "00");
    ctx.globalAlpha = 0.026 + 0.016 * wind;
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (shot === 8)
    for (let i = 0; i < 6; i++) {
      const phase = hash(i, 8) * 6.28;
      const x =
        dx +
        hash(i, 9) * 1920 -
        f * (0.18 + hash(i, 3)) +
        5 * Math.sin(phase + f / 28);
      const y =
        dy + hash(i, 10) * 920 + 9 * Math.cos(phase + f / 40) - f * 0.08;
      ctx.globalAlpha = 0.18 + 0.3 * Math.sin(phase + f / 36) ** 2;
      ctx.fillStyle = warm.dropHighlight;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        1.4 + hash(i, 1),
        1 + hash(i, 2),
        phase,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  ctx.restore();
};

const showers = [S07_SHAKE_1, S07_SHAKE_2, S07_SHAKE_3].map((turns, burst) =>
  Array.from({ length: [4, 10, 32][burst] }, (_, k) => {
    const turn = k % turns.length;
    const dir = turn % 2 ? 1 : -1;
    return {
      born: turns[turn],
      dir,
      burst,
      k,
      lands: k === 0 ? S07_DROP_LANDS[burst] : null,
    };
  }),
);

export const spray = (
  ctx: Ctx,
  camera: Camera,
  frame: number,
  bird: { x: number; y: number; ppu: number },
) => {
  const { x, y, ppu } = bird;
  const bead = (bx: number, by: number, r: number, vx: number, vy: number) => {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(Math.atan2(vy, vx));
    const l = r * Math.min(3, 1.2 + Math.hypot(vx, vy) / 36);
    ctx.beginPath();
    ctx.moveTo(-l * 1.3, 0);
    ctx.bezierCurveTo(-l * 0.5, -r, l, -r * 1.3, l, 0);
    ctx.bezierCurveTo(l, r, -l * 0.36, r * 0.9, -l * 1.3, 0);
    ctx.fillStyle = dusk.shadowTeal;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(l * 0.32, -r * 0.19, l * 0.48, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fillStyle = warm.dropHighlight;
    ctx.fill();
    ctx.restore();
  };
  for (const { born, dir, burst, k, lands } of showers[0].concat(
    showers[1],
    showers[2],
  )) {
    const age = frame - born;
    if (age < 0 || age > 24) continue;
    const u = hash(7, burst, k, 1),
      v = hash(7, burst, k, 2);
    const ox =
      x + (burst === 0 ? 0.42 + 0.22 * u : dir * (0.44 + 0.54 * u)) * ppu;
    const oy = y - (burst === 0 ? 1.52 : 0.25 + 1.16 * v) * ppu;
    const gravity = 0.07 * ppu;
    let vx = dir * (0.09 + 0.21 * u) * ppu,
      vy = -(0.07 + 0.42 * v) * ppu;
    if (lands !== null) {
      const impact = skin(camera, perchT + dir * (0.021 + burst * 0.006), 0.92);
      const flight = lands - born;
      vx = (impact[0] - ox) / flight;
      vy = (impact[1] - oy) / flight - 0.5 * gravity * flight;
      if (frame >= lands) {
        const a = frame - lands;
        if (a < 4)
          for (const side of [-1, 1])
            bead(
              impact[0] + side * a * 3,
              impact[1] - a * (4 - a),
              2,
              side * 3,
              a - 2,
            );
        continue;
      }
    }
    const r = (0.011 + 0.023 * u ** 3) * ppu;
    bead(
      ox + vx * age,
      oy + vy * age + (gravity * age * age) / 2,
      r,
      vx,
      vy + gravity * age,
    );
  }
};
