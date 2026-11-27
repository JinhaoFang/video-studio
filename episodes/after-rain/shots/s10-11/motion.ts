/**
 * 第 10–11 镜（合）的角色运动（纯函数，不依赖浏览器）：第 10 镜麻雀转脸、压身、活的停顿、腿蹬、离杆和迎面冲向镜头的翅拍，
 * 姿势从 sparrowPoses 的关键姿势出发补中间画（一拍二），最快的几帧一拍一并带拖影；第 11 镜主角波浪式飞向电线、减速落在同伴中间，田埂上的人影按真实透视走。
 * 线路、高度和翅拍相位都按 timing.ts 的帧号取，画面事件和这里用的是同一份数据。
 * 待定事项：无。
 */
import type { Vec3 } from "../../../../src/kit/engine/camera.ts";
import { noise1 } from "../../../../src/kit/engine/random.ts";
import { drawing, ease, mix, progress } from "../../../../src/kit/engine/timing.ts";
import { paddyWorld, perchT, pole, poleAt, UNIT } from "../../scene.ts";
import { restPose, sparrowPoses } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import {
  S10_CROUCH,
  S10_CROUCH_END,
  S10_PUSH,
  S10_TAKEOFF,
  S10_TURN_END,
  s10FlapAt,
  S11_FLIGHT_START,
  S11_LAND,
  S11_LAND_X,
  s11HeroState,
} from "./timing.ts";

type NumericField = Exclude<keyof Pose, "legs">;

const FIELDS: readonly NumericField[] = [
  "bodyPitch",
  "lift",
  "headYaw",
  "headPitch",
  "headRoll",
  "puff",
  "wet",
  "ruffle",
  "crouch",
  "stretch",
  "tailLift",
  "tailSpread",
  "wingSpread",
  "wingFlap",
  "wingFold",
  "wingSweep",
  "wingSmear",
  "eyeOpen",
  "eyeClosedCurve",
  "sparkle",
  "glint",
  "beakOpen",
  "legReach",
  "legExtend",
  "toeSpread",
];

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const base = restPose as unknown as Record<NumericField, number>;
  const pa = a as unknown as Partial<Record<NumericField, number>>;
  const pb = b as unknown as Partial<Record<NumericField, number>>;
  const out: Record<NumericField, number> = { ...base };
  for (const key of FIELDS) {
    const av = pa[key] ?? base[key];
    const bv = pb[key] ?? base[key];
    out[key] = mix(av, bv, t);
  }
  return { ...(out as unknown as Pose), legs: t < 0.5 ? a.legs : b.legs };
};

const perchTop: Vec3 = (() => {
  const p = poleAt(perchT);
  return [p[0], p[1], p[2] + pole.radius];
})();

const standingOrigin: Vec3 = [perchTop[0], perchTop[1], perchTop[2] + 1.3 * UNIT];

export const S10_CROUCH_DEPTH = 1.25;

const P_LOOK: Pose = { ...sparrowPoses.lookUp, headYaw: -0.16 };
const P_FACE: Pose = {
  ...restPose,
  bodyPitch: 0.44,
  headPitch: 0.02,
  eyeOpen: 1,
  glint: 0.86,
};
const P_CROUCH: Pose = {
  ...sparrowPoses.takeoffCrouch,
  crouch: S10_CROUCH_DEPTH,
  bodyPitch: 0.1,
  headPitch: 0.14,
  tailLift: 0.38,
  wingSpread: 0.1,
  wingFlap: 0.1,
  glint: 0.82,
};
const P_PUSH: Pose = {
  ...restPose,
  bodyPitch: 0.34,
  crouch: 0.5,
  stretch: 0.04,
  headPitch: 0.1,
  tailLift: 0.14,
  tailSpread: 0.35,
  wingSpread: 0.36,
  wingFlap: 0.42,
  wingSweep: -0.1,
  eyeOpen: 1.06,
  glint: 0.88,
};
const P_OPEN: Pose = {
  ...restPose,
  bodyPitch: 0.3,
  crouch: 0,
  stretch: 0.1,
  headPitch: -0.02,
  tailLift: -0.1,
  tailSpread: 0.4,
  wingSpread: 0.9,
  wingFlap: 0.8,
  wingSweep: -0.14,
  wingFold: 0.3,
  eyeOpen: 1.08,
  glint: 0.9,
};
const P_LAUNCH: Pose = {
  ...restPose,
  bodyPitch: 0.28,
  crouch: 0,
  lift: 0.32,
  stretch: 0.24,
  headPitch: -0.04,
  tailLift: -0.1,
  tailSpread: 0.42,
  wingSpread: 0.96,
  wingFlap: 0.88,
  wingSweep: -0.2,
  wingFold: 0.6,
  eyeOpen: 1.08,
  glint: 0.9,
  legExtend: 1,
  legReach: -0.66,
};
const P_TUCK: Pose = {
  ...P_LAUNCH,
  bodyPitch: 0.22,
  lift: 0.38,
  stretch: 0.16,
  wingSpread: 1,
  wingFlap: 0.9,
  wingFold: 0.72,
  wingSweep: -0.24,
  legs: false,
};

