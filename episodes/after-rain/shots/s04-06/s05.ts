/**
 * 第 5 镜（承）：中景。溅水声一响，湿透的麻雀一缩、瞪眼，压得极低憋住，蹬竿拼命扑腾，只升起约一个体长，在半空停半拍，啪地掉回竹竿；
 * 竹竿下沉再弹回，它被弹得先往前翻了差点翻过去、再往后、再往前，扑着翅膀稳住，身子转向画右（稻田），喘着气叫一小声。
 * 喜剧时机照 motion.md「起飞失败」五步，帧号都取自 timing.ts：0 受惊、4–22 大预备（16–21 停住）、22 蹬竿、24–35 四下翅拍（一拍一，越扑越慢）、
 * 36–40 升势停、40–47 同一张画停 8 帧、48–53 加速掉回（一拍一，52–53 拉长）、54 压扁停 2 帧、54–84 竹竿弹、身体前后晃（先乱扑两下再收翅）、
 * 84–108 喘气（呼吸 12 帧），94 叫一小声。关键姿势取自 sparrow.ts 的 sparrowPoses（全片装配批准过的那张表），中间画按关键帧表插值；
 * 角色一拍二，最快的几段一拍一；竹竿按衰减振动（周期由 fall_back 和 pole_spring 两个事件定，4 个来回后看不出），麻雀的脚跟着竹竿走。
 * 运镜照 motion.md「镜头运动」：标准 50，极慢推近（三段不对称）；只在它扑腾时晚半拍极轻地上摇，掉回时跟着回落、略压低再回正。
 * 画面要活：麻雀在竹竿上的影子按太阳方向画（脚下最暗、往后渐淡），每下扑腾甩出水珠、有的落到竹竿上碎开，下扑加干笔速度线，蹬竿那一帧画拖影。
 * 待定事项：无。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import { boil, drawStrokes, strokes } from "../../../../src/kit/engine/ink.ts";
import { hash, rng } from "../../../../src/kit/engine/random.ts";
import { clamp01, drawing, ease, mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, pole, poleAt, shotCameras, sun } from "../../scene.ts";
import { drawSparrow, restPose, sparrowLight, sparrowPoses } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import { drawViewPlate, placeSparrow, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { closeup, dusk, ink, warm } from "../../tokens.ts";
import { overshoot, travel } from "./camera.ts";
import {
  S05_BALANCE_FLAPS,
  S05_CALL_SMALL,
  S05_DROP,
  S05_FALL_BACK,
  S05_FLAPS,
  S05_HUSH,
  S05_POLE_SPRING,
  S05_PUSH_OFF,
  S05_STEADY,
  S05_WINDUP,
  s05Timing,
} from "./timing.ts";

const deg = (v: number) => (v * Math.PI) / 180;

type Key = {
  f: number;
  pose: Partial<Pose>;
  lift: number;
  az: number;
  leave?: number;
  arrive?: number;
  lines?: number;
};

const P = sparrowPoses;
const wet: Partial<Pose> = { wet: 1 };

const flapDown: Partial<Pose> = { ...wet, bodyPitch: 0.46, stretch: 0.06, headPitch: -0.04, tailLift: -0.16, tailSpread: 0.5, wingSpread: 1, wingFlap: -0.86, wingSweep: 0.2, wingSmear: 0.22, eyeOpen: 1.16, legs: false };
const flapMid: Partial<Pose> = { ...wet, bodyPitch: 0.5, stretch: 0.04, headPitch: -0.1, tailLift: -0.2, tailSpread: 0.4, wingSpread: 0.98, wingFlap: 0.05, wingFold: 0.4, wingSweep: -0.05, eyeOpen: 1.18, legs: false };
const flapUp: Partial<Pose> = { ...wet, bodyPitch: 0.52, stretch: 0.02, headPitch: -0.12, tailLift: -0.24, tailSpread: 0.38, wingSpread: 0.96, wingFlap: 0.9, wingFold: 0.7, wingSweep: -0.24, eyeOpen: 1.2, legs: false };
const squash: Partial<Pose> = { ...wet, bodyPitch: 0.3, crouch: 0.55, stretch: -0.22, headPitch: 0.1, tailLift: 0.2, wingSpread: 0.9, wingFlap: 0.7, wingSweep: -0.2, eyeOpen: 1.26, legReach: 0, legExtend: 0 };
const perchLegs: Partial<Pose> = { legReach: 0, legExtend: 0 };

const CROUCH_HOLD: Partial<Pose> = { ...P.failCrouch, crouch: 1.3, bodyPitch: -0.04, headPitch: 0.24, stretch: -0.2 };
const HOVER: Partial<Pose> = { ...P.failHover, lift: 0.66, wingSpread: 0.9 };

const LIFT = [0.1, 0.118, 0.13, 0.14, 0.152, 0.159, 0.165, 0.171, 0.175, 0.178, 0.18, 0.182];

const FLAP_KEYS: Key[] = [];
S05_FLAPS.forEach((f, i) => {
  FLAP_KEYS.push(
    { f, lift: LIFT[i * 3], az: 139 - i * 2.4, pose: { ...flapDown, lift: 0.5 + i * 0.045, wingSpread: 1 - i * 0.05 }, lines: i < 2 ? 3 : 2 },
    { f: f + 1, lift: LIFT[i * 3 + 1], az: 139 - i * 2.4 - 0.8, pose: { ...flapMid, lift: 0.54 + i * 0.03, wingSpread: 1 - i * 0.05 }, lines: i < 2 ? 2 : 1 },
    { f: f + 2, lift: LIFT[i * 3 + 2], az: 139 - i * 2.4 - 1.6, pose: { ...flapUp, lift: 0.58 + i * 0.02, wingSpread: 1 - i * 0.05 } },
  );
});

const KEYS: readonly Key[] = [
  { f: 0, lift: 0, az: 144, pose: { ...wet, bodyPitch: 0.5, crouch: 0.12, stretch: -0.04, headPitch: 0.04, eyeOpen: 0.55, eyeClosedCurve: 0.1, beakOpen: 0.14, tailLift: 0.08, wingSpread: 0.12 }, leave: 0.6 },
  { f: 2, lift: 0, az: 144, pose: { ...P.startled }, arrive: 0.7 },
  { f: S05_WINDUP, lift: 0, az: 144, pose: { ...P.startled } },
  { f: 10, lift: 0, az: 143, pose: { ...P.failCrouch, crouch: 0.62 }, leave: 1.6, arrive: 1.2 },
  { f: 16, lift: 0, az: 142, pose: CROUCH_HOLD, arrive: 1.6 },
  { f: S05_PUSH_OFF - 1, lift: 0, az: 142, pose: CROUCH_HOLD },
  { f: S05_PUSH_OFF, lift: 0.012, az: 141, pose: { ...P.failPush, wingSmear: 0.72 }, leave: 0.6, lines: 2 },
  { f: S05_PUSH_OFF + 1, lift: 0.055, az: 140, pose: { ...P.failPush, wingFlap: 0.5, wingSmear: 0.85 }, lines: 3 },
  ...FLAP_KEYS,
  { f: S05_FLAPS[3] + 3, lift: 0.183, az: 128.8, pose: { ...flapUp, lift: 0.66, wingSpread: 0.84, legReach: -0.22, legExtend: 0.15 }, arrive: 1.6 },
  { f: S05_HUSH, lift: 0.185, az: 127, pose: HOVER, arrive: 1.8 },
  { f: S05_DROP - 1, lift: 0.185, az: 127, pose: HOVER },
  { f: S05_DROP, lift: 0.18, az: 126, pose: { ...P.failHover, lift: 0.62, wingSpread: 0.94, wingFlap: 1.0, wingFold: 0.1 }, leave: 0.7 },
  { f: S05_DROP + 1, lift: 0.162, az: 125, pose: { ...P.failDrop, lift: 0.5, wingFlap: 0.98, stretch: 0.2 }, lines: 2 },
  { f: S05_DROP + 2, lift: 0.132, az: 124, pose: { ...P.failDrop, lift: 0.4, wingFlap: 0.96, stretch: 0.26 } },
  { f: S05_DROP + 3, lift: 0.092, az: 123, pose: { ...P.failDrop, lift: 0.3, wingFlap: 0.98, stretch: 0.32 }, lines: 2 },
  { f: S05_DROP + 4, lift: 0.046, az: 122, pose: { ...P.failDrop, lift: 0.15, wingFlap: 1.0, stretch: 0.4, wingSpread: 0.9, wingSweep: -0.3 }, lines: 3 },
  { f: S05_DROP + 5, lift: 0.004, az: 121, pose: { ...P.failDrop, lift: 0.02, wingFlap: 1.0, stretch: 0.46, wingSpread: 0.9, wingSweep: -0.32, legReach: 0.3, legExtend: 0.9, toeSpread: 0.8 }, lines: 3 },
  { f: S05_FALL_BACK, lift: -0.004, az: 120, pose: squash, arrive: 0.5 },
  { f: S05_FALL_BACK + 1, lift: -0.004, az: 120, pose: squash },
  { f: S05_BALANCE_FLAPS[0], lift: 0, az: 119, pose: { ...wet, ...perchLegs, bodyPitch: -0.1, crouch: 0.2, stretch: 0.1, headPitch: -0.14, tailLift: 0.4, wingSpread: 0.92, wingFlap: -0.7, wingSweep: 0.15, eyeOpen: 1.24 }, lines: 2 },
  { f: S05_BALANCE_FLAPS[0] + 1, lift: 0, az: 118, pose: { ...wet, ...perchLegs, bodyPitch: -0.45, crouch: 0.1, stretch: 0.12, headPitch: -0.22, tailLift: 0.55, wingSpread: 0.9, wingFlap: 0.8, wingSweep: -0.25, eyeOpen: 1.22 } },
  { f: S05_BALANCE_FLAPS[0] + 2, lift: 0, az: 117, pose: { ...wet, ...perchLegs, bodyPitch: -0.7, crouch: 0.12, stretch: 0.1, headPitch: -0.28, tailLift: 0.62, tailSpread: 0.7, wingSpread: 0.9, wingFlap: -0.75, wingSweep: 0.1, eyeOpen: 1.22 }, lines: 2 },
  { f: S05_BALANCE_FLAPS[0] + 3, lift: 0, az: 116, pose: { ...wet, ...perchLegs, bodyPitch: -0.6, crouch: 0.12, stretch: 0.08, headPitch: -0.24, tailLift: 0.58, tailSpread: 0.65, wingSpread: 0.88, wingFlap: 0.85, wingSweep: -0.28, eyeOpen: 1.2 } },
  { f: S05_BALANCE_FLAPS[1], lift: 0, az: 114, pose: { ...wet, ...perchLegs, bodyPitch: -0.48, crouch: 0.14, stretch: 0.06, headPitch: -0.18, tailLift: 0.5, tailSpread: 0.6, wingSpread: 0.86, wingFlap: 0.2, wingFold: 0.3, eyeOpen: 1.16 }, arrive: 1.2 },
  { f: 64, lift: 0, az: 96, pose: { ...wet, ...perchLegs, bodyPitch: -0.02, crouch: 0.3, stretch: -0.08, headPitch: 0.06, tailLift: 0.2, tailSpread: 0.4, wingSpread: 0.7, wingFlap: -0.3, wingFold: 0.2, eyeOpen: 1.1 }, leave: 1.3, arrive: 1.4 },
  { f: 70, lift: 0, az: 72, pose: { ...wet, ...perchLegs, bodyPitch: -0.28, crouch: 0.34, stretch: -0.1, headPitch: -0.04, tailLift: 0.3, tailSpread: 0.45, wingSpread: 0.5, wingFlap: 0.3, wingFold: 0.1, eyeOpen: 1.04 }, leave: 1.4, arrive: 1.3 },
  { f: 78, lift: 0, az: 50, pose: { ...P.failRecover, wingSpread: 0.3, wingFlap: 0.1, eyeOpen: 0.9 }, arrive: 1.6 },
  { f: S05_STEADY, lift: 0, az: 55, pose: { ...P.failRecover } },
];

const NUMERIC = Object.keys(restPose).filter((k): k is keyof Pose => typeof (restPose as Record<string, unknown>)[k] === "number");

const lerpPose = (a: Partial<Pose>, b: Partial<Pose>, t: number): Pose => {
  const full = (p: Partial<Pose>) => ({ ...restPose, ...wet, ...p });
  const pa = full(a);
  const pb = full(b);
  const out = { ...pa } as Record<string, unknown>;
  for (const k of NUMERIC) out[k] = mix(pa[k] as number, pb[k] as number, t);
  out.legs = t < 0.5 ? pa.legs : pb.legs;
  return out as unknown as Pose;
};

const evalKeys = (f: number) => {
  const first = KEYS[0];
  if (f <= first.f) return { pose: lerpPose(first.pose, first.pose, 0), lift: first.lift, az: first.az, lines: first.lines ?? 0 };
  for (let i = 1; i < KEYS.length; i++) {
    const a = KEYS[i - 1];
    const b = KEYS[i];
    if (f <= b.f) {
      const t = ease(progress(f, a.f, b.f), a.leave ?? 1, b.arrive ?? 1);
      return { pose: lerpPose(a.pose, b.pose, t), lift: mix(a.lift, b.lift, t), az: mix(a.az, b.az, t), lines: t < 0.5 ? a.lines ?? 0 : b.lines ?? 0 };
    }
  }
  const last = KEYS[KEYS.length - 1];
  return { pose: lerpPose(last.pose, last.pose, 0), lift: last.lift, az: last.az, lines: 0 };
};

const HOLDS: readonly (readonly [number, number])[] = [
  [16, S05_PUSH_OFF],
  [S05_HUSH, S05_DROP],
  [S05_FALL_BACK, S05_FALL_BACK + 2],
];
const ONES: readonly (readonly [number, number])[] = [
  [S05_PUSH_OFF, S05_FLAPS[3] + 3],
  [S05_DROP, S05_BALANCE_FLAPS[1]],
];

const within = (f: number, ranges: readonly (readonly [number, number])[]) => ranges.some(([a, b]) => f >= a && f < b);

export const s05PoseFrame = (frame: number): number => {
  const hold = HOLDS.find(([a, b]) => frame >= a && frame < b);
  if (hold) return hold[0];
  if (within(frame, ONES)) return frame;
  return drawing(frame, 2).frame;
};

const DRAWING_INDEX: number[] = (() => {
  const out: number[] = [];
  let last = NaN;
  let index = 0;
  for (let f = 0; f < s05Timing.durationInFrames; f++) {
    const pf = s05PoseFrame(f);
    if (pf !== last) {
      index += 1;
      last = pf;
    }
    out.push(index);
  }
  return out;
})();

const breathAt = (poseFrame: number) => {
  if (poseFrame < S05_STEADY) return { crouch: 0, puff: 0, beak: 0, head: 0, blink: 1 };
  const phase = ((poseFrame - S05_STEADY) / 12) * Math.PI * 2;
  const fade = Math.min(1, (poseFrame - S05_STEADY) / 6);
  const calling = poseFrame >= S05_CALL_SMALL && poseFrame < S05_CALL_SMALL + 4;
  const blink = poseFrame >= 102 && poseFrame < 104 ? 0.1 : 1;
  return {
    crouch: 0.03 * Math.sin(phase) * fade,
    puff: 0.06 * (0.5 + 0.5 * Math.sin(phase)) * fade,
    beak: calling ? (poseFrame < S05_CALL_SMALL + 2 ? 0.5 : 0.3) : 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(phase)) * fade,
    head: calling ? 0.08 : 0.02 * Math.sin(phase) * fade,
    blink,
  };
};

export const s05State = (frame: number) => {
  const poseFrame = s05PoseFrame(frame);
  const key = evalKeys(poseFrame);
  const breath = breathAt(poseFrame);
  const pose: Pose = {
    ...key.pose,
    crouch: key.pose.crouch + breath.crouch,
    puff: key.pose.puff + breath.puff,
    beakOpen: poseFrame >= S05_STEADY ? breath.beak : key.pose.beakOpen,
    headPitch: key.pose.headPitch + breath.head,
    eyeOpen: key.pose.eyeOpen * breath.blink,
  };
  return {
    poseFrame,
    drawing: DRAWING_INDEX[Math.max(0, Math.min(DRAWING_INDEX.length - 1, frame))],
    pose,
    lift: key.lift,
    az: key.az,
    lines: key.lines,
  };
};

const POLE_PERIOD = (S05_POLE_SPRING - S05_FALL_BACK) * 2;

export const s05PoleBend = (frame: number) => {
  if (frame < S05_FALL_BACK) return undefined;
  const t = frame - S05_FALL_BACK;
  const amp = 0.03 * Math.exp(-t / 15) * Math.min(1, t / 1.5);
  const offset = -amp * Math.cos((t * Math.PI * 2) / POLE_PERIOD);
  return (u: number) => offset * Math.sin(Math.PI * clamp01(u));
};

const s05CameraAt = (frame: number): Camera => {
  const base = shotCameras.s5;
  const push = travel(frame, [0, 16, 80, 96], 0.0012);
  const up = travel(frame, [S05_PUSH_OFF + 4, 34, 40, 46], 0) - travel(frame, [S05_DROP + 2, 56, 62, 70], 0);
  const under = overshoot(frame, 62, 76);
  const pitch = base.pitch + deg(1.8 * up - 0.3 * under);
  const forward: Vec3 = [Math.sin(base.yaw) * Math.cos(pitch), Math.cos(base.yaw) * Math.cos(pitch), Math.sin(pitch)];
  return {
    ...base,
    position: [base.position[0] + forward[0] * 0.03 * push, base.position[1] + forward[1] * 0.03 * push, base.position[2] + forward[2] * 0.03 * push],
    pitch,
  };
};

const viewYawForAzimuth = (camera: Camera, target: Vec3, azimuthRad: number) => {
  const bearing = Math.atan2(target[0] - camera.position[0], target[1] - camera.position[1]);
  return azimuthRad - bearing - Math.PI / 2;
};

const hexRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).replace(/^(.)$/, "0$1")).join("")}`;
};

const drawPoleShadow = (ctx: CanvasRenderingContext2D, camera: Camera, bend: (u: number) => number, lift: number, drawing: number, ppu: number) => {
  if (lift > 0.06) return;
  const fade = 1 - lift / 0.06;
  const tStart = Math.max(0, perchT - 0.075);
  const steps = 14;
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const s = poleScreen(camera, tStart + (perchT + 0.012 - tStart) * u, bend);
    const half = pole.radius * s.scale * (0.5 + 0.12 * Math.sin(u * 5 + drawing));
    top.push([s.x, s.y - half - Math.sin(u * Math.PI) * half * 0.5]);
    bottom.push([s.x, s.y + half * 0.2]);
  }
  const contact = poleScreen(camera, perchT, bend);
  ctx.save();
  ctx.beginPath();
  top.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i][0], bottom[i][1]);
  ctx.closePath();
  const grad = ctx.createLinearGradient(contact.x, contact.y, top[0][0], top[0][1]);
  grad.addColorStop(0, hexRgba(dusk.shadowViolet, 0.5 * fade));
  grad.addColorStop(1, hexRgba(dusk.shadowViolet, 0.14 * fade));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.globalAlpha = 0.55 * fade;
  ctx.fillStyle = dusk.shadowViolet;
  ctx.beginPath();
  ctx.ellipse(contact.x + ppu * 0.04, contact.y - pole.radius * contact.scale * 0.45, ppu * 0.55, pole.radius * contact.scale * 0.28, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

type Drop = { spawn: number; side: 1 | -1; lateral: number; up: number; forward: number; size: number };

const DROPS: readonly Drop[] = (() => {
  const r = rng(1885, 54);
  const out: Drop[] = [];
  const burst = (spawn: number, landers: number, flyers: number, power: number) => {
    for (let i = 0; i < landers + flyers; i++) {
      const lander = i < landers;
      out.push({
        spawn,
        side: r.next() < 0.5 ? 1 : -1,
        lateral: lander ? r.range(0.08, 0.28) : r.range(0.6, 1.5) * power,
        up: lander ? r.range(0.3, 0.9) * power : r.range(-0.4, 0.5) * power,
        forward: r.range(-0.1, 0.3),
        size: r.next() < 0.3 ? r.range(3.6, 5.2) : r.range(2.2, 3.6),
      });
    }
  };
  for (const f of S05_FLAPS) burst(f, 1, 4, 1);
  burst(S05_FALL_BACK + 1, 4, 6, 1.6);
  for (const f of S05_BALANCE_FLAPS) burst(f, 2, 2, 1.2);
  return out;
})();

type DropPath = { spawn: number; start: Vec3; vel: Vec3; size: number; landFrame: number | null; landPoint: Vec3 | null };

const dropPaths = (azimuth: number, poleZ: number): DropPath[] => {
  const lateral: Vec3 = [Math.cos(azimuth), -Math.sin(azimuth), 0];
  const forward: Vec3 = [Math.sin(azimuth), Math.cos(azimuth), 0];
  return DROPS.map((d) => {
    const start: Vec3 = [lateral[0] * d.side * 0.075 + forward[0] * 0.02, lateral[1] * d.side * 0.075 + forward[1] * 0.02, poleZ + 0.09];
    const vel: Vec3 = [lateral[0] * d.side * d.lateral + forward[0] * d.forward, lateral[1] * d.side * d.lateral + forward[1] * d.forward, d.up];
    const dz = start[2] - poleZ;
    const disc = d.up * d.up + 2 * 4.9 * dz;
    const tLand = disc > 0 ? (d.up + Math.sqrt(disc)) / 9.8 : null;
    const lands = tLand !== null && Math.abs(d.lateral * tLand) < pole.radius * 1.6;
    return {
      spawn: d.spawn,
      start,
      vel,
      size: d.size,
      landFrame: lands && tLand !== null ? d.spawn + tLand * 24 : null,
      landPoint: lands && tLand !== null ? [start[0] + vel[0] * tLand, start[1] + vel[1] * tLand, poleZ] : null,
    };
  });
};

const drawDrops = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number, paths: readonly DropPath[]) => {
  const lit = mixHex(warm.dropHighlight, warm.bokeh[0], 0.35);
  const shade = mixHex(dusk.shadowTeal, closeup.s5.cloudCool, 0.4);
  for (const d of paths) {
    if (d.landFrame !== null) {
      const since = frame - d.landFrame;
      if (since >= 0 && since < 3 && d.landPoint) {
        const p = project(camera, d.landPoint);
        const r = Math.max(1.6, d.size * 0.6);
        ctx.save();
        ctx.strokeStyle = lit;
        ctx.lineWidth = 1.1;
        for (let k = 0; k < 3; k++) {
          const a = (hash(1886, d.spawn, k) - 0.5) * 2.6;
          ctx.globalAlpha = 0.9 * (1 - since / 3);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(a) * r * (2.2 + since * 0.8), p.y - Math.abs(Math.sin(a)) * r * (2 + since * 0.7) - r * 0.4);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }
      if (since >= 3) continue;
    }
    const t = (frame - d.spawn) / 24;
    if (t < 0) continue;
    const pos: Vec3 = [d.start[0] + d.vel[0] * t, d.start[1] + d.vel[1] * t, d.start[2] + d.vel[2] * t - 4.9 * t * t];
    if (d.landFrame !== null && frame >= d.landFrame) continue;
    const poleZ = d.start[2] - 0.09;
    if (pos[2] < poleZ - 0.7) continue;
    const p = project(camera, pos);
    const vel: Vec3 = [d.vel[0], d.vel[1], d.vel[2] - 9.8 * t];
    const speed = Math.hypot(vel[0], vel[1], vel[2]);
    const ahead = project(camera, [pos[0] + vel[0] / 48, pos[1] + vel[1] / 48, pos[2] + vel[2] / 48]);
    const ang = Math.atan2(ahead.y - p.y, ahead.x - p.x) + Math.PI / 2;
    const r = Math.max(1.6, d.size * Math.min(1, p.scale / 1500));
    const stretch = 1 + Math.min(1.2, speed * 0.35);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5 * stretch);
    ctx.bezierCurveTo(r * 0.95, -r * 0.2 * stretch, r * 0.9, r * 0.9, 0, r);
    ctx.bezierCurveTo(-r * 0.9, r * 0.9, -r * 0.95, -r * 0.2 * stretch, 0, -r * 1.5 * stretch);
    ctx.closePath();
    ctx.fillStyle = lit;
    ctx.fill();
    if (r > 2.6) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.fillRect(-r * 1.2, r * 0.1, r * 2.4, r * 1.3);
      ctx.restore();
    }
    ctx.strokeStyle = ink.color;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    if (r > 3) {
      ctx.beginPath();
      ctx.arc(r * 0.22, 0, r * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = warm.dropHighlight;
      ctx.fill();
    }
    ctx.restore();
  }
};

const teardrop = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  lit: string,
  shade: string,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -ry * 1.5);
  ctx.bezierCurveTo(rx * 0.95, -ry * 0.3, rx * 0.9, ry * 0.9, 0, ry);
  ctx.bezierCurveTo(-rx * 0.9, ry * 0.9, -rx * 0.95, -ry * 0.3, 0, -ry * 1.5);
  ctx.closePath();
  ctx.fillStyle = lit;
  ctx.fill();
  if (rx > 2.4) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = shade;
    ctx.fillRect(-rx * 1.2, ry * 0.1, rx * 2.4, ry * 1.3);
    ctx.restore();
  }
  ctx.strokeStyle = ink.color;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  if (rx > 3) {
    ctx.beginPath();
    ctx.arc(rx * 0.22, 0, rx * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = warm.dropHighlight;
    ctx.fill();
  }
  ctx.restore();
};

type PoleDropSpec = { t: number; size: number; release: number | null; vx: number; vz: number };

const POLE_DROPS: readonly PoleDropSpec[] = [
  { t: 0.455, size: 0.3, release: S05_POLE_SPRING - 2, vx: -0.03, vz: 0.12 },
  { t: 0.5, size: 0.36, release: null, vx: 0, vz: 0 },
  { t: 0.545, size: 0.26, release: null, vx: 0, vz: 0 },
  { t: 0.6, size: 0.38, release: S05_POLE_SPRING - 1, vx: 0.04, vz: 0.16 },
  { t: 0.66, size: 0.24, release: null, vx: 0, vz: 0 },
  { t: 0.72, size: 0.32, release: S05_POLE_SPRING - 3, vx: -0.02, vz: 0.2 },
];

const drawPoleDrops = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number, bendAt: (frame: number) => (u: number) => number) => {
  const bend = bendAt(frame);
  const bendVel = Math.abs(bend(perchT) - bendAt(frame - 1)(perchT));
  const lit = mixHex(warm.dropHighlight, dusk.cloudGap[0], 0.42);
  const shade = mixHex(dusk.shadowTeal, dusk.shadowViolet, 0.45);
  for (const drop of POLE_DROPS) {
    const s = poleScreen(camera, drop.t, bend);
    if (s.x < 40 || s.x > camera.width - 40) continue;
    const half = pole.radius * s.scale;
    if (drop.release === null || frame < drop.release) {
      const r = half * drop.size;
      const stretch = 1 + Math.min(0.6, bendVel * 30);
      const wobble = Math.sin(frame * 0.35 + drop.t * 50) * Math.min(3, bendVel * 160);
      teardrop(ctx, s.x + wobble, s.y + half * 0.94 + r * 0.82 * stretch, r * 0.85, r * 1.05 * stretch, wobble * 0.04, lit, shade);
    } else {
      const dt = (frame - drop.release) / 24;
      if (dt > 0.9) continue;
      const base = poleAt(drop.t);
      const z0 = base[2] + bendAt(drop.release)(drop.t) - pole.radius * 1.3;
      const pos: Vec3 = [base[0] + drop.vx * dt, base[1] + 0.02 * dt, z0 + drop.vz * dt - 4.9 * dt * dt];
      const p = project(camera, pos);
      if (p.y > camera.height + 60) continue;
      const r = pole.radius * p.scale * drop.size * 0.88;
      const vz = drop.vz - 9.8 * dt;
      teardrop(ctx, p.x, p.y, r * 0.74, r * (1 + Math.min(1, Math.abs(vz) / 3.5) * 0.95), Math.atan2(drop.vx, Math.max(0.2, -vz)) * 0.35, lit, shade);
    }
  }
};

const MOTES = Array.from({ length: 14 }, (_, k) => ({
  x: 0.1 + hash(1888, k, 1) * 1.1,
  y: 2.3 + hash(1888, k, 2) * 1.1,
  z: 1.45 + hash(1888, k, 3) * 0.7,
  drift: 0.004 + hash(1888, k, 4) * 0.012,
  radius: 1.1 + hash(1888, k, 5) * 1.4,
  phase: hash(1888, k, 6) * Math.PI * 2,
  alpha: 0.22 + hash(1888, k, 7) * 0.26,
}));

const drawMotes = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  const t = frame / 24;
  ctx.save();
  ctx.fillStyle = warm.dropHighlight;
  for (const m of MOTES) {
    const p = project(camera, [m.x - m.drift * t + Math.sin(t * 0.6 + m.phase) * 0.02, m.y, m.z + Math.sin(t * 0.45 + m.phase * 2) * 0.025]);
    if (p.x < 0 || p.x > camera.width || p.y < 0 || p.y > camera.height) continue;
    ctx.globalAlpha = m.alpha * (0.7 + 0.3 * Math.sin(t * 1.3 + m.phase));
    ctx.beginPath();
    ctx.arc(p.x, p.y, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawSpeedLines = (ctx: CanvasRenderingContext2D, x: number, y: number, ppu: number, frame: number, count: number, direction: "down" | "up" | "launch") => {
  if (count <= 0) return;
  const seed = Math.floor(hash(1887, frame, direction.length) * 1e6);
  const tips: [number, number][] =
    direction === "launch"
      ? [[x - 0.3 * ppu, y + 0.1 * ppu], [x + 0.3 * ppu, y + 0.1 * ppu]]
      : [[x - 1.35 * ppu, y - 0.15 * ppu], [x + 1.15 * ppu, y - 0.15 * ppu]];
  ctx.save();
  for (let k = 0; k < count; k++) {
    const [tx, ty] = tips[k % 2];
    const layer = Math.floor(k / 2);
    const reach = ppu * (0.75 + 0.35 * hash(seed, k, 3) + layer * 0.3);
    const outward = (tx < x ? -1 : 1) * ppu * (0.15 + 0.2 * hash(seed, k, 5));
    let pts: Point[];
    if (direction === "down") {
      pts = [
        [tx - outward * 0.6, ty - reach],
        [tx + outward * 0.2, ty - reach * 0.45],
        [tx + outward, ty + reach * 0.15],
      ];
    } else if (direction === "up") {
      pts = [
        [tx + outward * 0.5, ty + reach],
        [tx - outward * 0.2, ty + reach * 0.45],
        [tx - outward, ty - reach * 0.2],
      ];
    } else {
      pts = [
        [tx - outward * 0.2, ty + reach * 0.5],
        [tx - outward * 0.7, ty + reach * 1.2],
        [tx - outward * 1.1, ty + reach * 1.9],
      ];
    }
    const dense: Point[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      for (let j = 0; j < 7; j++) {
        const u = j / 7;
        dense.push([mix(pts[i][0], pts[i + 1][0], u), mix(pts[i][1], pts[i + 1][1], u)]);
      }
    }
    dense.push(pts[pts.length - 1]);
    const bpts = boil(dense, seed + k * 13, 0.6);
    const style = {
      seed: seed + k * 41,
      base: k % 2 === 0 ? 2.4 : 1.8,
      min: 1.0,
      max: 3.6,
      light: [0.55, -0.82] as Point,
      breakEvery: [1e4, 1e4] as [number, number],
      cornerAngle: 1.4,
      gap: [0, 0] as [number, number],
      litThin: 0.7,
      dropLit: 0,
      minLength: 14,
    };
    drawStrokes(ctx, strokes(bpts, false, style), k % 2 === 0 ? hexRgba(ink.color, 0.62) : hexRgba(warm.rim, 0.75));
  }
  ctx.restore();
};

const drawS05 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s05CameraAt(frame);
  const state = s05State(frame);
  const bendFn = s05PoleBend(frame);
  const bend = bendFn ?? (() => 0);

  ctx.fillStyle = closeup.s5.skyWarm;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "closeup-s5"), "closeup-s5", camera);

  drawPole(ctx, camera, { state: "dusk", drawing: state.drawing, bend: bendFn, drops: 0 });
  drawPoleDrops(ctx, camera, frame, (f) => s05PoleBend(f) ?? (() => 0));
  drawPoleShadow(ctx, camera, bend, state.lift, state.drawing, placeSparrow(camera, poleAt(perchT), 0, sun).ppu);

  const pt = poleAt(perchT);
  const poleZ = pt[2] + bend(perchT);
  const azimuth = deg(state.az);
  const forward: Vec3 = [Math.sin(azimuth), Math.cos(azimuth), 0];
  const feet: Vec3 = [pt[0] + forward[0] * state.lift * 0.3, pt[1] + forward[1] * state.lift * 0.3, poleZ + pole.radius + state.lift];
  const place = placeSparrow(camera, feet, 0, sun);

  drawDrops(ctx, camera, frame, dropPaths(azimuth, poleZ + pole.radius));

  if (frame >= S05_PUSH_OFF && frame < S05_FLAPS[0]) {
    drawSpeedLines(ctx, place.x, place.y, place.ppu, frame, state.lines, "launch");
  }
  drawSparrow(
    ctx,
    {
      x: place.x,
      y: place.y,
      ppu: place.ppu,
      yaw: viewYawForAzimuth(camera, feet, azimuth),
      pitch: place.pitch,
      lighting: sparrowLight("dusk", place.light),
      drawing: state.drawing,
      seed: 18505,
    },
    state.pose,
  );
  if (state.lines > 0 && frame >= S05_FLAPS[0]) {
    drawSpeedLines(ctx, place.x, place.y, place.ppu, frame, state.lines, frame >= S05_DROP ? "up" : "down");
  }
  drawMotes(ctx, camera, frame);
};

export const s05: Shot<Surface> = {
  ...s05Timing,
  post: {},
  draw: drawS05,
};
