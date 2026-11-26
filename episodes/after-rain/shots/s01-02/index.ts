/**
 * 第 1–2 镜（起）的全片装配预演（#185）：真机位、正式角色设定的关键姿势停格（blocking，不补中间画）、已有烘焙底图。
 * 第 1 镜反向机位从树篱回看雷雨里的老屋与竹竿上的湿麻雀背影，含第 8–30 帧从雨色最暗色淡入与第 84 帧云间闪电微亮；
 * 第 2 镜长焦近景展示湿透麻雀在竹竿上张望画右、弱叫、挪脚、抬翅、寒战后缩回，首尾构图衔接 1→2 与 2→3 切点表。
 * 待定事项：正式雨丝、水滴与中间画由 #187 替换。
 */
import { directionToView } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { hold, mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, pole, poleAt, shotCameras, sky } from "../../scene.ts";
import { drawSparrow, restPose, sparrowLight } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import { drawViewPlate, placeSparrow, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, darkestByMood, houseRain } from "../../tokens.ts";
import {
  S01_FADE_END,
  S01_FADE_START,
  S01_LIGHTNING,
  s01CameraProgress,
  s01Timing,
  S02_CALL_WEAK,
  S02_CLAW_SHIFT,
  S02_GLANCE,
  S02_HUDDLE,
  S02_SHIVER,
  S02_WING_LIFT,
  s02CameraProgress,
  s02Timing,
} from "./timing.ts";

const deg = (v: number) => (v * Math.PI) / 180;

const mixCamera = (a: Camera, b: Camera, t: number): Camera => ({
  position: [
    mix(a.position[0], b.position[0], t),
    mix(a.position[1], b.position[1], t),
    mix(a.position[2], b.position[2], t),
  ],
  yaw: mix(a.yaw, b.yaw, t),
  pitch: mix(a.pitch, b.pitch, t),
  focal: mix(a.focal, b.focal, t),
  width: a.width,
  height: a.height,
});

const viewYawForAzimuth = (camera: Camera, target: Vec3, azimuthRad: number) => {
  const bearing = Math.atan2(target[0] - camera.position[0], target[1] - camera.position[1]);
  return azimuthRad - bearing - Math.PI / 2;
};

const s01CameraAt = (frame: number): Camera =>
  mixCamera(shotCameras.s1Start, shotCameras.s1End, s01CameraProgress(frame));

const wetHuddle: Pose = {
  ...restPose,
  wet: 1,
  puff: 0.08,
  crouch: 0.34,
  bodyPitch: 0.24,
  headPitch: -0.22,
  headYaw: 0.06,
  eyeOpen: 0.52,
  glint: 0.2,
};

const drawS01 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s01CameraAt(frame);

  ctx.fillStyle = houseRain.sky;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "house-sky-rain"), "house-sky-rain", camera);

  const flashDelta = Math.abs(frame - S01_LIGHTNING);
  if (flashDelta <= 4) {
    const flashAlpha = (1 - flashDelta / 5) * 0.42;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = houseRain.lightningSky;
    ctx.fillRect(0, 0, camera.width, camera.height * 0.56);
    ctx.restore();
  }

  drawViewPlate(ctx, viewImage(surface, "house-front-rain"), "house-front-rain", camera);
  drawPole(ctx, camera, { state: "rain", drawing: 1, drops: 6 });

  const pt = poleAt(perchT);
  const feet: Vec3 = [pt[0], pt[1], pt[2] + pole.radius];
  const place = placeSparrow(camera, feet, 0, sky);
  const yaw = -Math.PI / 2 - 0.14;
  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw,
      pitch: place.pitch,
      lighting: sparrowLight("rain", directionToView(camera, sky)),
      drawing: 1,
      seed: 18501,
    },
    wetHuddle,
  );

  if (frame < S01_FADE_END) {
    const reveal = frame < S01_FADE_START ? 0 : progress(frame, S01_FADE_START, S01_FADE_END);
    ctx.save();
    ctx.globalAlpha = 1 - reveal;
    ctx.fillStyle = darkestByMood.rain;
    ctx.fillRect(0, 0, camera.width, camera.height);
    ctx.restore();
  }
};