export const s10PerchedDrawing = (frame: number): number => {
  if (frame >= S10_CROUCH_END) return S10_CROUCH_END / 2;
  return drawing(frame, 2).index;
};

export const s10PerchedPose = (frame: number): Pose => {
  const d = drawing(frame, 2).frame;
  if (d < S10_TURN_END) {
    return mixPose(P_LOOK, P_FACE, ease(progress(d, 0, S10_TURN_END), 1.5, 1.5));
  }
  if (d < S10_CROUCH_END) {
    return mixPose(P_FACE, P_CROUCH, ease(progress(d, S10_CROUCH, S10_CROUCH_END), 1.8, 2.0));
  }
  const since = drawing(frame, 2).frame - S10_CROUCH_END;
  const breath = 0.045 * Math.sin((Math.PI * 2 * since) / 44) - 0.02 * Math.min(1, since / 2);
  const tremble = Math.exp(-Math.pow((since - 6) / 2.4, 2)) * 0.05;
  return {
    ...P_CROUCH,
    crouch: P_CROUCH.crouch + breath,
    tailLift: P_CROUCH.tailLift + tremble,
    headPitch: P_CROUCH.headPitch - tremble * 0.5,
  };
};

const flightAmplitude = (index: number) => (index === 0 ? 1 : index < 4 ? 0.9 : 0.78);
const flightSmear = (index: number) => (index === 0 ? 0.78 : index < 4 ? 0.42 : 0.26);

export const s10FlightPose = (frame: number): Pose => {
  if (frame === S10_PUSH) return P_PUSH;
  if (frame === S10_PUSH + 1) return P_OPEN;
  if (frame === S10_TAKEOFF) return P_LAUNCH;
  if (frame === S10_TAKEOFF + 1) return P_TUCK;
  const flap = s10FlapAt(frame);
  if (!flap) return P_TUCK;
  const a = flightAmplitude(flap.index);
  const base: Pose = {
    ...restPose,
    bodyPitch: 0.12,
    lift: 0.4,
    stretch: 0.1,
    headPitch: -0.04,
    tailLift: 0.0,
    tailSpread: 0.3,
    eyeOpen: 1,
    glint: 0.86,
    legs: false,
  };
  if (flap.phase === 0) {
    return {
      ...base,
      bodyPitch: 0.18,
      wingSpread: a,
      wingFlap: 0.92 * a,
      wingFold: 0.74,
      wingSweep: -0.26,
      tailSpread: 0.18,
    };
  }
  if (flap.phase === 1) {
    return {
      ...base,
      bodyPitch: 0.08,
      wingSpread: 1,
      wingFlap: -0.92 * a,
      wingSweep: 0.24,
      wingSmear: flightSmear(flap.index),
      tailLift: -0.06,
    };
  }
  if (flap.phase === 2) {
    return {
      ...base,
      bodyPitch: 0.1,
      wingSpread: 1,
      wingFlap: flap.length === 3 ? -0.5 * a : -0.78 * a,
      wingSweep: flap.length === 3 ? 0.04 : 0.2,
      wingFold: flap.length === 3 ? 0.12 : 0.04,
    };
  }
  return {
    ...base,
    bodyPitch: 0.15,
    wingSpread: 0.9 * a,
    wingFlap: 0.12,
    wingFold: 0.24,
    wingSweep: -0.08,
  };
};

export const s10Pose = (frame: number): Pose =>
  frame < S10_PUSH ? s10PerchedPose(frame) : s10FlightPose(frame);

export const s10Drawing = (frame: number): number =>
  frame < S10_PUSH ? s10PerchedDrawing(frame) : frame;

export const s10FacingDeg = (frame: number): number => {
  if (frame >= S10_TAKEOFF) return S10_FLIGHT_AZIMUTH_DEG;
  if (frame >= S10_PUSH) return mix(50, S10_FLIGHT_AZIMUTH_DEG, progress(frame, S10_PUSH, S10_TAKEOFF));
  return mix(42, 50, ease(progress(drawing(frame, 2).frame, 0, S10_TURN_END), 1.4, 1.4));
};

