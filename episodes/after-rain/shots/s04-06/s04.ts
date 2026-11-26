/**
 * 第 4 镜（承）：贴地低机位，沾泥的胶鞋从画左沿小路走进水洼 W1；最后一步踩进水洼，倒影碎开，水花溅到最高的一帧切到第 5 镜。
 * 走路用 person.ts 的泥地循环（一拍二，一步 24 帧），落脚点照 storyboard.md「镜头内的锚点」：第 3 镜第 158 帧那一脚（本镜第 −10 帧，J 切）之后 14、38 陷泥，62 踩进水洼，71 水花最高。
 * 运镜照 motion.md「镜头运动：像有人在掌机」：广角 20，跟脚步略向右摇——胶鞋入画后第 4 帧才起步，起步、匀速、停稳三段不对称，追上时略过头再回正，停稳后留残速；
 * 画面要活：水洼是实时画的一层（倒映放晴的天和云、云影慢慢漂、涟漪、被踩碎的倒影），树篱脚和泥地边的草被风吹，水洼上有几只飞虫，
 * 人的影子按太阳方向投到地面（朝镜头、偏画左拉长），脚下最暗；第 38 帧那一步左脚先踩进水洼靠岸的边（小涟漪），62 右脚踩进当中才是大的一下。
 * 待定事项：底图里的水洼和云是烘死的，这一层把水洼整个盖住，云动不了。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPerson, mudWalkPose, personRoute, placePerson } from "../../person.ts";
import { puddleW1, shotCameras, sun } from "../../scene.ts";
import { drawViewPlate, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, dusk, ink, lowYard, warm } from "../../tokens.ts";
import { frameAngle, overshoot, travel } from "./camera.ts";
import type { Phase } from "./camera.ts";
import { drawPuddle, insidePuddle } from "./puddle.ts";
import type { Ripple } from "./puddle.ts";
import { drawSplash } from "./splash.ts";
import { S04_MUD_STEPS, S04_POSE_OFFSET, S04_PUDDLE_STEP, S04_STEP_FRAMES, s04Timing } from "./timing.ts";
import { alongPath, drawGrass, drawPersonShadow, legFrame, makeTufts, mixHex, planWalk, toWorld } from "./walk.ts";
import type { LegFrame } from "./walk.ts";

const deg = (v: number) => (v * Math.PI) / 180;

const S04_PAN: Phase = [4, 16, 40, 62];
const S04_BASE: Camera = { ...shotCameras.s4 };
const S04_START_YAW = deg(-29.0);

const s04CameraAt = (frame: number): Camera => {
  const t = travel(frame, S04_PAN, 0.0015);
  const camera: Camera = { ...S04_BASE, yaw: S04_START_YAW + (S04_BASE.yaw - S04_START_YAW) * t };
  camera.yaw += frameAngle(camera, 0.012) * overshoot(frame, 58, 68);
  return camera;
};

const S04_WALK_DIR = Math.atan2(puddleW1.x - personRoute.courtyard[1][0], puddleW1.y - personRoute.courtyard[1][1]);
const S04_PATH_BACK = 1.64;
const S04_PATH_BASE: Vec3 = [puddleW1.x - Math.sin(S04_WALK_DIR) * S04_PATH_BACK, puddleW1.y - Math.cos(S04_WALK_DIR) * S04_PATH_BACK, 0];
const S04_WALK_OPTIONS = { stepFrames: S04_STEP_FRAMES, seed: 181, muddy: 1, basketSide: -1 as const };
const s04PoseAt = (frame: number) => mudWalkPose(frame + S04_POSE_OFFSET, S04_WALK_OPTIONS);
const S04_WALK = planWalk({
  ...S04_WALK_OPTIONS,
  poseOffset: S04_POSE_OFFSET,
  count: 4,
  starts: 0,
  poseAt: s04PoseAt,
  known: { index: (S04_PUDDLE_STEP + S04_POSE_OFFSET) / S04_STEP_FRAMES, pos: S04_PATH_BACK },
});

const S04_PUDDLE_LOOK = {
  bank: mixHex(lowYard.shadow, lowYard.mudS4, 0.45),
  bankWet: mixHex(lowYard.shadow, lowYard.mudS4, 0.15),
  hedge: mixHex(lowYard.hedge, lowYard.shadow, 0.25),
  sky: lowYard.puddleSky,
  warm: mixHex(closeup.s5.skyWarm, lowYard.puddleSky, 0.35),
  cloud: mixHex(closeup.s5.cloudCool, dusk.cloud.shadow, 0.34),
  foam: warm.dropHighlight,
};

const S04_SPLASH_LOOK = {
  lit: mixHex(lowYard.puddleSky, warm.dropHighlight, 0.35),
  warm: mixHex(closeup.s5.skyWarm, warm.rim, 0.5),
  shade: mixHex(closeup.s5.cloudCool, dusk.cloud.shadow, 0.5),
  foam: warm.dropHighlight,
  ink: ink.color,
};

const S04_GRASS = {
  blade: lowYard.hedge,
  lit: dusk.paddyLit[0],
  dark: mixHex(lowYard.hedge, dusk.shadowTeal, 0.42),
};

const hedgeSpots: [number, number][] = Array.from({ length: 18 }, (_, k) => {
  const x = -14 + k * 0.82 + (hash(1884, k, 2) - 0.5) * 0.5;
  return [x, 10.72 + hash(1884, k, 3) * 0.22];
});
const S04_HEDGE_GRASS = makeTufts(1884, hedgeSpots, [0.12, 0.3]);
const S04_MID_GRASS = makeTufts(
  1885,
  [[-3.6, 6.4], [-2.9, 7.1], [-2.4, 8.3], [-3.9, 8.9], [-4.8, 7.6], [-3.0, 9.6], [-1.2, 9.0], [-2.6, 4.9], [-1.1, 5.75], [-1.35, 6.3], [-3.3, 5.6]],
  [0.07, 0.16],
);
const S04_NEAR_GRASS = makeTufts(1886, [[-2.0, 4.25], [-2.15, 4.33], [-2.35, 4.62]], [0.06, 0.12]);

const MIDGES = Array.from({ length: 6 }, (_, k) => ({
  x: puddleW1.x - 0.42 + hash(1887, k, 1) * 0.84,
  y: puddleW1.y - 0.22 + hash(1887, k, 2) * 0.5,
  z: 0.08 + hash(1887, k, 3) * 0.3,
  phase: hash(1887, k, 4) * 60,
  radius: 1.1 + hash(1887, k, 5) * 0.9,
}));

const drawMidges = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  ctx.save();
  ctx.fillStyle = ink.color;
  for (const m of MIDGES) {
    const t = frame + m.phase;
    const p = project(camera, [
      m.x + Math.sin(t * 0.37) * 0.09 + Math.sin(t * 0.13 + 2) * 0.06,
      m.y + Math.cos(t * 0.29 + 1) * 0.05,
      m.z + Math.sin(t * 0.53) * 0.04 + Math.cos(t * 0.19) * 0.03,
    ]);
    if (p.depth < 0.3) continue;
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 1.7);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, m.radius, m.radius * 0.7, Math.sin(t) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const soleCenter = (leg: LegFrame, origin: Vec3): Vec3 =>
  toWorld([(leg.heel[0] + leg.toe[0]) / 2, (leg.heel[1] + leg.toe[1]) / 2, 0], origin, S04_WALK_DIR);

const drawS04 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s04CameraAt(frame);
  const drawing = Math.floor((frame + S04_POSE_OFFSET) / 2) + 1;

  ctx.fillStyle = lowYard.skyS4;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "low-s4"), "low-s4", camera);

  drawGrass(ctx, camera, S04_HEDGE_GRASS, frame, S04_GRASS);
  drawGrass(ctx, camera, S04_MID_GRASS, frame, S04_GRASS);

  const pose = s04PoseAt(frame);
  const origin = alongPath(S04_PATH_BASE, S04_WALK_DIR, S04_WALK.originAt(frame, pose));
  const left = legFrame(pose, 1);
  const right = legFrame(pose, -1);
  const leftSole = soleCenter(left, origin);
  const rightSole = soleCenter(right, origin);
  const stepSole = rightSole;
  const stepAge = frame - S04_PUDDLE_STEP;

  const ripples: Ripple[] = [
    { frame: 7, x: puddleW1.x - 0.21, y: puddleW1.y + 0.05 },
    { frame: 29, x: puddleW1.x + 0.19, y: puddleW1.y - 0.06 },
    { frame: 47, x: puddleW1.x - 0.04, y: puddleW1.y + 0.11 },
  ];
  if (insidePuddle(leftSole[0], leftSole[1])) {
    ripples.push({ frame: S04_MUD_STEPS[1], x: leftSole[0], y: leftSole[1], rings: 2, speed: 0.2, life: 0.7 });
  }
  if (stepAge >= 0) {
    ripples.push({ frame: S04_PUDDLE_STEP, x: stepSole[0], y: stepSole[1], rings: 3, speed: 0.42, life: 1.1 });
  }
  const puddleState = {
    frame,
    drawing,
    look: S04_PUDDLE_LOOK,
    ripples,
    shatter: stepAge >= 0 ? { frame: S04_PUDDLE_STEP, x: stepSole[0], y: stepSole[1], strength: 1 } : undefined,
  };
  drawPuddle(ctx, camera, puddleState);

  drawPersonShadow(ctx, camera, pose, origin, S04_WALK_DIR, { color: lowYard.shadow, drawing, alpha: 0.62 });

  if (stepAge >= 0) {
    drawSplash(ctx, camera, { frame, drawing, sole: stepSole, azimuth: S04_WALK_DIR, look: S04_SPLASH_LOOK, layer: "back" });
  }

  const placed = placePerson(camera, origin, S04_WALK_DIR, "dusk", sun);
  drawPerson(ctx, { ...placed, drawing, seed: 18504 }, pose);

  const wet = [left, right].filter((leg) => leg.onGround && insidePuddle(soleCenter(leg, origin)[0], soleCenter(leg, origin)[1]));
  if (wet.length) {
    const nearest = Math.max(...wet.map((leg) => project(camera, soleCenter(leg, origin)).y));
    drawPuddle(ctx, camera, { ...puddleState, frontFromY: nearest - 3 });
  }

  if (stepAge >= 0) {
    drawSplash(ctx, camera, { frame, drawing, sole: stepSole, azimuth: S04_WALK_DIR, look: S04_SPLASH_LOOK, layer: "front" });
  }

  drawGrass(ctx, camera, S04_NEAR_GRASS, frame, S04_GRASS);
  drawMidges(ctx, camera, frame);
};

export const s04: Shot<Surface> = {
  ...s04Timing,
  post: {},
  draw: drawS04,
};