export const s01: Shot<Surface> = {
  ...s01Timing,
  post: {},
  draw: drawS01,
};

const s02StartCam: Camera = {
  ...shotCameras.s2Start,
  position: [0.42, 1.45, 1.81],
  pitch: deg(3.6),
};
const s02EndCam: Camera = {
  ...shotCameras.s2End,
  position: [0.4, 1.55, 1.815],
  pitch: deg(3.6),
};

const s02CameraAt = (frame: number): Camera =>
  mixCamera(s02StartCam, s02EndCam, s02CameraProgress(frame));

type S02Beat = { pose: Pose; perchShift: number; drawing: number };

const s02Beats: readonly [number, S02Beat][] = [
  [0, { pose: wetHuddle, perchShift: 0, drawing: 1 }],
  [
    S02_GLANCE,
    {
      pose: {
        ...wetHuddle,
        crouch: 0.16,
        bodyPitch: 0.42,
        headPitch: 0.18,
        headYaw: -0.32,
        eyeOpen: 0.92,
        glint: 0.34,
      },
      perchShift: 0,
      drawing: 2,
    },
  ],
  [
    S02_CALL_WEAK,
    {
      pose: {
        ...wetHuddle,
        crouch: 0.18,
        bodyPitch: 0.4,
        headPitch: 0.14,
        headYaw: -0.28,
        eyeOpen: 0.88,
        glint: 0.34,
        beakOpen: 0.36,
      },
      perchShift: 0,
      drawing: 3,
    },
  ],
  [
    S02_CLAW_SHIFT,
    {
      pose: {
        ...wetHuddle,
        crouch: 0.24,
        bodyPitch: 0.36,
        headPitch: 0.12,
        headYaw: -0.26,
        eyeOpen: 0.9,
        glint: 0.34,
      },
      perchShift: 0.014,
      drawing: 4,
    },
  ],
  [
    S02_WING_LIFT,
    {
      pose: {
        ...wetHuddle,
        crouch: 0.2,
        bodyPitch: 0.34,
        headPitch: 0.1,
        headYaw: -0.24,
        wingSpread: 0.24,
        wingFlap: 0.22,
        eyeOpen: 0.92,
        glint: 0.34,
      },
      perchShift: 0.014,
      drawing: 5,
    },
  ],
  [
    S02_SHIVER,
    {
      pose: {
        ...wetHuddle,
        crouch: 0.38,
        puff: 0.24,
        bodyPitch: 0.22,
        headPitch: -0.18,
        headYaw: -0.05,
        headRoll: 0.22,
        eyeOpen: 0.18,
        glint: 0.15,
      },
      perchShift: 0.014,
      drawing: 6,
    },
  ],
  [
    S02_HUDDLE,
    {
      pose: wetHuddle,
      perchShift: 0.014,
      drawing: 7,
    },
  ],
];

const drawS02 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s02CameraAt(frame);

  ctx.fillStyle = closeup.s2.eavesDark;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "closeup-s2"), "closeup-s2", camera);

  const beat = hold(frame, s02Beats);
  drawPole(ctx, camera, { state: "rain", drawing: beat.drawing, drops: 5 });

  const t = perchT + beat.perchShift;
  const pt = poleAt(t);
  const feet: Vec3 = [pt[0], pt[1], pt[2] + pole.radius];
  const place = placeSparrow(camera, feet, 0, sky);
  const contact = poleScreen(camera, t);
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = darkestByMood.rain;
  ctx.beginPath();
  ctx.ellipse(
    contact.x,
    contact.y - pole.radius * contact.scale * 0.55,
    place.ppu * 0.85,
    pole.radius * contact.scale * 0.34,
    -0.1,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  const yaw = viewYawForAzimuth(camera, feet, deg(144));
  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw,
      pitch: place.pitch,
      lighting: sparrowLight("rain", directionToView(camera, sky)),
      drawing: beat.drawing,
      seed: 18502,
    },
    beat.pose,
  );
};

export const s02: Shot<Surface> = {
  ...s02Timing,
  post: {},
  draw: drawS02,
};
