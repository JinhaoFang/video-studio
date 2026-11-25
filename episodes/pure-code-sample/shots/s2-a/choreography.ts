/**
 * 镜头 S2「抖水起飞」A 版（#155）的时间、事件、运镜、竹竿形变与麻雀表演编排。
 * 所有函数只由局部帧号（0..143）纯确定计算：角色平时一拍二、静止姿势硬停、甩水与起飞最快区间一拍一；
 * 相机每帧缓慢连续运动，先极慢推近，起飞后略向右上方跟摇并缓缓停稳在空竹竿与夕光上；
 * 起飞轨迹按画面目标曲线反投影到 3D 空间，确保五次振翅（f80、84、88、92、96）全部清晰可见并平滑飞出画右上角。
 */
import { focalPx, project } from "../../engine/camera.ts";
import type { Camera, Vec3 } from "../../engine/camera.ts";
import { clamp01, ease, mix, progress } from "../../engine/timing.ts";
import type { PictureEvent } from "../../model.ts";
import { pole, poleAt, reference } from "../../scene.ts";
import { restPose } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import { perch } from "../placeholder.ts";

export const DURATION = 144;

export const events: readonly PictureEvent[] = [
  { frame: 6, kind: "flinch", description: "被水珠惊到后收紧一缩" },
  { frame: 10, kind: "shake", description: "第一次向右急甩头抖水" },
  { frame: 14, kind: "shake", description: "第二次向左急甩头抖水" },
  { frame: 18, kind: "shake", description: "第三次向右大甩身抖水" },
  { frame: 21, kind: "shake", description: "第四次回甩收尾甩出残水" },
  { frame: 22, kind: "puff", description: "抖干后浑身羽毛蓬成圆团" },
  { frame: 24, kind: "hush", description: "蓬起停住，故意留白静默开始" },
  { frame: 48, kind: "look_up", description: "抬头望向画右上方的夕光，眼中亮起光点" },
  { frame: 64, kind: "crouch", description: "起飞前压低身子蓄力" },
  { frame: 77, kind: "takeoff", description: "小爪蹬离竹竿跃入夕光" },
  { frame: 78, kind: "pole_spring", description: "竹竿被蹬下沉后首次猛然弹回" },
  { frame: 80, kind: "wingbeat", description: "第一次振翅下扑" },
  { frame: 84, kind: "wingbeat", description: "第二次振翅下扑" },
  { frame: 88, kind: "wingbeat", description: "第三次振翅下扑" },
  { frame: 92, kind: "wingbeat", description: "第四次振翅下扑" },
  { frame: 96, kind: "wingbeat", description: "第五次振翅下扑" },
  { frame: 96, kind: "pole_drip", description: "竹竿甩下的第一颗水珠落地" },
  { frame: 102, kind: "pole_drip", description: "竹竿甩下的第二颗水珠落地" },
  { frame: 109, kind: "pole_drip", description: "竹竿甩下的第三颗水珠落地" },
  { frame: 114, kind: "settle", description: "相机缓缓停稳在空竹竿与暖金夕光上" },
];

export const perchPoint = poleAt(perch);

const aimAt = (position: Vec3, target: Vec3, focal: number): Camera => {
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] - position[2];
  return {
    ...reference,
    position,
    yaw: Math.atan2(dx, dy),
    pitch: Math.atan2(dz, Math.hypot(dx, dy)),
    focal,
  };
};

const lerpV3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];

const unproject = (c: Camera, sx: number, sy: number, depth: number): Vec3 => {
  const cy = Math.cos(c.yaw);
  const syaw = Math.sin(c.yaw);
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  const forward: Vec3 = [syaw * cp, cy * cp, sp];
  const right: Vec3 = [cy, -syaw, 0];
  const up: Vec3 = [-syaw * sp, -cy * sp, cp];
  const f = focalPx(c);
  const qx = ((sx - c.width / 2) / f) * depth;
  const qz = ((c.height / 2 - sy) / f) * depth;
  return [
    c.position[0] + right[0] * qx + forward[0] * depth + up[0] * qz,
    c.position[1] + right[1] * qx + forward[1] * depth + up[1] * qz,
    c.position[2] + right[2] * qx + forward[2] * depth + up[2] * qz,
  ];
};

