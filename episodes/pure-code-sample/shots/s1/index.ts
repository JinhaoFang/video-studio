/**
 * 镜头 S1「雨停」（#153，对标片）：从老屋檐下往外看。雨由密到无；夕光从云缝透出，天上由太阳向外、地上由远到近扫过，
 * 照到树篱、竹竿和麻雀，麻雀背上亮起轮廓光；檐口一颗水珠长大，相机慢慢推近停到麻雀上，水珠从画外落下打中它头顶，它眼睛一闭停住。
 * 做法：同一机位画两遍（雨色一遍、夕光一遍），夕光那遍按光照遮罩盖上去；雨丝和水珠在米制场景里投影；麻雀一拍二，打中的几帧一拍一。
 * 导出名 s1 供镜头登记表使用；时间和事件在 timing.ts。
 */
import { directionToView, sky } from "../../engine/camera.ts";
import type { Camera, Vec3 } from "../../engine/camera.ts";
import { toView, viewBasis } from "../../engine/figure.ts";
import { drawing, mix, tween } from "../../engine/timing.ts";
import type { Shot } from "../../model.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { pole, poleAt, reference } from "../../scene.ts";
import { backlight, drawSparrow, restPose } from "../../sparrow.ts";
import type { Lighting, Pose } from "../../sparrow.ts";
import { drawPlate, placeSparrow } from "../../stage.ts";
import type { PlateImages, Surface } from "../../stage.ts";
import { rain as rainTone } from "../../tokens.ts";
import { perch } from "../placeholder.ts";
import { cameraProgress, DRIP_ENTER, DRIP_FALL, DRIP_HIT, LIGHT_ON_BIRD, s1Timing } from "./timing.ts";
import { drawDrop, drawEaveDrips, drawRain, drawRipples, fasciaPoint, lightMask, splash } from "./weather.ts";

const start: Camera = { ...reference, position: [-0.05, 0, 2.0], pitch: 0.075, focal: 31 };

const perchPoint = poleAt(perch);

const end: Camera = { ...reference, position: [perchPoint[0] - 0.08, perchPoint[1] - 0.95, 1.93], pitch: -0.06, focal: 50 };

const cameraAt = (frame: number): Camera => {
  const p = cameraProgress(frame);
  const lift = Math.sin(Math.PI * p) * 0.03;
  return {
    ...reference,
    position: [0, 1, 2].map((i) => mix(start.position[i], end.position[i], p) + (i === 2 ? lift : 0)) as Vec3,
    yaw: mix(start.yaw, end.yaw, p),
    pitch: mix(start.pitch, end.pitch, p),
    focal: mix(start.focal, end.focal, p),
  };
};

const rainLight = (camera: Camera): Lighting => ({
  direction: directionToView(camera, sky),
  litTint: { color: rainTone.cloud.edge, amount: 0.22 },
  shadeTint: { color: rainTone.cloud.dark, amount: 0.3 },
  threshold: 0.02,
});

const huddle: Pose = { ...restPose, wet: 0.85, puff: 0.12, crouch: 0.3, bodyPitch: 0.24, headPitch: -0.2, headYaw: 0.08, eyeOpen: 0.55 };

const k = (frame: number, value: number, leave = 1, arrive = 1) => ({ frame, value, leave, arrive });

const poseAt = (frame: number): Pose => {
  if (frame >= DRIP_HIT) {
    const t = frame - DRIP_HIT;
    const squash = t === 0 ? 1 : t === 1 ? 0.85 : 0.6;
    return {
      ...huddle,
      wet: 0.95,
      puff: 0.2,
      crouch: 0.3 + 0.25 * squash,
      headPitch: -0.22 - 0.2 * squash,
      headYaw: 0.3,
      eyeOpen: 0,
      eyeClosedCurve: 0.95,
    };
  }
  const f = drawing(frame, 2).frame;
  const turn = tween(f, [k(LIGHT_ON_BIRD - 2, 0), k(LIGHT_ON_BIRD + 12, 1, 1.4, 1.8)]);
  const shiver = f === 30 ? 0.16 : f === 32 ? 0.08 : 0;
  const blink = f === 128 || f === 130 ? 0.05 : 1;
  return {
    ...huddle,
    puff: huddle.puff + shiver,
    headYaw: mix(huddle.headYaw, 0.3, turn),
    headPitch: mix(huddle.headPitch, -0.02, turn),
    eyeOpen: mix(huddle.eyeOpen, 0.85, turn) * blink,
  };
};

const feet = (): Vec3 => [perchPoint[0], perchPoint[1], perchPoint[2] + pole.radius];

