/** 第 7–9 镜。固定长焦推轨或随视线上摇，竹竿、栖点和底图各按自己的深度投影；镜头内时间驱动表演与水珠。 */
import {
  focalPx,
  layer,
  type Camera,
  type Vec3,
} from "../../../../src/kit/engine/camera.ts";
import { noise1 } from "../../../../src/kit/engine/random.ts";
import { mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import {
  perchT,
  pole,
  poleAt,
  shotCameras,
  sun,
  sunLow,
  viewPlates,
  type ViewPlateId,
} from "../../scene.ts";
import { drawSparrow, mixSparrowLight } from "../../sparrow.ts";
import {
  drawViewPlate,
  placeSparrow,
  viewImage,
  type Surface,
} from "../../stage.ts";
import { closeup } from "../../tokens.ts";
import { drawPerch, lightInAir, spray } from "./atmosphere.ts";
import { baskPose, lookBeat, shakePose } from "./performance.ts";
import { S09_LOOK_START, s07Timing, s08Timing, s09Timing } from "./timing.ts";

type CloseShot = 7 | 8 | 9;
const rad = (deg: number) => (deg * Math.PI) / 180;
const cameras = {
  7: {
    base: shotCameras.s7,
    z: 1.735,
    yaw: -22.2,
    pitch: 6.3,
    track: 0.061,
    pan: 0.08,
    tilt: 0.12,
    start: -6,
    ramp: 14,
    brake: 66,
    stop: 86,
    bearing: 68,
  },
  8: {
    base: shotCameras.s8,
    z: 1.755,
    yaw: -70.4,
    pitch: 5.8,
    track: 0.029,
    pan: 0.42,
    tilt: 0.18,
    start: 0,
    ramp: 12,
    brake: 110,
    stop: 134,
    bearing: 25,
  },
  9: {
    base: shotCameras.s9,
    z: 1.79,
    yaw: -48.75,
    pitch: 8.9,
    track: 0,
    pan: 4.1,
    tilt: 0.78,
    start: S09_LOOK_START + 4,
    ramp: 8,
    brake: 60,
    stop: 82,
    bearing: 40,
  },
} as const;
const travel = (
  f: number,
  start: number,
  ramp: number,
  brake: number,
  stop: number,
) => {
  const area = (frame: number) => {
    const a = progress(frame, start, start + ramp),
      b = progress(frame, brake, stop);
    return (
      (ramp * a * a) / 2 +
      Math.max(0, Math.min(frame, brake) - start - ramp) +
      (stop - brake) * (b - (b * b) / 2)
    );
  };
  return (area(f) - area(0)) / (area(stop) - area(0));
};
const plateFor = {
  7: "closeup-s7",
  8: "closeup-s8-start",
  9: "closeup-s9",
} as const;

const draw = (shot: CloseShot, surface: Surface, frame: number) => {
  const { context: ctx } = surface;
  const spec = cameras[shot];
  const t = travel(frame, spec.start, spec.ramp, spec.brake, spec.stop);
  const az = rad(spec.yaw);
  const drift = (axis: number) =>
    2 * noise1(frame / (52 + axis * 9) + 0.36, 1890 + shot * 5 + axis) - 1;
  const pixelAngle = 2 / focalPx(spec.base);
  const camera: Camera = {
    ...spec.base,
    yaw: az + rad(spec.pan) * t + drift(1) * pixelAngle,
    pitch: rad(spec.pitch + spec.tilt * t) + drift(2) * pixelAngle,
    position: [
      spec.base.position[0] + spec.track * t * Math.sin(az),
      spec.base.position[1] + spec.track * t * Math.cos(az),
      spec.z + spec.track * t * Math.sin(rad(spec.pitch)),
    ],
  };
  const light =
    shot === 9
      ? 1
      : shot === 8
        ? progress(frame, 0, s08Timing.durationInFrames - 1)
        : 0;
  const worldLight: Vec3 = [
    mix(sun[0], sunLow[0], light),
    mix(sun[1], sunLow[1], light),
    mix(sun[2], sunLow[2], light),
  ];
  const hop = shot === 9 ? lookBeat(frame) : null;
  const shake = shot === 7 ? shakePose(frame) : null;
  const pose = hop?.pose ?? shake?.pose ?? baskPose(frame);
  const pt = poleAt(perchT + (hop?.shift ?? 0));
  const feet: Vec3 = [pt[0], pt[1], pt[2] + pole.radius + (hop?.height ?? 0)];
  const place = placeSparrow(camera, feet, 0, worldLight);
  const yaw =
    rad(spec.bearing) -
    Math.atan2(feet[0] - camera.position[0], feet[1] - camera.position[1]) -
    Math.PI / 2;
  const plateId: ViewPlateId = plateFor[shot];
  const plate = viewPlates.find((p) => p.id === plateId)!;
  const background = layer(plate.reference, camera, plate.distance);
  ctx.save();
  ctx.fillStyle = shot === 8 ? closeup.s8Start.bokehMid : closeup.s7.skyWarm;
  ctx.fillRect(0, 0, camera.width, camera.height);
  ctx.translate(camera.width / 2, camera.height / 2);
  ctx.rotate(rad(0.034) * drift(3));
  ctx.translate(-camera.width / 2, -camera.height / 2);
  ctx.save();
  if (shot === 9) {
    ctx.translate(camera.width / 2, camera.height / 2);
    ctx.scale(1.2, 1.2);
    ctx.translate(-camera.width / 2, -camera.height / 2);
  }
  const backgroundCamera =
    shot === 9
      ? {
          ...camera,
          yaw: camera.yaw - rad(2.4),
          pitch: camera.pitch - rad(2.6),
        }
      : camera;
  drawViewPlate(ctx, viewImage(surface, plateId), plateId, backgroundCamera);
  if (shot === 8)
    drawViewPlate(
      ctx,
      viewImage(surface, "closeup-s8-end"),
      "closeup-s8-end",
      camera,
      light,
    );
  ctx.restore();
  lightInAir(ctx, frame, shot, background.dx, background.dy);
  drawPerch(ctx, camera, light, hop?.shift ?? 0, hop?.height ?? 0, pose.crouch);
  drawSparrow(
    ctx,
    {
      ...place,
      yaw,
      lighting: mixSparrowLight("dusk", "lowDusk", light, place.light),
      drawing: shake?.drawing ?? 1,
      seed: 18500 + shot,
    },
    pose,
  );
  if (shot === 7) spray(ctx, camera, frame, place);
  ctx.restore();
};

export const s07: Shot<Surface> = {
  ...s07Timing,
  post: {},
  draw: (surface, frame) => draw(7, surface, frame),
};
export const s08: Shot<Surface> = {
  ...s08Timing,
  post: {},
  draw: (surface, frame) => draw(8, surface, frame),
};
export const s09: Shot<Surface> = {
  ...s09Timing,
  post: {},
  draw: (surface, frame) => draw(9, surface, frame),
};