export const cameraAt = (frame: number): Camera => {
  const pushT = ease(progress(frame, 0, 74), 1.35, 1.35);
  const followMain = ease(progress(frame, 75, 114), 1.3, 2.2);
  const followTail = ease(progress(frame, 114, DURATION - 1), 0.9, 2.5);
  const follow = followMain * 0.92 + followTail * 0.08;

  const posStart: Vec3 = [perchPoint[0] - 0.14, perchPoint[1] - 1.08, perchPoint[2] + 0.065];
  const posClose: Vec3 = [perchPoint[0] - 0.12, perchPoint[1] - 0.99, perchPoint[2] + 0.068];
  const posEnd: Vec3 = [perchPoint[0] - 0.08, perchPoint[1] - 1.04, perchPoint[2] + 0.064];

  const posMid = lerpV3(posStart, posClose, pushT);
  const position = lerpV3(posMid, posEnd, follow);

  const targetStart: Vec3 = [perchPoint[0] + 0.075, perchPoint[1] + 0.02, perchPoint[2] + 0.062];
  const targetClose: Vec3 = [perchPoint[0] + 0.068, perchPoint[1] + 0.02, perchPoint[2] + 0.07];
  const targetEnd: Vec3 = [perchPoint[0] + 0.155, perchPoint[1] + 0.04, perchPoint[2] + 0.17];

  const targetMid = lerpV3(targetStart, targetClose, pushT);
  const target = lerpV3(targetMid, targetEnd, follow);

  const focal = mix(mix(59, 63.5, pushT), 60.5, follow);
  return aimAt(position, target, focal);
};

export type DrawingInfo = {
  index: number;
  poseFrame: number;
  isOnOnes: boolean;
};

const HOLD_SPANS: readonly [number, number, number][] = [
  [0, 2, 0],
  [3, 3, 1],
  [4, 5, 2],
  [6, 7, 3],
  [8, 9, 4],
  [10, 10, 5],
  [11, 11, 6],
  [12, 12, 7],
  [13, 13, 8],
  [14, 14, 9],
  [15, 15, 10],
  [16, 16, 11],
  [17, 17, 12],
  [18, 18, 13],
  [19, 19, 14],
  [20, 20, 15],
  [21, 21, 16],
  [22, 23, 17],
  [24, 27, 18],
  [28, 29, 19],
  [30, 31, 20],
  [32, 33, 21],
  [34, 37, 22],
  [38, 38, 23],
  [39, 40, 24],
  [41, 45, 25],
  [46, 47, 26],
  [48, 49, 27],
  [50, 51, 28],
  [52, 56, 29],
  [57, 61, 30],
  [62, 63, 31],
  [64, 65, 32],
  [66, 67, 33],
  [68, 71, 34],
  [72, 73, 35],
  [74, 74, 36],
  [75, 75, 37],
  [76, 76, 38],
  [77, 77, 39],
  [78, 78, 40],
  [79, 79, 41],
  [80, 80, 42],
  [81, 81, 43],
  [82, 82, 44],
  [83, 83, 45],
  [84, 84, 46],
  [85, 85, 47],
  [86, 86, 48],
  [87, 87, 49],
  [88, 88, 50],
  [89, 90, 51],
  [91, 91, 52],
  [92, 92, 53],
  [93, 94, 54],
  [95, 95, 55],
  [96, 96, 56],
  [97, 98, 57],
  [99, 100, 58],
  [101, 102, 59],
];

