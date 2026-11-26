/**
 * 第 7–9 镜（转）的全片装配预演（#185）：真机位、正式麻雀设定的关键姿势停格（blocking，不补中间画）、已有烘焙底图。
 * 第 7 镜长焦近景，三次甩水由小到大并在第 76 帧蓬成圆球、第 88 帧眨眼；
 * 第 8 镜极慢推近晒太阳，底图从 closeup-s8-start 过渡到 closeup-s8-end，麻雀状态从蓬松湿圆球逐步晒干到低夕光干羽；
 * 第 9 镜特写，麻雀睁眼、抬头看向画右上方的光、眼中亮起光点、挪脚并清楚回应远处同伴。
 * 待定事项：正式中间画、拖影与飞溅水珠特效由 #189 替换。
 */
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { hold, mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, pole, poleAt, shotCameras, sun, sunLow } from "../../scene.ts";
import {
  drawSparrow,
  mixSparrowLight,
  restPose,
  sparrowLight,
  sparrowPoses,
  sparrowStates,
  transitionSparrowState,
} from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import { drawViewPlate, placeSparrow, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, darkestByMood } from "../../tokens.ts";
import {
  S07_BLINK,
  S07_PUFF,
  S07_SHAKE_1,
  S07_SHAKE_2,
  S07_SHAKE_3,
  s07CameraProgress,
  s07Timing,
  S08_BLINK_1,
  S08_BLINK_2,
  S08_DURATION,
  s08CameraProgress,
  s08Timing,
  S09_CALL_CLEAR,
  S09_CLAW_SHIFT,
  S09_EYE_OPEN,
  S09_LOOK_START,
  S09_LOOK_UP,
  s09CameraProgress,
  s09Timing,
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

const mixVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => {
  const x = mix(a[0], b[0], t);
  const y = mix(a[1], b[1], t);
  const z = mix(a[2], b[2], t);
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

const viewYawForAzimuth = (camera: Camera, target: Vec3, azimuthRad: number) => {
  const bearing = Math.atan2(target[0] - camera.position[0], target[1] - camera.position[1]);
  return azimuthRad - bearing - Math.PI / 2;
};

const s07StartCam: Camera = {
  ...shotCameras.s7,
  position: [1.07, 1.83, 1.735],
  pitch: deg(6.3),
  focal: 75,
};
const s07EndCam: Camera = {
  ...shotCameras.s7,
  position: [1.07, 1.83, 1.74],
  pitch: deg(6.3),
  focal: 80,
};

const s07CameraAt = (frame: number): Camera =>
  mixCamera(s07StartCam, s07EndCam, s07CameraProgress(frame));

type S07Beat = { pose: Pose; drawing: number };

const wetSide: Pose = {
  ...restPose,
  ...sparrowStates.wet,
  bodyPitch: 0.36,
  crouch: 0.14,
  headPitch: -0.06,
  eyeOpen: 0.85,
  glint: 0.65,
};

const ruffledBall: Pose = {
  ...restPose,
  ...sparrowStates.ruffled,
  bodyPitch: 0.44,
  crouch: 0.08,
  headPitch: 0.04,
  eyeOpen: 1.12,
  glint: 0.72,
};

const s07Beats: readonly [number, S07Beat][] = [
  [0, { pose: wetSide, drawing: 1 }],
  [
    S07_SHAKE_1[0],
    {
      pose: { ...wetSide, headRoll: 0.32, headYaw: 0.25, eyeOpen: 0.22 },
      drawing: 2,
    },
  ],
  [
    S07_SHAKE_1[1],
    {
      pose: { ...wetSide, headRoll: -0.32, headYaw: -0.22, eyeOpen: 0.22 },
      drawing: 3,
    },
  ],
  [S07_SHAKE_1[1] + 4, { pose: { ...wetSide, ruffle: 0.15 }, drawing: 4 }],
  [
    S07_SHAKE_2[0],
    {
      pose: { ...wetSide, ruffle: 0.4, crouch: 0.22, headRoll: 0.38, wingSpread: 0.14, eyeOpen: 0.18 },
      drawing: 5,
    },
  ],
  [
    S07_SHAKE_2[2],
    {
      pose: { ...wetSide, ruffle: 0.5, crouch: 0.24, headRoll: -0.4, wingSpread: 0.18, eyeOpen: 0.18 },
      drawing: 6,
    },
  ],
  [S07_SHAKE_2[3] + 4, { pose: { ...wetSide, ruffle: 0.35 }, drawing: 7 }],
  [
    S07_SHAKE_3[0],
    {
      pose: { ...wetSide, ruffle: 0.85, crouch: 0.3, headRoll: 0.45, wingSpread: 0.3, wingFlap: 0.2, eyeOpen: 0.1 },
      drawing: 8,
    },
  ],
  [
    S07_SHAKE_3[4],
    {
      pose: { ...wetSide, ruffle: 0.95, crouch: 0.26, headRoll: -0.45, wingSpread: 0.32, wingFlap: -0.15, eyeOpen: 0.1 },
      drawing: 9,
    },
  ],
  [S07_PUFF, { pose: ruffledBall, drawing: 10 }],
  [S07_BLINK, { pose: { ...ruffledBall, eyeOpen: 0, eyeClosedCurve: 0.7 }, drawing: 11 }],
  [S07_BLINK + 4, { pose: { ...ruffledBall, eyeOpen: 1 }, drawing: 12 }],
];

const drawS07 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s07CameraAt(frame);

  ctx.fillStyle = closeup.s7.skyWarm;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "closeup-s7"), "closeup-s7", camera);

  const beat = hold(frame, s07Beats);
  drawPole(ctx, camera, { state: "dusk", drawing: beat.drawing, drops: 3 });

  const pt = poleAt(perchT);
  const feet: Vec3 = [pt[0], pt[1], pt[2] + pole.radius];
  const place = placeSparrow(camera, feet, 0, sun);
  const contact = poleScreen(camera, perchT);
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = darkestByMood.dusk;
  ctx.beginPath();
  ctx.ellipse(
    contact.x,
    contact.y - pole.radius * contact.scale * 0.55,
    place.ppu * 0.88,
    pole.radius * contact.scale * 0.35,
    -0.08,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();

  const yaw = viewYawForAzimuth(camera, feet, deg(68));
  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw,
      pitch: place.pitch,
      lighting: sparrowLight("dusk", place.light),
      drawing: beat.drawing,
      seed: 18507,
    },
    beat.pose,
  );
};

