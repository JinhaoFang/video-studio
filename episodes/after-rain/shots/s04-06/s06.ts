/**
 * 第 6 镜（承）：贴地低机位。胶鞋停在泥路上，脚尖两小步转向画右下（竹竿上的麻雀），停住看一会儿，竹篮跟着轻晃；转回去，接着往前走远，哼起歌。
 * 表演用 person.ts 的 stopTurnPose，帧号从 timing.ts 的 S06_STOP_TIMING 传入（4 停步、6–10 与 14–20 转向、22–37 停住看、40–44 与 48–52 转回、54 接着走）；
 * 54 起接 20 帧一步的硬路循环（右脚先落，58、78 着地），从站定到走的两张画之间按画张插值，骨盆沿路的位置由 planWalk 定（刚着地的脚钉在地上）。
 * 运镜照 motion.md「镜头运动：像有人在掌机」：广角 28。开头是跟着脚步的摇镜的尾巴，人停住后晚 3 帧停稳；脚尖转向时极慢推近（边推边变焦，三段不对称）；
 * 人走远时略向右摇、略向下，起步比脚步晚 4 帧，追上时略过头再回正，停稳后留残速交给第 7 镜。末帧胶鞋落在切点表的 62% 附近。
 * 画面要活：树篱脚和泥地边的草被风吹，水洼的倒影随涟漪晃，夕光里有几粒尘，人的影子按太阳方向朝镜头拉长、脚下最暗。
 * 待定事项：底图里的云是烘死的，动不了。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { drawing, ease, mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPerson, personRoute, placePerson, stopTurnPose } from "../../person.ts";
import type { LegPose, PersonPose } from "../../person.ts";
import { puddleW1, shotCameras, sun } from "../../scene.ts";
import { drawViewPlate, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, dusk, lowYard, warm } from "../../tokens.ts";
import { frameAngle, overshoot, pitchForScreenY, travel, yawForScreenX } from "./camera.ts";
import { drawPuddle } from "./puddle.ts";
import type { Ripple } from "./puddle.ts";
import { S06_HUM_START, S06_POSE_OFFSET, S06_STEP_STOP, S06_STOP_TIMING, S06_STEPS, s06Timing } from "./timing.ts";
import { alongPath, drawGrass, drawPersonShadow, makeTufts, mixHex, planWalk } from "./walk.ts";

const S06_TURN_END = S06_STOP_TIMING.turnOut[1][1];
const S06_WALK_DIR = personRoute.stopAzimuth;
const S06_STOP: Vec3 = [...personRoute.stopPoint];
const S06_WALK_OPTIONS = { stepFrames: S06_STOP_TIMING.stepFrames, seed: 195, muddy: 0.3, basketSide: -1 as const };

const lerpLeg = (a: LegPose, b: LegPose, t: number): LegPose => ({
  hipPitch: mix(a.hipPitch, b.hipPitch, t),
  hipRoll: mix(a.hipRoll, b.hipRoll, t),
  kneeBend: mix(a.kneeBend, b.kneeBend, t),
  anklePitch: mix(a.anklePitch, b.anklePitch, t),
  footYaw: mix(a.footYaw, b.footYaw, t),
  cuffSwing: mix(a.cuffSwing, b.cuffSwing, t),
  mudSink: mix(a.mudSink, b.mudSink, t),
  mudPull: mix(a.mudPull, b.mudPull, t),
});

export const lerpPersonPose = (a: PersonPose, b: PersonPose, t: number): PersonPose => ({
  pelvisZ: mix(a.pelvisZ, b.pelvisZ, t),
  pelvisX: mix(a.pelvisX, b.pelvisX, t),
  pelvisY: mix(a.pelvisY, b.pelvisY, t),
  pelvisYaw: mix(a.pelvisYaw, b.pelvisYaw, t),
  pelvisRoll: mix(a.pelvisRoll, b.pelvisRoll, t),
  pelvisPitch: mix(a.pelvisPitch, b.pelvisPitch, t),
  left: lerpLeg(a.left, b.left, t),
  right: lerpLeg(a.right, b.right, t),
  basketSide: t < 0.5 ? a.basketSide : b.basketSide,
  basketSwing: mix(a.basketSwing, b.basketSwing, t),
  basketSway: mix(a.basketSway, b.basketSway, t),
  basketLift: mix(a.basketLift, b.basketLift, t),
  armSwing: mix(a.armSwing, b.armSwing, t),
  mudAmount: mix(a.mudAmount, b.mudAmount, t),
  showBasket: a.showBasket || b.showBasket,
});

const S06_STAND = stopTurnPose(S06_TURN_END, {}, S06_STOP_TIMING);

const s06PoseAt = (frame: number): PersonPose => {
  const f = drawing(frame, 2).frame;
  if (f < S06_TURN_END) return stopTurnPose(f, {}, S06_STOP_TIMING);
  const blend = ease(progress(f, S06_TURN_END, S06_STOP_TIMING.firstStep), 1.3, 1.3);
  return lerpPersonPose(S06_STAND, stopTurnPose(Math.max(f, S06_HUM_START), {}, S06_STOP_TIMING), blend);
};

const S06_WALK = planWalk({
  ...S06_WALK_OPTIONS,
  poseOffset: S06_POSE_OFFSET,
  count: 3,
  known: { index: 0, pos: -0.05 },
  starts: S06_HUM_START,
  poseAt: s06PoseAt,
});

const s06OriginAt = (frame: number, pose: PersonPose): Vec3 =>
  frame < S06_HUM_START ? S06_STOP : alongPath(S06_STOP, S06_WALK_DIR, S06_WALK.originAt(frame, pose));

const s06EndYaw = (() => {
  const feet = s06OriginAt(s06Timing.durationInFrames - 1, s06PoseAt(s06Timing.durationInFrames - 1));
  const push = travel(s06Timing.durationInFrames - 1, [12, 26, 44, 60], 0);
  const base = shotCameras.s6;
  const startPitch = pitchForScreenY(base, S06_STOP, 70);
  const forward: Vec3 = [Math.sin(base.yaw) * Math.cos(startPitch), Math.cos(base.yaw) * Math.cos(startPitch), Math.sin(startPitch)];
  const end: Camera = {
    ...base,
    position: [base.position[0] + forward[0] * 0.1 * push, base.position[1] + forward[1] * 0.1 * push, base.position[2] + forward[2] * 0.1 * push],
    focal: 28 + 1.6 * push,
    pitch: startPitch,
  };
  return yawForScreenX(end, feet, 62);
})();

const S06_BASE: Camera = { ...shotCameras.s6 };
const S06_START: Camera = {
  ...S06_BASE,
  yaw: yawForScreenX(S06_BASE, S06_STOP, 52),
  pitch: pitchForScreenY(S06_BASE, S06_STOP, 70),
};
const S06_PAN = [S06_STEPS[0] + 4, 72, 86, 95] as const;

const s06CameraAt = (frame: number): Camera => {
  const settle = travel(frame, [-22, -12, -9, S06_STEP_STOP + 3], 0);
  const push = travel(frame, [12, 26, 44, 60], 0);
  const away = travel(frame, S06_PAN, 0.0012);
  const base = S06_START;
  const pitch = base.pitch - (2.2 * Math.PI) / 180 * away;
  const forward: Vec3 = [Math.sin(base.yaw) * Math.cos(base.pitch), Math.cos(base.yaw) * Math.cos(base.pitch), Math.sin(base.pitch)];
  const camera: Camera = {
    ...base,
    position: [base.position[0] + forward[0] * 0.1 * push, base.position[1] + forward[1] * 0.1 * push, base.position[2] + forward[2] * 0.1 * push],
    pitch,
    focal: 28 + 1.6 * push,
    yaw: base.yaw + ((1.5 * Math.PI) / 180) * (1 - settle) + (s06EndYaw - base.yaw) * away,
  };
  camera.yaw += frameAngle(camera, 0.01) * overshoot(frame, S06_PAN[3] - 3, s06Timing.durationInFrames - 1);
  return camera;
};

const S06_PUDDLE_LOOK = {
  bank: mixHex(lowYard.shadow, lowYard.mudS6, 0.45),
  bankWet: mixHex(lowYard.shadow, lowYard.mudS6, 0.15),
  hedge: mixHex(lowYard.hedge, lowYard.shadow, 0.25),
  sky: mixHex(lowYard.puddleSky, lowYard.skyS6, 0.48),
  warm: mixHex(lowYard.mudGlint, lowYard.skyS6, 0.4),
  cloud: mixHex(closeup.s5.cloudCool, dusk.cloud.shadow, 0.34),
  foam: warm.dropHighlight,
};

const S06_GRASS = {
  blade: lowYard.hedge,
  lit: dusk.paddyLit[0],
  dark: mixHex(lowYard.hedge, dusk.shadowTeal, 0.42),
};

const hedgeSpots: [number, number][] = Array.from({ length: 13 }, (_, k) => {
  const x = -4.2 + k * 0.82 + (hash(1894, k, 2) - 0.5) * 0.5;
  return [x, 10.72 + hash(1894, k, 3) * 0.22];
});
const S06_HEDGE_GRASS = makeTufts(1894, hedgeSpots, [0.12, 0.3]);
const S06_MID_GRASS = makeTufts(
  1895,
  [[-2.4, 6.6], [-1.6, 7.2], [-0.6, 6.9], [0.2, 7.6], [-1.2, 8.4], [-3.2, 8.0], [0.6, 8.8], [-0.4, 9.6], [1.2, 7.4], [-2.9, 5.9], [0.4, 6.2]],
  [0.07, 0.16],
);
const S06_NEAR_GRASS = makeTufts(1896, [[-2.1, 4.3], [-1.9, 4.2], [-1.6, 4.25], [-1.4, 4.4]], [0.06, 0.13]);

const MOTES = Array.from({ length: 10 }, (_, k) => ({
  x: -2.2 + hash(1897, k, 1) * 2.4,
  y: 4.6 + hash(1897, k, 2) * 1.6,
  z: 0.25 + hash(1897, k, 3) * 0.6,
  drift: 0.004 + hash(1897, k, 4) * 0.01,
  radius: 1.0 + hash(1897, k, 5) * 1.3,
  phase: hash(1897, k, 6) * Math.PI * 2,
  alpha: 0.2 + hash(1897, k, 7) * 0.25,
}));

const drawMotes = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  const t = frame / 24;
  ctx.save();
  ctx.fillStyle = warm.dropHighlight;
  for (const m of MOTES) {
    const p = project(camera, [m.x - m.drift * t + Math.sin(t * 0.6 + m.phase) * 0.02, m.y, m.z + Math.sin(t * 0.45 + m.phase * 2) * 0.02]);
    if (p.x < 0 || p.x > camera.width || p.y < 0 || p.y > camera.height) continue;
    ctx.globalAlpha = m.alpha * (0.7 + 0.3 * Math.sin(t * 1.3 + m.phase));
    ctx.beginPath();
    ctx.arc(p.x, p.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawS06 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s06CameraAt(frame);
  const drawingIndex = Math.floor(drawing(frame, 2).frame / 2) + 1;

  ctx.fillStyle = lowYard.skyS6;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "low-s6"), "low-s6", camera);

  drawGrass(ctx, camera, S06_HEDGE_GRASS, frame, S06_GRASS);
  drawGrass(ctx, camera, S06_MID_GRASS, frame, S06_GRASS);

  const pose = s06PoseAt(frame);
  const origin = s06OriginAt(frame, pose);
  const ripples: Ripple[] = [
    { frame: 9, x: puddleW1.x - 0.18, y: puddleW1.y + 0.04 },
    { frame: 41, x: puddleW1.x + 0.2, y: puddleW1.y - 0.05 },
    { frame: 73, x: puddleW1.x - 0.02, y: puddleW1.y + 0.12 },
  ];
  drawPuddle(ctx, camera, { frame, id: "low-s6", image: viewImage(surface, "low-s6"), look: S06_PUDDLE_LOOK, ripples });

  drawPersonShadow(ctx, camera, pose, origin, S06_WALK_DIR, { color: lowYard.shadow, drawing: drawingIndex, alpha: 0.62 });

  const placed = placePerson(camera, origin, S06_WALK_DIR, "dusk", sun);
  drawPerson(ctx, { ...placed, drawing: drawingIndex, seed: 18506 }, pose);

  drawGrass(ctx, camera, S06_NEAR_GRASS, frame, S06_GRASS);
  drawMotes(ctx, camera, frame);
};

export const s06: Shot<Surface> = {
  ...s06Timing,
  post: {},
  draw: drawS06,
};