export const characterDrawing = (frame: number): DrawingInfo => {
  for (let i = 0; i < HOLD_SPANS.length; i++) {
    const [a, b, idx] = HOLD_SPANS[i];
    if (frame >= a && frame <= b) {
      return { index: idx, poseFrame: a, isOnOnes: a === b };
    }
  }
  return { index: 60, poseFrame: frame, isOnOnes: false };
};

export const poleDrawing = (frame: number): number => {
  if (frame < 74) return Math.floor(frame / 4);
  if (frame <= 86) return 20 + (frame - 74);
  if (frame <= 112) return 33 + Math.floor((frame - 87) / 2);
  return 46;
};

export const poleBendAmount = (frame: number): number => {
  if (frame < 5) return 0;
  if (frame < 10) {
    const k = Math.sin(progress(frame, 5, 9) * Math.PI);
    return -0.0055 * k;
  }
  if (frame < 24) {
    const t = progress(frame, 10, 23);
    return -0.004 * Math.sin((frame - 10) * 1.45) * (1 - t * 0.65);
  }
  if (frame < 63) return 0;
  if (frame < 74) {
    const c = ease(progress(frame, 63, 71), 1.1, 1.4);
    const extra = ease(progress(frame, 71, 73), 1, 1);
    return -(0.011 * c + 0.0035 * extra);
  }
  if (frame <= 76) {
    const kick = ease(progress(frame, 73, 76), 0.75, 1.3);
    return mix(-0.0145, -0.048, kick);
  }
  if (frame === 77) return -0.036;
  const dt = frame - 78;
  const decay = Math.exp(-dt * 0.095);
  const wave = Math.cos(dt * 0.72 - 1.15);
  const envelope = clamp01(1 - progress(frame, 110, 122));
  return 0.042 * decay * wave * envelope;
};

export const poleBendAt = (frame: number) => {
  const amp = poleBendAmount(frame);
  if (Math.abs(amp) < 1e-5) return undefined;
  const norm = Math.sin(Math.PI * perch) || 1;
  return (t: number) => amp * (Math.sin(Math.PI * t) / norm);
};

export type SparrowState = {
  visible: boolean;
  feet: Vec3;
  facing: number;
  roll: number;
  pose: Pose;
  smearKind: "none" | "shake" | "launch" | "wingbeat";
  smearDir: number;
  smearStrength: number;
};

type PoseFrame = {
  f: number;
  pose: Partial<Pose>;
  facing?: number;
  roll?: number;
};