export const s07: Shot<Surface> = {
  ...s07Timing,
  post: {},
  draw: drawS07,
};

const s08StartCam: Camera = {
  ...shotCameras.s8,
  position: [1.6, 2.62, 1.755],
  pitch: deg(5.5),
  focal: 100,
};
const s08EndCam: Camera = {
  ...shotCameras.s8,
  position: [1.6, 2.62, 1.762],
  yaw: deg(-70.4),
  pitch: deg(5.7),
  focal: 108,
};

const s08CameraAt = (frame: number): Camera =>
  mixCamera(s08StartCam, s08EndCam, s08CameraProgress(frame));

type S08Beat = { pose: Pose; drawing: number };

const s08Early: Pose = {
  ...sparrowPoses.sunbathe,
  ...transitionSparrowState(sparrowStates.ruffled, sparrowStates.dry, 0.12),
  eyeOpen: 0.45,
};

const s08Mid: Pose = {
  ...sparrowPoses.sunbathe,
  ...transitionSparrowState(sparrowStates.ruffled, sparrowStates.dry, 0.56),
  puff: 0.14,
  eyeOpen: 0.44,
};

const s08Dry: Pose = {
  ...sparrowPoses.sunbathe,
  ...sparrowStates.dry,
  puff: 0.12,
  eyeOpen: 0.46,
  glint: 0.62,
};

const s08Beats: readonly [number, S08Beat][] = [
  [0, { pose: s08Early, drawing: 1 }],
  [S08_BLINK_1, { pose: { ...s08Mid, eyeOpen: 0, eyeClosedCurve: 0.72 }, drawing: 2 }],
  [S08_BLINK_1 + 4, { pose: s08Mid, drawing: 3 }],
  [S08_BLINK_2, { pose: { ...s08Dry, eyeOpen: 0, eyeClosedCurve: 0.72 }, drawing: 4 }],
  [S08_BLINK_2 + 4, { pose: s08Dry, drawing: 5 }],
];