export const S10_PASS_X = 1.661;
export const S10_PASS_Y = 3.678;
export const S10_PASS_Z = 1.98;
export const S10_FLIGHT_AZIMUTH_DEG = (Math.atan2(S10_PASS_X - perchTop[0], S10_PASS_Y - perchTop[1]) * 180) / Math.PI;
export const S10_FLIGHT_ACCEL = 0.001667;
export const S10_FLIGHT_INITIAL_SPEED = 0.01667;

const passVector: Vec3 = [S10_PASS_X - standingOrigin[0], S10_PASS_Y - standingOrigin[1], S10_PASS_Z - standingOrigin[2]];
const passLength = Math.hypot(passVector[0], passVector[1], passVector[2]);
const passUnit: Vec3 = [passVector[0] / passLength, passVector[1] / passLength, passVector[2] / passLength];

export const s10FlightDistance = (frame: number): number => {
  const t = Math.max(0, frame - S10_TAKEOFF);
  return S10_FLIGHT_ACCEL * t * t + S10_FLIGHT_INITIAL_SPEED * t;
};

export const s10FlightHop = (frame: number): number => {
  const t = frame - S10_TAKEOFF;
  return t <= 0 || t >= 22 ? 0 : 0.028 * Math.sin((Math.PI * t) / 22);
};

export const s10Origin = (frame: number): Vec3 => {
  if (frame < S10_TAKEOFF) return standingOrigin;
  const s = s10FlightDistance(frame);
  const hop = s10FlightHop(frame);
  return [
    standingOrigin[0] + passUnit[0] * s,
    standingOrigin[1] + passUnit[1] * s,
    standingOrigin[2] + passUnit[2] * s + hop,
  ];
};

export const s10OnPole = (frame: number): boolean => frame < S10_TAKEOFF;

const S11_WIRE_OFFSET = -0.48;
export const s11WirePoint = (x: number): Vec3 => {
  const poleA = paddyWorld.powerLineXStart;
  const poleB = poleA + paddyWorld.poleSpacing;
  const geom = (px: number) => {
    const leanX = (noise1(px * 0.13, 757) - 0.5) * 0.34;
    const leanY = (noise1(px * 0.17, 758) - 0.5) * 0.22;
    const hVar = paddyWorld.wireHeight + (noise1(px * 0.21, 759) - 0.5) * 0.26;
    const crossTilt = (noise1(px * 0.29, 760) - 0.5) * 0.14;
    return { top: [px + leanX, paddyWorld.powerLineY + leanY, hVar + 0.42], armZ: hVar + crossTilt };
  };
  const a = geom(poleA);
  const c = geom(poleB);
  const u = Math.max(0, Math.min(1, (x - a.top[0] - S11_WIRE_OFFSET * 0.15) / (c.top[0] - a.top[0])));
  return [
    a.top[0] + (c.top[0] - a.top[0]) * u + S11_WIRE_OFFSET * 0.15,
    a.top[1] + (c.top[1] - a.top[1]) * u + S11_WIRE_OFFSET * 0.85,
    a.armZ * (1 - u) + c.armZ * u - 4 * 0.52 * u * (1 - u),
  ];
};

export const S11_WAVE_METERS = 0.125;
const S11_PATH_START: Vec3 = [16, 21.5, 5.54];
const S11_BRAKE_START = 136;

export const s11FlightProgress = (frame: number): number => {
  if (frame <= S11_FLIGHT_START) return 0;
  if (frame >= S11_LAND) return 1;
  const cruise = S11_BRAKE_START - S11_FLIGHT_START;
  const brake = S11_LAND - S11_BRAKE_START;
  const v = 1 / (cruise + brake / 2);
  if (frame <= S11_BRAKE_START) return v * (frame - S11_FLIGHT_START);
  const t = (frame - S11_BRAKE_START) / brake;
  return v * cruise + v * brake * (1 - (1 - t) * (1 - t)) / 2;
};

export const s11HeroPosition = (frame: number): Vec3 => {
  const u = s11FlightProgress(frame);
  const land = s11WirePoint(S11_LAND_X);
  const wave = s11HeroState(frame).waveY * S11_WAVE_METERS * (frame < S11_LAND ? 1 : 0);
  return [
    mix(S11_PATH_START[0], land[0], u),
    mix(S11_PATH_START[1], land[1], u),
    mix(S11_PATH_START[2], land[2], u) + wave,
  ];
};

export const S11_PERSON_HEIGHT = 1.55;
export const s11PersonPosition = (frame: number, total: number): Vec3 => {
  const x = mix(31, 39.6, Math.max(0, Math.min(1, frame / total)));
  return [x, paddyWorld.farmerRidgeY, 0];
};