const PERCHED_KEYS: readonly PoseFrame[] = [
  { f: 0, pose: { wet: 0.88, bodyPitch: 0.28, headPitch: -0.14, headYaw: 0.12, eyeOpen: 0, eyeClosedCurve: -0.75, stretch: -0.04 }, facing: 0.48, roll: 0 },
  { f: 4, pose: { wet: 0.88, bodyPitch: 0.25, headPitch: -0.2, headYaw: 0.08, eyeOpen: 0, eyeClosedCurve: -0.82, crouch: 0.18, stretch: -0.08 }, facing: 0.47, roll: -0.02 },
  { f: 6, pose: { wet: 0.88, bodyPitch: 0.19, headPitch: -0.32, headYaw: 0.02, headRoll: -0.08, eyeOpen: 0, eyeClosedCurve: -0.98, crouch: 0.48, stretch: -0.15, tailLift: 0.14 }, facing: 0.45, roll: -0.05 },
  { f: 8, pose: { wet: 0.86, bodyPitch: 0.24, headPitch: -0.16, headYaw: -0.34, headRoll: -0.22, eyeOpen: 0, eyeClosedCurve: -0.92, crouch: 0.34, stretch: -0.08, puff: 0.05 }, facing: 0.38, roll: -0.09 },
  { f: 10, pose: { wet: 0.8, bodyPitch: 0.34, headPitch: -0.05, headYaw: 0.78, headRoll: 0.44, eyeOpen: 0, eyeClosedCurve: -0.95, crouch: 0.16, stretch: 0.06, puff: 0.18, tailLift: 0.18 }, facing: 0.64, roll: 0.15 },
  { f: 12, pose: { wet: 0.72, bodyPitch: 0.31, headPitch: -0.1, headYaw: -0.22, headRoll: -0.16, eyeOpen: 0, eyeClosedCurve: -0.92, crouch: 0.22, stretch: -0.02, puff: 0.12 }, facing: 0.42, roll: -0.04 },
  { f: 14, pose: { wet: 0.62, bodyPitch: 0.35, headPitch: -0.02, headYaw: -0.82, headRoll: -0.46, eyeOpen: 0, eyeClosedCurve: -0.95, crouch: 0.14, stretch: 0.07, puff: 0.24, tailLift: 0.2 }, facing: 0.3, roll: -0.16 },
  { f: 16, pose: { wet: 0.5, bodyPitch: 0.32, headPitch: -0.06, headYaw: 0.24, headRoll: 0.18, eyeOpen: 0, eyeClosedCurve: -0.9, crouch: 0.18, stretch: 0.0, puff: 0.2 }, facing: 0.52, roll: 0.05 },
  { f: 18, pose: { wet: 0.36, bodyPitch: 0.37, headPitch: 0.0, headYaw: 0.84, headRoll: 0.45, eyeOpen: 0, eyeClosedCurve: -0.9, crouch: 0.1, stretch: 0.08, puff: 0.36, tailLift: 0.22 }, facing: 0.66, roll: 0.16 },
  { f: 20, pose: { wet: 0.2, bodyPitch: 0.36, headPitch: -0.03, headYaw: -0.44, headRoll: -0.26, eyeOpen: 0, eyeClosedCurve: -0.7, puff: 0.5, crouch: 0.08 }, facing: 0.38, roll: -0.09 },
  { f: 21, pose: { wet: 0.08, bodyPitch: 0.39, headPitch: 0.02, headYaw: -0.58, headRoll: -0.3, eyeOpen: 0, eyeClosedCurve: -0.35, puff: 0.72, crouch: 0.04 }, facing: 0.36, roll: -0.1 },
  { f: 22, pose: { wet: 0, bodyPitch: 0.44, headPitch: 0.04, headYaw: 0.04, headRoll: 0.02, eyeOpen: 0, eyeClosedCurve: 0.35, puff: 1.05, stretch: 0.05, tailLift: -0.05 }, facing: 0.48, roll: 0.01 },
  { f: 24, pose: { wet: 0, bodyPitch: 0.43, headPitch: 0.02, headYaw: 0.05, headRoll: 0, eyeOpen: 0, eyeClosedCurve: 0.45, puff: 0.94, stretch: 0, tailLift: -0.04 }, facing: 0.48, roll: 0 },
  { f: 28, pose: { wet: 0, bodyPitch: 0.43, headPitch: 0.02, headYaw: 0.06, headRoll: 0, eyeOpen: 0, eyeClosedCurve: 0.45, puff: 0.88, stretch: 0, tailLift: -0.03 }, facing: 0.48, roll: 0 },
  { f: 30, pose: { wet: 0, bodyPitch: 0.44, headPitch: 0.04, headYaw: 0.08, eyeOpen: 0.42, eyeClosedCurve: 0.45, puff: 0.72 }, facing: 0.48, roll: 0 },
  { f: 32, pose: { wet: 0, bodyPitch: 0.44, headPitch: 0.05, headYaw: 0.09, eyeOpen: 0.96, eyeClosedCurve: 0.45, puff: 0.58 }, facing: 0.49, roll: 0 },
  { f: 34, pose: { wet: 0, bodyPitch: 0.44, headPitch: 0.04, headYaw: 0.1, eyeOpen: 1, eyeClosedCurve: 0.45, puff: 0.44 }, facing: 0.49, roll: 0 },
  { f: 38, pose: { wet: 0, bodyPitch: 0.43, headPitch: 0.02, headYaw: 0.1, eyeOpen: 0.32, eyeClosedCurve: 0.5, puff: 0.34 }, facing: 0.49, roll: 0 },
  { f: 39, pose: { wet: 0, bodyPitch: 0.43, headPitch: 0.01, headYaw: 0.1, eyeOpen: 0, eyeClosedCurve: 0.55, puff: 0.3 }, facing: 0.49, roll: 0 },
  { f: 41, pose: { wet: 0, bodyPitch: 0.45, headPitch: 0.05, headYaw: 0.12, eyeOpen: 1, eyeClosedCurve: 0.5, puff: 0.2, sparkle: 0.12 }, facing: 0.49, roll: 0 },
  { f: 46, pose: { wet: 0, bodyPitch: 0.48, headPitch: 0.16, headYaw: 0.16, headRoll: -0.04, eyeOpen: 1, puff: 0.14, sparkle: 0.38 }, facing: 0.5, roll: -0.01 },
  { f: 48, pose: { wet: 0, bodyPitch: 0.55, headPitch: 0.52, headYaw: 0.2, headRoll: -0.09, eyeOpen: 1, puff: 0.1, sparkle: 0.92, tailLift: -0.08 }, facing: 0.52, roll: -0.03 },
  { f: 50, pose: { wet: 0, bodyPitch: 0.58, headPitch: 0.62, headYaw: 0.22, headRoll: -0.1, eyeOpen: 1, puff: 0.08, sparkle: 1.0, tailLift: -0.1 }, facing: 0.52, roll: -0.03 },
  { f: 57, pose: { wet: 0, bodyPitch: 0.59, headPitch: 0.64, headYaw: 0.24, headRoll: -0.11, eyeOpen: 1, puff: 0.06, sparkle: 1.0, tailLift: -0.1 }, facing: 0.52, roll: -0.03 },
  { f: 62, pose: { wet: 0, bodyPitch: 0.42, headPitch: 0.34, headYaw: 0.18, headRoll: -0.04, eyeOpen: 1, puff: 0.04, sparkle: 0.72, tailLift: 0.05 }, facing: 0.5, roll: -0.01 },
  { f: 64, pose: { wet: 0, bodyPitch: 0.28, headPitch: 0.2, headYaw: 0.14, eyeOpen: 1, crouch: 0.38, stretch: -0.05, sparkle: 0.65, tailLift: 0.14 }, facing: 0.48, roll: 0 },
  { f: 66, pose: { wet: 0, bodyPitch: 0.17, headPitch: 0.16, headYaw: 0.12, eyeOpen: 1, crouch: 0.76, stretch: -0.1, sparkle: 0.6, tailLift: 0.24 }, facing: 0.46, roll: 0.02 },
  { f: 68, pose: { wet: 0, bodyPitch: 0.11, headPitch: 0.18, headYaw: 0.12, eyeOpen: 1, crouch: 1.0, stretch: -0.14, sparkle: 0.65, tailLift: 0.32 }, facing: 0.45, roll: 0.03 },
  { f: 72, pose: { wet: 0, bodyPitch: 0.09, headPitch: 0.22, headYaw: 0.14, eyeOpen: 1, crouch: 1.06, stretch: -0.16, sparkle: 0.7, tailLift: 0.36 }, facing: 0.45, roll: 0.03 },
  { f: 74, pose: { wet: 0, bodyPitch: 0.3, headPitch: 0.24, headYaw: 0.1, eyeOpen: 1, crouch: 0.58, stretch: 0.06, sparkle: 0.6, tailLift: 0.14, wingSpread: 0.48, wingFlap: 0.72 }, facing: 0.44, roll: 0.01 },
  { f: 75, pose: { wet: 0, bodyPitch: 0.42, headPitch: 0.22, headYaw: 0.08, eyeOpen: 1, crouch: 0.14, stretch: 0.18, lift: 0.12, sparkle: 0.55, tailLift: -0.05, wingSpread: 0.85, wingFlap: 0.92 }, facing: 0.42, roll: -0.03 },
  { f: 76, pose: { wet: 0, bodyPitch: 0.48, headPitch: 0.18, headYaw: 0.06, eyeOpen: 1, crouch: 0, stretch: 0.22, lift: 0.28, sparkle: 0.5, tailLift: -0.12, wingSpread: 1.0, wingFlap: 0.68 }, facing: 0.4, roll: -0.05 },
];

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  bodyPitch: mix(a.bodyPitch, b.bodyPitch, t),
  lift: mix(a.lift, b.lift, t),
  headYaw: mix(a.headYaw, b.headYaw, t),
  headPitch: mix(a.headPitch, b.headPitch, t),
  headRoll: mix(a.headRoll, b.headRoll, t),
  puff: mix(a.puff, b.puff, t),
  wet: mix(a.wet, b.wet, t),
  crouch: mix(a.crouch, b.crouch, t),
  stretch: mix(a.stretch, b.stretch, t),
  tailLift: mix(a.tailLift, b.tailLift, t),
  wingSpread: mix(a.wingSpread, b.wingSpread, t),
  wingFlap: mix(a.wingFlap, b.wingFlap, t),
  eyeOpen: mix(a.eyeOpen, b.eyeOpen, t),
  eyeClosedCurve: mix(a.eyeClosedCurve, b.eyeClosedCurve, t),
  sparkle: mix(a.sparkle, b.sparkle, t),
  beakOpen: mix(a.beakOpen, b.beakOpen, t),
  legs: t < 0.5 ? a.legs : b.legs,
});