const headTop = (camera: Camera, pose: Pose) => {
  const place = placeSparrow(camera, feet(), 0.55);
  const basis = viewBasis(place.yaw, place.pitch, 0);
  const v = toView(basis, [0.85, 0, 1.38 - 0.3 * pose.crouch]);
  return { x: place.x + v[0] * place.ppu, y: place.y + v[1] * place.ppu, ppu: place.ppu };
};

const dripX = (() => {
  const head = headTop(start, huddle);
  let best = 0;
  let err = Infinity;
  for (let i = 0; i <= 400; i++) {
    const x = -2 + (4 * i) / 400;
    const e = Math.abs((fasciaPoint(start, x)?.x ?? Infinity) - head.x);
    if (e < err) {
      err = e;
      best = x;
    }
  }
  return best;
})();

const scene = (ctx: CanvasRenderingContext2D, plates: PlateImages, camera: Camera, frame: number, lit: boolean) => {
  const index = drawing(frame, 2).index;
  drawPlate(ctx, plates.far, "far", camera);
  drawPlate(ctx, plates.field, "field", camera);
  drawPlate(ctx, plates.hedge, "hedge", camera);
  drawPlate(ctx, plates.yard, "yard", camera);
  drawPole(ctx, camera, { state: lit ? "dusk" : "rain", drawing: index });
  const place = placeSparrow(camera, feet(), 0.55);
  const contact = poleScreen(camera, perch);
  ctx.save();
  ctx.fillStyle = lit ? "rgba(40, 32, 48, 0.38)" : "rgba(30, 30, 44, 0.22)";
  ctx.beginPath();
  ctx.ellipse(contact.x, contact.y - pole.radius * contact.scale * 0.55, place.ppu * 0.9, pole.radius * contact.scale * 0.35, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const pose = poseAt(frame);
  const step = frame >= DRIP_HIT && frame < DRIP_HIT + 3 ? frame : index * 2;
  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw: place.yaw,
      pitch: place.pitch,
      lighting: lit ? { ...backlight, direction: place.light } : rainLight(camera),
      drawing: step,
      seed: 153,
    },
    pose,
  );
  drawPlate(ctx, plates.eaves, "eaves", camera);
};

let litCanvas: HTMLCanvasElement | null = null;

const draw = ({ context, plates, rain }: Surface, frame: number) => {
  const camera = cameraAt(frame);
  scene(context, rain, camera, frame, false);
  if (!litCanvas) litCanvas = document.createElement("canvas");
  litCanvas.width = camera.width;
  litCanvas.height = camera.height;
  const lit = litCanvas.getContext("2d")!;
  scene(lit, plates, camera, frame, true);
  lit.globalCompositeOperation = "destination-in";
  lit.imageSmoothingEnabled = true;
  lit.imageSmoothingQuality = "high";
  lit.drawImage(lightMask(camera, frame), 0, 0, camera.width, camera.height);
  lit.globalCompositeOperation = "source-over";
  context.drawImage(litCanvas, 0, 0);
  const warmth = Math.min(1, Math.max(0, (frame - 40) / 60));
  drawRipples(context, camera, frame, warmth);
  drawEaveDrips(context, camera, frame, warmth);
  drawRain(context, camera, frame, warmth);
  const anchor = fasciaPoint(camera, dripX);
  const growth = Math.min(1, Math.max(0, (frame - 20) / (DRIP_FALL - 20)));
  if (anchor && frame < DRIP_FALL && anchor.y > -40) {
    const r = Math.max(1.5, 0.007 * anchor.scale * 32 * (0.45 + 0.55 * growth));
    drawDrop(context, anchor.x, anchor.y + r * (1.1 + growth * 0.6), r, 0.3 + growth * 0.9, warmth);
  }
  const head = headTop(camera, huddle);
  if (frame >= DRIP_ENTER && frame < DRIP_HIT) {
    const t = (frame - DRIP_ENTER + 1) / (DRIP_HIT - DRIP_ENTER + 1);
    const prev = (frame - DRIP_ENTER) / (DRIP_HIT - DRIP_ENTER + 1);
    const y = mix(-80, head.y - head.ppu * 0.15, t * t);
    const y0 = mix(-80, head.y - head.ppu * 0.15, prev * prev);
    const r = Math.max(3, head.ppu * 0.2);
    drawDrop(context, head.x, y, r, Math.min(3.2, ((y - y0) / r) * 0.3), warmth);
  }
  if (frame >= DRIP_HIT) splash(context, head.x, head.y - head.ppu * 0.1, head.ppu, frame - DRIP_HIT, warmth);
};

export const s1: Shot<Surface> = {
  ...s1Timing,
  post: { glow: 0.36, softFocus: 0.36 },
  draw,
};