const drawS08 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s08CameraAt(frame);
  const tLight = progress(frame, 0, S08_DURATION - 1);

  ctx.fillStyle = closeup.s8Start.bokehMid;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "closeup-s8-start"), "closeup-s8-start", camera);
  if (tLight > 0.001) {
    ctx.save();
    ctx.globalAlpha = tLight;
    drawViewPlate(ctx, viewImage(surface, "closeup-s8-end"), "closeup-s8-end", camera);
    ctx.restore();
  }

  const beat = hold(frame, s08Beats);
  drawPole(ctx, camera, { state: "dusk", drawing: beat.drawing, drops: 1 });

  const pt = poleAt(perchT);
  const feet: Vec3 = [pt[0], pt[1], pt[2] + pole.radius];
  const sunNow = mixVec3(sun, sunLow, tLight);
  const place = placeSparrow(camera, feet, 0, sunNow);
  const yaw = viewYawForAzimuth(camera, feet, deg(25));

  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw,
      pitch: place.pitch,
      lighting: mixSparrowLight("dusk", "lowDusk", tLight, place.light),
      drawing: beat.drawing,
      seed: 18508,
    },
    beat.pose,
  );
};

export const s08: Shot<Surface> = {
  ...s08Timing,
  post: {},
  draw: drawS08,
};

const s09StartCam: Camera = {
  ...shotCameras.s9,
  position: [1.27, 2.44, 1.79],
  yaw: deg(-49.2),
  pitch: deg(6.5),
  focal: 85,
};
const s09EndCam: Camera = {
  ...shotCameras.s9,
  position: [1.27, 2.44, 1.795],
  yaw: deg(-48.3),
  pitch: deg(6.6),
  focal: 88,
};

const s09CameraAt = (frame: number): Camera =>
  mixCamera(s09StartCam, s09EndCam, s09CameraProgress(frame));

type S09Beat = { pose: Pose; perchShift: number; drawing: number };

const s09Beats: readonly [number, S09Beat][] = [
  [0, { pose: s08Dry, perchShift: 0, drawing: 1 }],
  [
    S09_EYE_OPEN,
    {
      pose: { ...restPose, ...sparrowStates.dry, bodyPitch: 0.46, headPitch: 0.08, eyeOpen: 1, glint: 0.72 },
      perchShift: 0,
      drawing: 2,
    },
  ],
  [
    S09_LOOK_START,
    {
      pose: { ...restPose, ...sparrowStates.dry, bodyPitch: 0.5, headPitch: 0.34, headYaw: 0.1, eyeOpen: 1, glint: 0.85 },
      perchShift: 0,
      drawing: 3,
    },
  ],
  [S09_LOOK_UP, { pose: sparrowPoses.lookUp, perchShift: 0, drawing: 4 }],
  [
    S09_CLAW_SHIFT,
    {
      pose: { ...sparrowPoses.lookUp, crouch: 0.14 },
      perchShift: 0.01,
      drawing: 5,
    },
  ],
  [
    S09_CALL_CLEAR,
    {
      pose: { ...sparrowPoses.lookUp, beakOpen: 0.42 },
      perchShift: 0.01,
      drawing: 6,
    },
  ],
  [S09_CALL_CLEAR + 8, { pose: sparrowPoses.lookUp, perchShift: 0.01, drawing: 7 }],
];

const drawS09 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s09CameraAt(frame);

  ctx.fillStyle = closeup.s9.skyWarm;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "closeup-s9"), "closeup-s9", camera);

  const beat = hold(frame, s09Beats);
  drawPole(ctx, camera, { state: "dusk", drawing: beat.drawing, drops: 0 });

  const pt = poleAt(perchT + beat.perchShift);
  const feet: Vec3 = [pt[0], pt[1], pt[2] + pole.radius];
  const place = placeSparrow(camera, feet, 0, sunLow);
  const yaw = viewYawForAzimuth(camera, feet, deg(40));

  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw,
      pitch: place.pitch,
      lighting: sparrowLight("lowDusk", place.light),
      drawing: beat.drawing,
      seed: 18509,
    },
    beat.pose,
  );
};

export const s09: Shot<Surface> = {
  ...s09Timing,
  post: {},
  draw: drawS09,
};