const evalPerched = (f: number) => {
  const first = PERCHED_KEYS[0];
  if (f <= first.f) {
    return {
      pose: { ...restPose, ...first.pose },
      facing: first.facing ?? 0.48,
      roll: first.roll ?? 0,
    };
  }
  for (let i = 1; i < PERCHED_KEYS.length; i++) {
    const a = PERCHED_KEYS[i - 1];
    const b = PERCHED_KEYS[i];
    if (f <= b.f) {
      const t = (f - a.f) / Math.max(1, b.f - a.f);
      const pa: Pose = { ...restPose, ...a.pose };
      const pb: Pose = { ...restPose, ...b.pose };
      return {
        pose: lerpPose(pa, pb, t),
        facing: mix(a.facing ?? 0.48, b.facing ?? 0.48, t),
        roll: mix(a.roll ?? 0, b.roll ?? 0, t),
      };
    }
  }
  const last = PERCHED_KEYS[PERCHED_KEYS.length - 1];
  return {
    pose: { ...restPose, ...last.pose },
    facing: last.facing ?? 0.48,
    roll: last.roll ?? 0,
  };
};

const flightWingFlap = (f: number): { flap: number; isDownstroke: boolean } => {
  if (f === 77) return { flap: 0.4, isDownstroke: false };
  if (f === 78) return { flap: 0.9, isDownstroke: false };
  if (f === 79) return { flap: 0.1, isDownstroke: true };
  const phase = (f - 80) % 4;
  if (phase === 0) return { flap: -0.78, isDownstroke: true };
  if (phase === 1) return { flap: -0.1, isDownstroke: false };
  if (phase === 2) return { flap: 0.86, isDownstroke: false };
  return { flap: 0.22, isDownstroke: true };
};

