/**
 * 第 4–6 镜（承）的全片装配预演（#185）：真机位、正式角色设定的关键姿势停格（blocking，不补中间画）、已有烘焙底图。
 * 第 4 镜贴地低机位，胶鞋从画左沿小路步进并在第 86 帧踩进水洼 W1、第 95 帧定格溅水占位剪影；
 * 第 5 镜中景麻雀受惊→大预备→蹬竿扑腾→半空停拍→掉回竹竿→差点翻过去→稳住转向画右，含竹竿物理衰减振动；
 * 第 6 镜贴地低机位停步、脚尖两小步转向画右下看麻雀、转回后沿路走远，画面顶边始终不露腰以上。
 * 待定事项：正式中间画、泥丝与溅水特效由 #188 替换。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { ease, hold, mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import {
  drawPerson,
  mudWalkPose,
  personRoute,
  placePerson,
  stopTurnPose,
} from "../../person.ts";
import type { PersonPose } from "../../person.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, pole, poleAt, puddleW1, shotCameras, sun } from "../../scene.ts";
import { drawSparrow, sparrowLight, sparrowPoses } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import { drawViewPlate, placeSparrow, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, darkestByMood, lowYard, warm } from "../../tokens.ts";
import {
  S04_MUD_PULLS,
  S04_MUD_STEPS,
  S04_PUDDLE_STEP,
  S04_SPLASH_PEAK,
  s04CameraProgress,
  s04Timing,
  S05_CALL_SMALL,
  S05_DROP,
  S05_DURATION,
  S05_FALL_BACK,
  S05_FLAPS,
  S05_FLINCH,
  S05_HUSH,
  S05_PUSH_OFF,
  S05_STEADY,
  S05_WINDUP,
  s05Timing,
  S06_DURATION,
  S06_HUM_START,
  S06_STEPS,
  S06_TOE_TURNS,
  s06Timing,
} from "./timing.ts";

const deg = (v: number) => (v * Math.PI) / 180;

const transparentHex = (hex: string) =>
  `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0)`;

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

const s04StartCam: Camera = {
  ...shotCameras.s4,
  yaw: deg(-29.0),
  pitch: deg(4.8),
  focal: 21.5,
};
const s04EndCam: Camera = {
  ...shotCameras.s4,
  yaw: deg(-26.6),
  pitch: deg(4.8),
  focal: 21.5,
};

const s04CameraAt = (frame: number): Camera =>
  mixCamera(s04StartCam, s04EndCam, s04CameraProgress(frame));

const s04WalkDir = Math.atan2(
  puddleW1.x - personRoute.courtyard[1][0],
  puddleW1.y - personRoute.courtyard[1][1],
);

const pointBeforeW1 = (distMeters: number): Vec3 => [
  puddleW1.x - Math.sin(s04WalkDir) * distMeters,
  puddleW1.y - Math.cos(s04WalkDir) * distMeters,
  0,
];

type S04Beat = { feet: Vec3; pose: PersonPose; drawing: number; splash: boolean };

const s04Beats: readonly [number, S04Beat][] = [
  [0, { feet: pointBeforeW1(1.38), pose: mudWalkPose(0, { stepFrames: 24, muddy: 1 }), drawing: 1, splash: false }],
  [S04_MUD_STEPS[0], { feet: pointBeforeW1(1.08), pose: mudWalkPose(4, { stepFrames: 24, muddy: 1 }), drawing: 2, splash: false }],
  [S04_MUD_PULLS[0], { feet: pointBeforeW1(0.92), pose: mudWalkPose(14, { stepFrames: 24, muddy: 1 }), drawing: 3, splash: false }],
  [S04_MUD_STEPS[1], { feet: pointBeforeW1(0.72), pose: mudWalkPose(28, { stepFrames: 24, muddy: 1 }), drawing: 4, splash: false }],
  [S04_MUD_PULLS[1], { feet: pointBeforeW1(0.54), pose: mudWalkPose(38, { stepFrames: 24, muddy: 1 }), drawing: 5, splash: false }],
  [S04_MUD_STEPS[2], { feet: pointBeforeW1(0.36), pose: mudWalkPose(4, { stepFrames: 24, muddy: 1 }), drawing: 6, splash: false }],
  [S04_MUD_PULLS[2], { feet: pointBeforeW1(0.18), pose: mudWalkPose(16, { stepFrames: 24, muddy: 1 }), drawing: 7, splash: false }],
  [S04_PUDDLE_STEP, { feet: pointBeforeW1(0.02), pose: mudWalkPose(26, { stepFrames: 24, muddy: 1 }), drawing: 8, splash: false }],
  [S04_SPLASH_PEAK, { feet: [puddleW1.x, puddleW1.y, 0], pose: mudWalkPose(28, { stepFrames: 24, muddy: 1 }), drawing: 9, splash: true }],
];

const drawS04 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s04CameraAt(frame);

  ctx.fillStyle = lowYard.skyS4;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "low-s4"), "low-s4", camera);

  const beat = hold(frame, s04Beats);
  const footProj = project(camera, beat.feet);

  const sx = footProj.x - footProj.scale * 0.22;
  const sy = footProj.y + footProj.scale * 0.04;
  const rx = footProj.scale * 0.34;
  const ry = footProj.scale * 0.045;
  ctx.save();
  const sGrad = ctx.createRadialGradient(sx, sy, rx * 0.1, sx, sy, rx);
  sGrad.addColorStop(0, lowYard.shadow);
  sGrad.addColorStop(1, transparentHex(lowYard.shadow));
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = sGrad;
  ctx.translate(sx, sy);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const placed = placePerson(camera, beat.feet, s04WalkDir, "dusk", sun);
  drawPerson(
    ctx,
    {
      ...placed,
      drawing: beat.drawing,
      seed: 18504,
    },
    beat.pose,
  );

  if (beat.splash || frame >= S04_PUDDLE_STEP) {
    const w = project(camera, [puddleW1.x, puddleW1.y, 0]);
    const h = beat.splash ? w.scale * 0.16 : w.scale * 0.05;
    const span = beat.splash ? w.scale * 0.32 : w.scale * 0.16;
    ctx.save();
    ctx.fillStyle = lowYard.puddleSky;
    ctx.beginPath();
    ctx.moveTo(w.x - span * 0.22, w.y + h * 0.06);
    ctx.lineTo(w.x - span * 0.05, w.y - h * 0.55);
    ctx.lineTo(w.x + span * 0.18, w.y - h * 0.35);
    ctx.lineTo(w.x + span * 0.44, w.y - h * 1.05);
    ctx.lineTo(w.x + span * 0.52, w.y - h * 0.52);
    ctx.lineTo(w.x + span * 0.85, w.y - h * 0.88);
    ctx.lineTo(w.x + span * 0.72, w.y - h * 0.22);
    ctx.lineTo(w.x + span * 0.96, w.y - h * 0.32);
    ctx.lineTo(w.x + span * 0.58, w.y + h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = warm.dropHighlight;
    for (const [dx, dy, r] of [
      [0.46, -1.16, 0.032],
      [0.92, -0.96, 0.026],
      [0.72, -1.12, 0.022],
      [1.06, -0.45, 0.024],
    ] as const) {
      ctx.beginPath();
      ctx.arc(w.x + span * dx, w.y + h * dy, Math.max(2.5, span * r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

export const s04: Shot<Surface> = {
  ...s04Timing,
  post: {},
  draw: drawS04,
};

const s05CameraAt = (frame: number): Camera => {
  const base = shotCameras.s5;
  const up =
    frame < S05_PUSH_OFF
      ? 0
      : frame < S05_DROP
        ? ease(progress(frame, S05_PUSH_OFF, S05_HUSH), 1.6, 1.8)
        : 1 - ease(progress(frame, S05_DROP, S05_FALL_BACK + 10), 1.6, 1.6);
  const drift = ease(progress(frame, 0, S05_DURATION - 1), 1.8, 1.8);
  return {
    ...base,
    pitch: base.pitch + deg(2.2 * up + 0.35 * drift),
    focal: base.focal + 1.8 * drift,
  };
};

const s05PoleBend = (frame: number) => (t: number) => {
  if (frame < S05_FALL_BACK) return 0;
  const elapsed = frame - S05_FALL_BACK;
  const weight = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  const amp = 0.03 * Math.exp(-elapsed / 12);
  return -amp * Math.cos((elapsed * Math.PI * 2) / 10) * weight;
};

type S05Beat = { pose: Pose; liftMeters: number; azimuthDeg: number; drawing: number };

const s05Beats: readonly [number, S05Beat][] = [
  [S05_FLINCH, { pose: sparrowPoses.startled, liftMeters: 0, azimuthDeg: 144, drawing: 1 }],
  [S05_WINDUP, { pose: sparrowPoses.failCrouch, liftMeters: 0, azimuthDeg: 144, drawing: 2 }],
  [S05_PUSH_OFF, { pose: sparrowPoses.failPush, liftMeters: 0.04, azimuthDeg: 132, drawing: 3 }],
  [S05_FLAPS[0], { pose: sparrowPoses.failFlapDown, liftMeters: 0.1, azimuthDeg: 120, drawing: 4 }],
  [S05_FLAPS[1], { pose: sparrowPoses.failHover, liftMeters: 0.13, azimuthDeg: 112, drawing: 5 }],
  [S05_FLAPS[2], { pose: sparrowPoses.failFlapDown, liftMeters: 0.15, azimuthDeg: 104, drawing: 6 }],
  [S05_FLAPS[3], { pose: sparrowPoses.failHover, liftMeters: 0.16, azimuthDeg: 96, drawing: 7 }],
  [S05_HUSH, { pose: sparrowPoses.failHover, liftMeters: 0.16, azimuthDeg: 92, drawing: 8 }],
  [S05_DROP, { pose: sparrowPoses.failDrop, liftMeters: 0.08, azimuthDeg: 80, drawing: 9 }],
  [S05_FALL_BACK, { pose: sparrowPoses.failTipForward, liftMeters: -0.012, azimuthDeg: 64, drawing: 10 }],
  [
    S05_FLAPS[5] + 10,
    {
      pose: { ...sparrowPoses.failRecover, wingSpread: 0.38, wingFlap: 0.35, bodyPitch: 0.52 },
      liftMeters: 0,
      azimuthDeg: 58,
      drawing: 11,
    },
  ],
  [S05_STEADY, { pose: sparrowPoses.failRecover, liftMeters: 0, azimuthDeg: 55, drawing: 12 }],
  [
    S05_CALL_SMALL,
    {
      pose: { ...sparrowPoses.failRecover, beakOpen: 0.34 },
      liftMeters: 0,
      azimuthDeg: 55,
      drawing: 13,
    },
  ],
  [S05_CALL_SMALL + 8, { pose: sparrowPoses.failRecover, liftMeters: 0, azimuthDeg: 55, drawing: 14 }],
];

const drawS05 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s05CameraAt(frame);

  ctx.fillStyle = closeup.s5.skyWarm;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "closeup-s5"), "closeup-s5", camera);

  const beat = hold(frame, s05Beats);
  const bend = s05PoleBend(frame);
  drawPole(ctx, camera, { state: "dusk", drawing: beat.drawing, bend, drops: 5 });

  const pt = poleAt(perchT);
  const poleZ = pt[2] + bend(perchT);
  const feet: Vec3 = [pt[0], pt[1], poleZ + pole.radius + beat.liftMeters];
  const place = placeSparrow(camera, feet, 0, sun);

  if (beat.liftMeters <= 0.01) {
    const contact = poleScreen(camera, perchT, bend);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = darkestByMood.dusk;
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
  }

  const yaw = viewYawForAzimuth(camera, feet, deg(beat.azimuthDeg));
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
      seed: 18505,
    },
    beat.pose,
  );
};

export const s05: Shot<Surface> = {
  ...s05Timing,
  post: {},
  draw: drawS05,
};

const s06MidCam: Camera = {
  ...shotCameras.s6,
  yaw: deg(15.2),
  pitch: deg(4.8),
  focal: 30,
};

const s06EndCam: Camera = {
  ...shotCameras.s6,
  yaw: deg(24.0),
  pitch: deg(2.2),
  focal: 36,
};

const s06CameraAt = (frame: number): Camera => {
  if (frame < S06_HUM_START) {
    return mixCamera(shotCameras.s6, s06MidCam, ease(progress(frame, 0, S06_HUM_START), 2.0, 2.0));
  }
  return mixCamera(
    s06MidCam,
    s06EndCam,
    ease(progress(frame, S06_HUM_START, S06_DURATION - 1), 1.8, 1.8),
  );
};

const s06WalkDir = Math.atan2(
  personRoute.courtyard[4][0] - personRoute.stopPoint[0],
  personRoute.courtyard[4][1] - personRoute.stopPoint[1],
);

const pointAfterStop = (distMeters: number): Vec3 => [
  personRoute.stopPoint[0] + Math.sin(s06WalkDir) * distMeters,
  personRoute.stopPoint[1] + Math.cos(s06WalkDir) * distMeters,
  0,
];

type S06Beat = { feet: Vec3; pose: PersonPose; drawing: number };

const s06Beats: readonly [number, S06Beat][] = [
  [0, { feet: personRoute.stopPoint, pose: stopTurnPose(4), drawing: 1 }],
  [S06_TOE_TURNS[0], { feet: personRoute.stopPoint, pose: stopTurnPose(14), drawing: 2 }],
  [S06_TOE_TURNS[1], { feet: personRoute.stopPoint, pose: stopTurnPose(44), drawing: 3 }],
  [S06_TOE_TURNS[2], { feet: personRoute.stopPoint, pose: stopTurnPose(64), drawing: 4 }],
  [S06_TOE_TURNS[3], { feet: personRoute.stopPoint, pose: stopTurnPose(72), drawing: 5 }],
  [S06_HUM_START, { feet: pointAfterStop(0.18), pose: stopTurnPose(76), drawing: 6 }],
  [S06_STEPS[0], { feet: pointAfterStop(0.45), pose: stopTurnPose(82), drawing: 7 }],
  [S06_STEPS[1], { feet: pointAfterStop(0.85), pose: stopTurnPose(98), drawing: 8 }],
  [S06_STEPS[2], { feet: pointAfterStop(1.22), pose: stopTurnPose(116), drawing: 9 }],
];

const drawS06 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s06CameraAt(frame);

  ctx.fillStyle = lowYard.skyS6;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "low-s6"), "low-s6", camera);

  const beat = hold(frame, s06Beats);
  const footProj = project(camera, beat.feet);

  const sx = footProj.x - footProj.scale * 0.04;
  const sy = footProj.y + footProj.scale * 0.05;
  const rx = footProj.scale * 0.26;
  const ry = footProj.scale * 0.048;
  ctx.save();
  const sGrad = ctx.createRadialGradient(sx, sy, rx * 0.12, sx, sy, rx);
  sGrad.addColorStop(0, lowYard.shadow);
  sGrad.addColorStop(1, transparentHex(lowYard.shadow));
  ctx.globalAlpha = 0.44;
  ctx.fillStyle = sGrad;
  ctx.translate(sx, sy);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const placed = placePerson(camera, beat.feet, s06WalkDir, "dusk", sun);
  drawPerson(
    ctx,
    {
      ...placed,
      drawing: beat.drawing,
      seed: 18506,
    },
    beat.pose,
  );
};

export const s06: Shot<Surface> = {
  ...s06Timing,
  post: {},
  draw: drawS06,
};