const LAUNCH_ORIGIN = (() => {
  const cam76 = cameraAt(76);
  const f76: Vec3 = [perchPoint[0], perchPoint[1], perchPoint[2] + pole.radius + poleBendAmount(76)];
  return project(cam76, f76);
})();

export const sparrowAt = (frame: number): SparrowState => {
  const { poseFrame } = characterDrawing(frame);
  if (poseFrame > 102) {
    return {
      visible: false,
      feet: perchPoint,
      facing: 0.1,
      roll: 0,
      pose: { ...restPose, legs: false },
      smearKind: "none",
      smearDir: 1,
      smearStrength: 0,
    };
  }
  if (poseFrame < 77) {
    const { pose, facing, roll } = evalPerched(poseFrame);
    const bend = poleBendAmount(poseFrame);
    const feet: Vec3 = [perchPoint[0], perchPoint[1], perchPoint[2] + pole.radius + bend];
    let smearKind: SparrowState["smearKind"] = "none";
    let smearDir = 1;
    let smearStrength = 0;
    if (frame >= 10 && frame <= 21) {
      if (frame === 10 || frame === 11) {
        smearKind = "shake";
        smearDir = 1;
        smearStrength = frame === 10 ? 1.0 : 0.72;
      } else if (frame === 13 || frame === 14) {
        smearKind = "shake";
        smearDir = -1;
        smearStrength = frame === 14 ? 1.0 : 0.7;
      } else if (frame === 17 || frame === 18) {
        smearKind = "shake";
        smearDir = 1;
        smearStrength = frame === 18 ? 0.95 : 0.65;
      } else if (frame === 20 || frame === 21) {
        smearKind = "shake";
        smearDir = -1;
        smearStrength = frame === 21 ? 0.75 : 0.5;
      }
    } else if (frame === 75 || frame === 76) {
      smearKind = "launch";
      smearDir = 1;
      smearStrength = frame === 76 ? 0.85 : 0.55;
    }
    return { visible: true, feet, facing, roll, pose, smearKind, smearDir, smearStrength };
  }

  const u = (poseFrame - 76) / 25;
  const cam = cameraAt(poseFrame);
  const depth = LAUNCH_ORIGIN.depth + 0.85 * u + 0.45 * u * u;
  const beatBobPx = -14 * Math.sin(((poseFrame - 77) * Math.PI) / 2) * (1 - 0.55 * clamp01(u));
  const sx = mix(LAUNCH_ORIGIN.x + 36, 2060, Math.pow(u, 0.9));
  const sy = mix(LAUNCH_ORIGIN.y - 112, 112, Math.pow(u, 0.82)) + beatBobPx;
  const feet = unproject(cam, sx, sy, depth);

  const { flap, isDownstroke } = flightWingFlap(poseFrame);
  const bankT = clamp01((poseFrame - 77) / 20);
  const facing = mix(0.38, 0.1, ease(bankT, 1, 1.3));
  const roll = mix(-0.08, 0.16, ease(bankT, 1.2, 1.2)) + (isDownstroke ? -0.07 : 0.05);
  const pose: Pose = {
    ...restPose,
    legs: false,
    wet: 0,
    puff: 0,
    crouch: 0,
    lift: 0.18,
    stretch: isDownstroke ? 0.14 : 0.04,
    bodyPitch: mix(0.34, 0.2, bankT) - flap * 0.08,
    headPitch: mix(0.18, 0.08, bankT),
    headYaw: 0.04,
    tailLift: -0.14 - flap * 0.08,
    wingSpread: 1.0,
    wingFlap: flap,
    eyeOpen: 1,
    sparkle: mix(0.6, 0.15, bankT),
  };
  let smearKind: SparrowState["smearKind"] = "none";
  let smearStrength = 0;
  if (poseFrame === 77) {
    smearKind = "launch";
    smearStrength = 1.0;
  } else if (isDownstroke && poseFrame <= 96) {
    smearKind = "wingbeat";
    smearStrength = mix(1.0, 0.45, clamp01((poseFrame - 79) / 18));
  }
  return {
    visible: true,
    feet,
    facing,
    roll,
    pose,
    smearKind,
    smearDir: 1,
    smearStrength,
  };
};
