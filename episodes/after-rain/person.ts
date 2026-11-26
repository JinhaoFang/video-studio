/**
 * 走过院子的人与随身竹篮、远处小人影。全片只露腰以下（局部坐标单位为米，z = 0 是地面、z = 1.02 是腰线，x 朝前、y 朝左、z 朝上）。
 * 下半身按左右腿拆成裤腿（含半侧腰臀与卷边裤脚）、小腿皮肤、苔绿胶鞋（含沾泥色区）和竹篮（含提篮前臂与手）等体块，
 * 用 kit 的距离场正交投影、赛璐璐分色和手绘线条绘制，保证正面、四分之三、侧面、背面都是同一套衣鞋。
 * 公开接口：drawPerson、drawBasket、drawDistantPerson、mudWalkPose、stopTurnPose、placePerson、placeDistantPerson、personRoute。
 * 走路循环按 motion.md「人的腿脚表演」实现：泥地 24 帧一步、硬路 20 帧一步，含陷泥 2–3 厘米、重心下沉、拔泥延迟与泥丝泥点、裤脚与竹篮滞后跟随。
 * 停步朝向取停步点出发的路段；场景方位从 +Y 向 +X 顺时针为正，人物绕 +Z 的正转则从前方转向左侧。骨盆跟随两脚的局部转角，一起对准栖点。
 * 待定事项：TODO(design) 1) 竹篮默认挎在右手（-Y，即第 4、6 镜朝向镜头一侧，可用 basketSide 切换）；2) 远处小人影的斗笠暂用竹篮色族；3) 裤腰以上只留靛蓝裤腰截齐，不另加衣色。
 */
import { createLayer, drawCel, placeLayer, tracePath } from "../../src/kit/engine/cel.ts";
import type { CelPart, Tone } from "../../src/kit/engine/cel.ts";
import { directionToView, project } from "../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";
import {
  add,
  contours,
  ellipsoid,
  field,
  length,
  normalize,
  resample,
  rotateX,
  rotateY,
  rotateZ,
  roundCone,
  sample,
  scale,
  smin,
  smooth,
  sub,
  toView,
  viewBasis,
} from "../../src/kit/engine/figure.ts";
import type { Basis, Point, Sampled, V3 } from "../../src/kit/engine/figure.ts";
import { boil, drawStrokes, jitterSeed, strokes } from "../../src/kit/engine/ink.ts";
import type { Stroke, StrokeStyle } from "../../src/kit/engine/ink.ts";
import { hash, noise1, noise2 } from "../../src/kit/engine/random.ts";
import { clamp01, drawing, ease, mix, progress } from "../../src/kit/engine/timing.ts";
import { paddyWorld, perchPoint, puddleW1, sun, yardPath } from "./scene.ts";
import { ink } from "./tokens.ts";
import { distantPersonColors, personPalettes } from "./tokens-person.ts";
import type { PersonLight, PersonPalette } from "./tokens-person.ts";

export type { PersonLight, PersonPalette };

export const WAIST_Z = 1.02;
export const HIP_Z = 0.87;
export const KNEE_Z = 0.48;
export const CUFF_Z = 0.36;
export const BOOT_TOP_Z = 0.23;
export const ANKLE_Z = 0.11;
export const GROUND_Z = 0;

const L_THIGH = 0.39;
const L_SHIN = 0.37;
const HIP_HALF_Y = 0.092;
const HEEL_OFFSET_X = 0.068;

export type LegPose = {
  hipPitch: number;
  hipRoll: number;
  kneeBend: number;
  anklePitch: number;
  footYaw: number;
  cuffSwing: number;
  mudSink: number;
  mudPull: number;
};

export type PersonPose = {
  pelvisZ: number;
  pelvisX: number;
  pelvisY: number;
  pelvisYaw: number;
  pelvisRoll: number;
  pelvisPitch: number;
  left: LegPose;
  right: LegPose;
  basketSide: 1 | -1;
  basketSwing: number;
  basketSway: number;
  basketLift: number;
  armSwing: number;
  mudAmount: number;
  showBasket: boolean;
};

export type PersonLighting = {
  light: PersonLight;
  direction: V3;
  rim?: { color?: string; alpha: number };
  threshold?: number;
};

export type PersonView = {
  x: number;
  y: number;
  ppu: number;
  yaw: number;
  pitch: number;
  roll?: number;
  lighting: PersonLighting;
  drawing: number;
  seed?: number;
};

export type BasketView = {
  x: number;
  y: number;
  ppu: number;
  yaw: number;
  pitch: number;
  roll?: number;
  lighting: PersonLighting;
  drawing: number;
  seed?: number;
};

export type DistantPersonView = {
  x: number;
  y: number;
  heightPx: number;
  facingRight?: boolean;
  light?: PersonLight;
  rimColor?: string;
  rimAlpha?: number;
  drawing: number;
  seed?: number;
};

export const defaultLegPose: LegPose = {
  hipPitch: 0.06,
  hipRoll: 0,
  kneeBend: 0.11,
  anklePitch: 0,
  footYaw: 0,
  cuffSwing: 0,
  mudSink: 0,
  mudPull: 0,
};

export const restPersonPose: PersonPose = {
  pelvisZ: -0.006,
  pelvisX: 0,
  pelvisY: 0,
  pelvisYaw: 0,
  pelvisRoll: 0,
  pelvisPitch: 0.02,
  left: { ...defaultLegPose, hipPitch: 0.09, kneeBend: 0.13, footYaw: 0.06 },
  right: { ...defaultLegPose, hipPitch: 0.03, kneeBend: 0.11, footYaw: -0.06 },
  basketSide: -1,
  basketSwing: 0.04,
  basketSway: 0.02,
  basketLift: 0,
  armSwing: 0.03,
  mudAmount: 1,
  showBasket: true,
};

export const personSheetLight: PersonLighting = {
  light: "dusk",
  direction: [0.55, -0.58, -0.6],
  threshold: 0.08,
};

export const personBacklight = (
  light: PersonLight = "dusk",
  direction: V3 = [0.42, -0.35, 0.84],
): PersonLighting => ({
  light,
  direction,
  rim: personPalettes[light].rim ? { color: personPalettes[light].rim, alpha: 0.9 } : undefined,
  threshold: 0.18,
});

const azimuthBetween = (a: Vec3, b: Vec3) => Math.atan2(b[0] - a[0], b[1] - a[1]);
const courtyard: readonly Vec3[] = yardPath.map(([x, y]) => [x, y, GROUND_Z]);
const stopPoint = courtyard[3];

export const personRoute = {
  courtyard,
  puddleW1: [puddleW1.x, puddleW1.y, GROUND_Z] as Vec3,
  stopPoint,
  stopAzimuth: azimuthBetween(stopPoint, courtyard[4]),
  sparrowPerch: perchPoint,
  distantRidgeStart: [paddyWorld.farmerRidgeXMin, paddyWorld.farmerRidgeY, GROUND_Z] as Vec3,
  distantRidgeEnd: [paddyWorld.farmerRidgeXMax, paddyWorld.farmerRidgeY, GROUND_Z] as Vec3,
};

export const personAtPath = (t: number, path: readonly Vec3[] = personRoute.courtyard): { position: Vec3; azimuth: number } => {
  const clamped = clamp01(t);
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    segLengths.push(l);
    total += l;
  }
  const target = clamped * total;
  let acc = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const l = segLengths[i];
    if (acc + l >= target || i === segLengths.length - 1) {
      const u = l > 0 ? clamp01((target - acc) / l) : 0;
      const a = path[i];
      const b = path[i + 1];
      return {
        position: [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)],
        azimuth: azimuthBetween(a, b),
      };
    }
    acc += l;
  }
  return { position: path[0], azimuth: 0 };
};

export const placePerson = (
  camera: Camera,
  feet: Vec3,
  azimuth: number,
  light: PersonLight = "dusk",
  sunDirection: Vec3 = sun,
) => {
  const p = project(camera, feet);
  const horizontal = Math.hypot(feet[0] - camera.position[0], feet[1] - camera.position[1]);
  const elevation = Math.atan2(camera.position[2] - feet[2], horizontal);
  const bearing = azimuthBetween(camera.position, feet);
  const lightDir = directionToView(camera, sunDirection);
  const backlit = lightDir[2] > 0.15;
  return {
    x: p.x,
    y: p.y,
    ppu: p.scale,
    yaw: azimuth - bearing - Math.PI / 2,
    pitch: elevation,
    lighting: backlit
      ? personBacklight(light, lightDir)
      : ({ light, direction: lightDir, threshold: 0.08 } satisfies PersonLighting),
  };
};

export const placeDistantPerson = (
  camera: Camera,
  feet: Vec3,
  personHeightMeters = 1.68,
) => {
  const p = project(camera, feet);
  return {
    x: p.x,
    y: p.y,
    heightPx: p.scale * personHeightMeters,
  };
};

const solveLegIK = (
  hipX: number,
  hipZ: number,
  ankleX: number,
  ankleZ: number,
): { hipPitch: number; kneeBend: number } => {
  const dx = ankleX - hipX;
  const dz = ankleZ - hipZ;
  const maxReach = L_THIGH + L_SHIN - 0.005;
  const d = Math.max(0.24, Math.min(maxReach, Math.hypot(dx, dz)));
  const baseAngle = Math.atan2(dx, -dz);
  const cosAlpha = Math.max(-1, Math.min(1, (L_THIGH * L_THIGH + d * d - L_SHIN * L_SHIN) / (2 * L_THIGH * d)));
  const cosBeta = Math.max(-1, Math.min(1, (L_THIGH * L_THIGH + L_SHIN * L_SHIN - d * d) / (2 * L_THIGH * L_SHIN)));
  const alpha = Math.acos(cosAlpha);
  const kneeBend = Math.PI - Math.acos(cosBeta);
  return { hipPitch: baseAngle + alpha, kneeBend };
};

const samplePiecewise = (
  u: number,
  keys: readonly { t: number; v: number; leave?: number; arrive?: number }[],
): number => {
  if (u <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (u <= b.t) {
      const s = ease(progress(u, a.t, b.t), a.leave ?? 1, b.arrive ?? 1);
      return mix(a.v, b.v, s);
    }
  }
  return keys[keys.length - 1].v;
};

export type MudWalkOptions = {
  stepFrames?: number;
  muddy?: number;
  basketSide?: 1 | -1;
  seed?: number;
  ones?: boolean;
};

export const mudWalkPose = (frame: number, options: MudWalkOptions = {}): PersonPose => {
  const stepFrames = options.stepFrames ?? 24;
  const muddy = clamp01(options.muddy ?? 1);
  const basketSide = options.basketSide ?? -1;
  const seed = options.seed ?? 181;
  const f = options.ones ? frame : drawing(frame, 2).frame;
  const cycleFrames = stepFrames * 2;
  const stepIndex = Math.floor(f / stepFrames);
  const uStep = (((f % stepFrames) + stepFrames) % stepFrames) / stepFrames;
  const uCycle = (((f % cycleFrames) + cycleFrames) % cycleFrames) / cycleFrames;
  const vary = (k: number) => (hash(seed, stepIndex, k) - 0.5) * 2;
  const stride = (0.3 + 0.016 * vary(1)) * (1 - 0.04 * (1 - muddy));
  const sinkDepth = (0.027 + 0.004 * vary(2)) * muddy;
  const liftPeak = 0.064 + 0.032 * muddy + 0.008 * vary(3);

  const pelvisZ = samplePiecewise(uStep, [
    { t: 0, v: -0.024, leave: 1.6 },
    { t: 4 / 24, v: -0.068 - 0.014 * muddy, leave: 1.2, arrive: 1.7 },
    { t: 10 / 24, v: -0.042, leave: 1.1, arrive: 1.1 },
    { t: 16 / 24, v: -0.01 + 0.005 * vary(4), leave: 1.3, arrive: 1.4 },
    { t: 21 / 24, v: -0.016, leave: 1.0, arrive: 1.2 },
    { t: 1, v: -0.024, arrive: 1.6 },
  ]);

  const leadingSide = stepIndex % 2 === 0 ? 1 : -1;
  const pelvisY = leadingSide * samplePiecewise(uStep, [
    { t: 0, v: 0.005, leave: 1.2 },
    { t: 5 / 24, v: 0.03 + 0.008 * muddy, leave: 1.2, arrive: 1.5 },
    { t: 14 / 24, v: 0.024, leave: 1.1, arrive: 1.1 },
    { t: 22 / 24, v: 0.002, leave: 1.0, arrive: 1.2 },
    { t: 1, v: -0.005, arrive: 1.2 },
  ]);

  const pelvisRoll = leadingSide * samplePiecewise(uStep, [
    { t: 0, v: -0.018 },
    { t: 5 / 24, v: -0.058 - 0.015 * muddy, arrive: 1.5 },
    { t: 14 / 24, v: -0.028 },
    { t: 1, v: 0.018 },
  ]);

  const pelvisYaw = leadingSide * samplePiecewise(uStep, [
    { t: 0, v: -0.1 },
    { t: 6 / 24, v: -0.075 },
    { t: 15 / 24, v: 0.045 },
    { t: 1, v: 0.1 },
  ]);

  const pelvisPitch = 0.045 + 0.028 * muddy + 0.02 * Math.sin(uStep * Math.PI);

  const buildFoot = (phaseOffset: number, side: 1 | -1): LegPose => {
    const p = (uCycle + phaseOffset) % 1;
    const stepVar = (hash(seed, Math.floor((f + phaseOffset * cycleFrames) / cycleFrames), side + 7) - 0.5) * 2;
    const stanceEnd = 0.72;
    let ankleX: number;
    let ankleZ: number;
    let anklePitch: number;
    let mudSink = 0;
    let mudPull = 0;

    if (p < stanceEnd) {
      const s = p / stanceEnd;
      ankleX = samplePiecewise(s, [
        { t: 0, v: stride * 0.55, leave: 1.4 },
        { t: 4 / 34.56, v: stride * 0.48, leave: 1.0, arrive: 1.3 },
        { t: 16 / 34.56, v: 0.0, leave: 1.0, arrive: 1.0 },
        { t: 28 / 34.56, v: -stride * 0.42, leave: 1.1, arrive: 1.1 },
        { t: 1, v: -stride * 0.54, arrive: 1.5 },
      ]);
      const sinkCurve = samplePiecewise(s, [
        { t: 0, v: 0.08, leave: 1.8 },
        { t: 4 / 34.56, v: 1.0, leave: 1.0, arrive: 1.6 },
        { t: 24 / 34.56, v: 0.92, leave: 1.0, arrive: 1.0 },
        { t: 31 / 34.56, v: 0.55, leave: 1.2, arrive: 1.1 },
        { t: 1, v: 0.05, arrive: 1.6 },
      ]);
      mudSink = sinkCurve * muddy;
      ankleZ = ANKLE_Z - sinkDepth * sinkCurve;
      anklePitch = samplePiecewise(s, [
        { t: 0, v: 0.3, leave: 1.8 },
        { t: 4 / 34.56, v: 0.01, arrive: 1.6 },
        { t: 22 / 34.56, v: -0.02 },
        { t: 29 / 34.56, v: -0.22, leave: 1.4 },
        { t: 1, v: -0.42, arrive: 1.4 },
      ]);
      if (s > 0.85 && muddy > 0.15) {
        mudPull = clamp01((s - 0.85) / 0.15) * 0.25 * muddy;
      }
    } else {
      const sw = (p - stanceEnd) / (1 - stanceEnd);
      ankleX = samplePiecewise(sw, [
        { t: 0, v: -stride * 0.54, leave: 2.2 },
        { t: 0.26, v: -stride * 0.38, leave: 1.5, arrive: 1.1 },
        { t: 0.6, v: stride * 0.14, leave: 1.0, arrive: 1.0 },
        { t: 0.88, v: stride * 0.5, leave: 1.0, arrive: 1.5 },
        { t: 1, v: stride * 0.55, arrive: 1.6 },
      ]);
      ankleZ =
        ANKLE_Z +
        samplePiecewise(sw, [
          { t: 0, v: 0.014, leave: 2.2 },
          { t: 0.24, v: 0.046, leave: 1.6, arrive: 1.1 },
          { t: 0.56, v: liftPeak + 0.008 * stepVar, leave: 1.1, arrive: 1.4 },
          { t: 0.85, v: 0.038, leave: 1.1, arrive: 1.3 },
          { t: 1, v: 0.006, arrive: 1.6 },
        ]);
      anklePitch = samplePiecewise(sw, [
        { t: 0, v: -0.38, leave: 1.8 },
        { t: 0.28, v: -0.26, leave: 1.2 },
        { t: 0.62, v: 0.06, leave: 1.1, arrive: 1.1 },
        { t: 0.88, v: 0.26, arrive: 1.4 },
        { t: 1, v: 0.28, arrive: 1.4 },
      ]);
      if (sw < 0.45 && muddy > 0.15) {
        mudPull = (0.28 + 0.72 * ease(sw / 0.45, 1.3, 1.0)) * muddy;
      }
    }

    const hipX = -side * Math.sin(pelvisYaw) * HIP_HALF_Y;
    const hipZ = HIP_Z + pelvisZ + side * Math.sin(pelvisRoll) * HIP_HALF_Y;
    const ik = solveLegIK(hipX, hipZ, ankleX, ankleZ);
    const cuffPhase = (p + 1 - 3 / cycleFrames) % 1;
    const cuffImpact =
      cuffPhase < 0.14
        ? Math.sin((cuffPhase / 0.14) * Math.PI) * (0.16 + 0.05 * muddy)
        : 0;
    const cuffSwing = cuffImpact - (p < stanceEnd ? 0.03 : -0.06);

    return {
      hipPitch: ik.hipPitch,
      hipRoll: side * 0.012,
      kneeBend: ik.kneeBend,
      anklePitch,
      footYaw: side * (0.045 + 0.018 * stepVar),
      cuffSwing,
      mudSink,
      mudPull,
    };
  };

  const lagFrames = 5;
  const laggedPhase = (((f - lagFrames) % cycleFrames) + cycleFrames) % cycleFrames / cycleFrames;
  const basketAmp = ((9 + 3.5 * muddy + 0.8 * vary(5)) * Math.PI) / 180;
  const basketSwing = -basketSide * Math.sin(laggedPhase * Math.PI * 2) * basketAmp;
  const basketSway = basketSide * (0.035 + 0.025 * Math.cos(laggedPhase * Math.PI * 2));
  const basketLift = -0.014 * Math.cos(laggedPhase * Math.PI * 4);
  const armPhase = (((f - 2) % cycleFrames) + cycleFrames) % cycleFrames / cycleFrames;
  const armSwing = -basketSide * Math.sin(armPhase * Math.PI * 2) * 0.14;

  return {
    pelvisZ,
    pelvisX: 0.014 * Math.sin(uStep * Math.PI * 2),
    pelvisY,
    pelvisYaw,
    pelvisRoll,
    pelvisPitch,
    left: buildFoot(0, 1),
    right: buildFoot(0.5, -1),
    basketSide,
    basketSwing,
    basketSway,
    basketLift,
    armSwing,
    mudAmount: Math.max(0.55, muddy),
    showBasket: true,
  };
};

export const stopTurnPose = (
  frame: number,
  options: { basketSide?: 1 | -1; seed?: number; ones?: boolean } = {},
): PersonPose => {
  const basketSide = options.basketSide ?? -1;
  const seed = options.seed ?? 186;
  const f = options.ones ? frame : drawing(frame, 2).frame;

  if (f >= 74) {
    const resume = mudWalkPose(f - 74, { stepFrames: 20, muddy: 0.3, basketSide, seed: seed + 9, ones: options.ones });
    const blend = ease(progress(f, 74, 80), 1.4, 1.2);
    return {
      ...resume,
      pelvisZ: mix(-0.018, resume.pelvisZ, blend),
      basketSwing: mix(0.03, resume.basketSwing, blend),
      mudAmount: 0.85,
    };
  }

  const pelvisFollow = 0.82;
  const localTurn = personRoute.stopAzimuth - azimuthBetween(stopPoint, perchPoint);
  const targetFootYaw = Math.atan2(Math.sin(localTurn), Math.cos(localTurn));
  const targetPelvisYaw = targetFootYaw * pelvisFollow / (1 + pelvisFollow);
  const rightYaw =
    f < 8
      ? -0.05
      : f <= 14
        ? mix(-0.05, targetFootYaw, ease(progress(f, 10, 14), 1.8, 1.5))
        : f < 62
          ? targetFootYaw
          : mix(targetFootYaw, -0.05, ease(progress(f, 62, 68), 1.4, 1.2));

  const leftYaw =
    f < 20
      ? 0.04
      : f <= 26
        ? mix(0.04, targetFootYaw + 0.06, ease(progress(f, 22, 26), 1.8, 1.5))
        : f < 70
          ? targetFootYaw + 0.06
          : mix(targetFootYaw + 0.06, 0.04, ease(progress(f, 70, 74), 1.4, 1.2));

  const rightLift =
    f >= 10 && f <= 14
      ? Math.sin(progress(f, 10, 14) * Math.PI) * 0.028
      : f >= 62 && f <= 68
        ? Math.sin(progress(f, 62, 68) * Math.PI) * 0.028
        : 0;
  const leftLift =
    f >= 22 && f <= 26
      ? Math.sin(progress(f, 22, 26) * Math.PI) * 0.028
      : f >= 70 && f <= 74
        ? Math.sin(progress(f, 70, 74) * Math.PI) * 0.026
        : 0;

  const stopSink = f <= 4 ? ease(progress(f, 0, 4), 1.5, 1.4) : 1 - 0.5 * ease(progress(f, 4, 10), 1.1, 1.2);
  const holdShift =
    f < 34
      ? 0
      : f <= 60
        ? Math.sin(ease(progress(f, 34, 60), 1.5, 1.5) * Math.PI)
        : 0;

  const pelvisY =
    f <= 8
      ? mix(-0.018, 0.0, ease(progress(f, 0, 8), 1.3, 1.3))
      : f <= 18
        ? mix(0.0, 0.046, ease(progress(f, 8, 11), 1.7, 1.3)) * (1 - 0.52 * ease(progress(f, 14, 18), 1.2, 1.2))
        : f <= 30
          ? mix(0.022, -0.038, ease(progress(f, 18, 22), 1.5, 1.3)) * (1 - 0.55 * ease(progress(f, 26, 30), 1.2, 1.2))
          : f <= 60
            ? mix(-0.016, 0.032, holdShift)
            : f <= 68
              ? mix(-0.016, 0.036, ease(progress(f, 60, 64), 1.3, 1.2))
              : mix(0.036, -0.02, ease(progress(f, 68, 74), 1.3, 1.2));

  const pelvisZ =
    -0.016 -
    0.032 * (f <= 4 ? ease(progress(f, 0, 4), 1.6, 1.5) : Math.max(0, 1 - progress(f, 4, 12))) -
    0.01 * Math.abs(holdShift);

  const pelvisYaw =
    f < 8
      ? 0
      : f <= 28
        ? mix(0, targetPelvisYaw, ease(progress(f, 8, 26), 1.4, 1.4))
        : f < 61
          ? targetPelvisYaw
          : mix(targetPelvisYaw, 0, ease(progress(f, 61, 73), 1.3, 1.2));

  const pelvisRoll = -pelvisY * 1.25;

  const rightHeelX = 0.068;
  const rightHeelY = -HIP_HALF_Y - 0.018;
  const leftHeelX = -0.072;
  const leftHeelY = HIP_HALF_Y + 0.012;

  const rAnkleX = rightHeelX + HEEL_OFFSET_X * Math.cos(rightYaw) - 0.04;
  const lAnkleX = leftHeelX + HEEL_OFFSET_X * Math.cos(leftYaw) - 0.04;
  const rAnkleZ = ANKLE_Z - 0.02 * stopSink + rightLift;
  const lAnkleZ = ANKLE_Z - 0.01 * (1 - Math.min(1, leftLift * 40)) + leftLift;

  const rHipX = Math.sin(pelvisYaw) * HIP_HALF_Y;
  const lHipX = -Math.sin(pelvisYaw) * HIP_HALF_Y;
  const rHipZ = HIP_Z + pelvisZ - Math.sin(pelvisRoll) * HIP_HALF_Y;
  const lHipZ = HIP_Z + pelvisZ + Math.sin(pelvisRoll) * HIP_HALF_Y;

  const rIk = solveLegIK(rHipX, rHipZ, rAnkleX, rAnkleZ);
  const lIk = solveLegIK(lHipX, lHipZ, lAnkleX, lAnkleZ);

  const relaxRightKnee = holdShift * 0.14;
  const dampT = Math.max(0, f - 4);
  const basketSwing =
    f <= 4
      ? mix(0.08, 0.24, ease(progress(f, 0, 4), 1.3, 1.6))
      : 0.24 * Math.exp(-dampT / 11.5) * Math.cos((dampT / 11) * Math.PI * 2);
  const basketSway =
    basketSide * (0.03 + 0.048 * Math.exp(-dampT / 14) * Math.sin((dampT / 13) * Math.PI * 2)) - pelvisY * 0.7;

  return {
    pelvisZ,
    pelvisX: mix(0.022, 0, ease(progress(f, 0, 8), 1.2, 1.4)),
    pelvisY,
    pelvisYaw,
    pelvisRoll,
    pelvisPitch: 0.03 + 0.028 * (f <= 4 ? 1 : Math.max(0, 1 - progress(f, 4, 14))),
    left: {
      hipPitch: lIk.hipPitch,
      hipRoll: (leftHeelY - HIP_HALF_Y - pelvisY) * 0.32,
      kneeBend: lIk.kneeBend,
      anklePitch: leftLift > 0.002 ? 0.22 : 0,
      footYaw: leftYaw - pelvisYaw,
      cuffSwing: f < 6 ? 0.06 * (1 - f / 6) : 0,
      mudSink: leftLift > 0.002 ? 0 : f < 10 ? 0.45 : 0.2,
      mudPull: 0,
    },
    right: {
      hipPitch: rIk.hipPitch + relaxRightKnee * 0.45,
      hipRoll: (rightHeelY + HIP_HALF_Y - pelvisY) * 0.32,
      kneeBend: rIk.kneeBend + relaxRightKnee,
      anklePitch: rightLift > 0.002 ? 0.26 : f <= 4 ? 0.12 * (1 - f / 4) : 0,
      footYaw: rightYaw - pelvisYaw,
      cuffSwing: f <= 8 ? 0.14 * Math.sin((f / 8) * Math.PI) : 0,
      mudSink: rightLift > 0.002 ? 0 : stopSink * 0.8,
      mudPull: 0,
    },
    basketSide,
    basketSwing,
    basketSway,
    basketLift: -0.009 * Math.abs(basketSwing),
    armSwing: basketSwing * 0.32,
    mudAmount: 0.9,
    showBasket: true,
  };
};

type LegKinematics = {
  side: 1 | -1;
  hip: V3;
  knee: V3;
  cuffTop: V3;
  cuffBottom: V3;
  bootTop: V3;
  ankle: V3;
  shinDir: V3;
  shinPitch: number;
  legYaw: number;
  footOrigin: V3;
  toFoot: (p: V3) => V3;
  fromFoot: (p: V3) => V3;
  toCuff: (p: V3) => V3;
  pose: LegPose;
};

const buildLegKinematics = (pose: PersonPose, side: 1 | -1): LegKinematics => {
  const leg = side > 0 ? pose.left : pose.right;
  const pelvisCenter: V3 = [pose.pelvisX, pose.pelvisY, HIP_Z + pose.pelvisZ];
  const pelvisTransform = (v: V3): V3 =>
    add(pelvisCenter, rotateZ(rotateY(rotateX(v, pose.pelvisRoll), pose.pelvisPitch), pose.pelvisYaw));

  const hip = pelvisTransform([0, side * HIP_HALF_Y, 0]);
  const legYaw = pose.pelvisYaw + leg.footYaw * 0.28;
  const thighLocal: V3 = [
    Math.sin(leg.hipPitch) * L_THIGH,
    Math.sin(leg.hipRoll) * L_THIGH,
    -Math.cos(leg.hipPitch) * L_THIGH,
  ];
  const knee = add(hip, rotateZ(thighLocal, legYaw));

  const shinPitch = leg.hipPitch - leg.kneeBend;
  const shinVec = rotateZ(
    [Math.sin(shinPitch) * L_SHIN, Math.sin(leg.hipRoll * 0.5) * L_SHIN, -Math.cos(shinPitch) * L_SHIN],
    legYaw,
  );
  const ankle = add(knee, shinVec);
  const shinDir = normalize(shinVec);
  const cuffTop = add(knee, scale(shinVec, 0.14));
  const cuffBottom = add(knee, scale(shinVec, 0.32));
  const bootTop = add(knee, scale(shinVec, 0.67));

  const footYaw = pose.pelvisYaw + leg.footYaw;
  const footPitch = leg.anklePitch;
  const footOrigin: V3 = [ankle[0], ankle[1], ankle[2]];
  const toFoot = (p: V3): V3 => {
    const q = rotateZ(sub(p, footOrigin), -footYaw);
    return rotateY(q, footPitch);
  };
  const fromFoot = (q: V3): V3 => add(rotateZ(rotateY(q, -footPitch), footYaw), footOrigin);

  const cuffAxisPitch = shinPitch + leg.cuffSwing;
  const toCuff = (p: V3): V3 => rotateY(rotateZ(sub(p, cuffBottom), -legYaw), -cuffAxisPitch);

  return {
    side,
    hip,
    knee,
    cuffTop,
    cuffBottom,
    bootTop,
    ankle,
    shinDir,
    shinPitch,
    legYaw,
    footOrigin,
    toFoot,
    fromFoot,
    toCuff,
    pose: leg,
  };
};

const basketCupSdfLocal = (q: V3) => {
  const z = q[2];
  const t = clamp01(z / 0.215);
  const rx = mix(0.11, 0.152, Math.pow(t, 0.85));
  const ry = mix(0.086, 0.12, Math.pow(t, 0.85));
  const radial = Math.hypot(q[0] / rx, q[1] / ry) - 1;
  const wallDist = radial * Math.min(rx, ry);
  const body = Math.max(wallDist, Math.max(-z, z - 0.218));
  const bottomRound = ellipsoid(q, [0, 0, 0.044], [0.116, 0.092, 0.046]);
  const cup = smin(body, bottomRound, 0.024);

  const rimAngle = Math.atan2(q[1] / 0.12, q[0] / 0.152);
  const rimPt: V3 = [Math.cos(rimAngle) * 0.152, Math.sin(rimAngle) * 0.12, 0.215];
  const rimRing = length(sub(q, rimPt)) - 0.013;

  return smin(cup, rimRing, 0.01);
};

const basketHandleSdfLocal = (q: V3) => {
  const hAngle = Math.atan2(Math.max(0, q[2] - 0.205) / 0.185, q[0] / 0.148);
  const clampedAngle = Math.max(0, Math.min(Math.PI, hAngle));
  const handlePt: V3 = [Math.cos(clampedAngle) * 0.148, 0, 0.205 + Math.sin(clampedAngle) * 0.185];
  return length(sub(q, handlePt)) - 0.0108;
};

const basketSdfLocal = (q: V3) => Math.min(basketCupSdfLocal(q), basketHandleSdfLocal(q));

const basketCavityField = (q: V3) => {
  const rx = 0.136;
  const ry = 0.105;
  const radial = Math.hypot(q[0] / rx, q[1] / ry) - 1;
  return Math.max(radial * 0.12, Math.abs(q[2] - 0.212) - 0.024);
};

const basketWeaveLines = (
  basis: Basis,
  screen: (p: V3) => Point,
  toWorld: (q: V3) => V3,
  worldNormal: (n: V3) => V3,
): Point[][] => {
  const lines: Point[][] = [];
  const upFacing = toView(basis, worldNormal([0, 0, 1]))[2];
  const rings = [0.048, 0.095, 0.142, 0.186];
  for (let ri = 0; ri < rings.length; ri++) {
    const z = rings[ri];
    const t = clamp01(z / 0.215);
    const rx = mix(0.112, 0.154, Math.pow(t, 0.85));
    const ry = mix(0.088, 0.122, Math.pow(t, 0.85));
    let seg: Point[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const q: V3 = [Math.cos(a) * rx, Math.sin(a) * ry, z + 0.0025 * Math.sin(a * 6 + ri * 1.4)];
      const n = normalize([Math.cos(a) / rx, Math.sin(a) / ry, -0.15]);
      const nv = toView(basis, worldNormal(n));
      if (nv[2] < 0.08) {
        seg.push(screen(toWorld(q)));
      } else if (seg.length >= 3) {
        lines.push(seg);
        seg = [];
      } else {
        seg = [];
      }
    }
    if (seg.length >= 3) lines.push(seg);
  }
  const ribCount = 14;
  for (let r = 0; r < ribCount; r++) {
    const a = (r / ribCount) * Math.PI * 2 + 0.12;
    const n = normalize([Math.cos(a), Math.sin(a), 0]);
    if (toView(basis, worldNormal(n))[2] > 0.08) continue;
    for (let band = 0; band < 3; band++) {
      if ((r + band) % 2 !== 0) continue;
      const z0 = 0.025 + band * 0.056;
      const z1 = z0 + 0.052;
      const pts: Point[] = [];
      for (let i = 0; i <= 3; i++) {
        const z = mix(z0, z1, i / 3);
        const rx = mix(0.112, 0.154, Math.pow(z / 0.215, 0.85));
        const ry = mix(0.088, 0.122, Math.pow(z / 0.215, 0.85));
        pts.push(screen(toWorld([Math.cos(a) * rx, Math.sin(a) * ry, z])));
      }
      lines.push(pts);
    }
  }
  if (upFacing < -0.25) {
    const rimSeg: Point[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      rimSeg.push(screen(toWorld([Math.cos(a) * 0.14, Math.sin(a) * 0.108, 0.216])));
    }
    lines.push(rimSeg);
    for (const y of [-0.052, 0.052]) {
      lines.push([screen(toWorld([-0.082, y, 0.19])), screen(toWorld([0.082, y, 0.19]))]);
    }
    for (const x of [-0.055, 0, 0.055]) {
      lines.push([screen(toWorld([x, -0.072, 0.19])), screen(toWorld([x, -0.024, 0.19]))]);
      lines.push([screen(toWorld([x, 0.024, 0.19])), screen(toWorld([x, 0.072, 0.19]))]);
    }
  }
  return lines;
};

const loopsOf = (values: Float32Array, s: Sampled, spacing: number, minArea: number, seed: number, amp: number) =>
  contours(values, s.grid)
    .map((loop) => resample(smooth(loop, 2), spacing))
    .filter((loop) => {
      let a = 0;
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i];
        const q = loop[(i + 1) % loop.length];
        a += p[0] * q[1] - q[0] * p[1];
      }
      return Math.abs(a / 2) >= minArea;
    })
    .map((loop) => boil(loop, seed, amp));

const makeStyle = (
  drawingSeed: number,
  light2d: Point,
  lineBase: number,
  ppu: number,
  k: number,
  base = lineBase,
): StrokeStyle => ({
  seed: drawingSeed + k * 7919,
  base,
  min: ink.minPx * 0.82,
  max: ink.maxPx,
  light: light2d,
  breakEvery: [Math.max(24, ppu * 0.16), Math.max(54, ppu * 0.4)],
  cornerAngle: 0.92,
  gap: [-1.4, 1.3],
  litThin: 0.72,
  dropLit: 0.14,
  minLength: Math.max(8, ppu * 0.045),
});

const renderSampledPart = (
  sdf: (p: V3) => number,
  center: V3,
  radius: number,
  baseTone: Tone,
  ctxArgs: {
    originX: number;
    originY: number;
    ppu: number;
    basis: Basis;
    cell: number;
    spacing: number;
    minArea: number;
    drawingSeed: number;
    boilAmp: number;
    seed: number;
    L: V3;
    light2d: Point;
    threshold: number;
    rim?: { color: string; alpha: number };
    lineBase: number;
    rimClipZ?: number;
  },
  k: number,
  extra?: (s: Sampled) => { loops: Point[][]; tone: Tone }[],
  innerLines?: () => { pts: Point[]; widthScale?: number }[],
  roundAmount = 0.24,
): { part: CelPart; depth: number; sampled: Sampled } => {
  const s = sample(sdf, {
    originX: ctxArgs.originX,
    originY: ctxArgs.originY,
    ppu: ctxArgs.ppu,
    basis: ctxArgs.basis,
    center,
    radius,
    cell: ctxArgs.cell,
    roundness: { center: () => center, amount: roundAmount },
  });
  const sil = loopsOf(s.silhouette, s, ctxArgs.spacing, ctxArgs.minArea, ctxArgs.drawingSeed + k * 17, ctxArgs.boilAmp);
  const shField = field(s, (p, n) => {
    const d = n[0] * ctxArgs.L[0] + n[1] * ctxArgs.L[1] + n[2] * ctxArgs.L[2];
    const wave = (noise1(p[0] * 11 + p[2] * 9, ctxArgs.seed + k * 23) - 0.5) * 0.13;
    return d - ctxArgs.threshold + wave;
  });
  const shadow = loopsOf(shField, s, ctxArgs.spacing, ctxArgs.minArea * 0.6, ctxArgs.drawingSeed + k * 17, ctxArgs.boilAmp);
  const rimField = ctxArgs.rim
    ? field(
        s,
        (p, n) => {
          if (ctxArgs.rimClipZ !== undefined && p[2] > ctxArgs.rimClipZ) return 1;
          const lxy = Math.hypot(ctxArgs.L[0], ctxArgs.L[1]) || 1;
          const facing = (n[0] * ctxArgs.L[0] + n[1] * ctxArgs.L[1]) / lxy;
          return -Math.min(facing - 0.3, 0.36 - Math.abs(n[2]));
        },
        1e3,
      )
    : undefined;
  const rimLoops =
    ctxArgs.rim && rimField
      ? loopsOf(rimField, s, ctxArgs.spacing, ctxArgs.minArea * 0.25, ctxArgs.drawingSeed + k * 17, ctxArgs.boilAmp)
      : [];
  let lines: Stroke[] = sil.reduce<Stroke[]>(
    (all, loop, i) => all.concat(strokes(loop, true, makeStyle(ctxArgs.drawingSeed, ctxArgs.light2d, ctxArgs.lineBase, ctxArgs.ppu, k * 10 + i))),
    [],
  );
  if (innerLines) {
    let idx = 0;
    for (const line of innerLines()) {
      if (line.pts.length < 2) continue;
      const pts = boil(resample(line.pts, ctxArgs.spacing, false), ctxArgs.drawingSeed + k * 19 + idx, ctxArgs.boilAmp);
      const st = makeStyle(
        ctxArgs.drawingSeed,
        ctxArgs.light2d,
        ctxArgs.lineBase,
        ctxArgs.ppu,
        k * 10 + 5 + idx,
        ctxArgs.lineBase * (line.widthScale ?? 0.68),
      );
      lines = lines.concat(strokes(pts, false, { ...st, breakEvery: [1e4, 1e4], dropLit: 0.12, minLength: 4 }));
      idx++;
    }
  }
  return {
    depth: toView(ctxArgs.basis, center)[2],
    sampled: s,
    part: {
      silhouette: sil,
      base: baseTone,
      regions: extra ? extra(s) : [],
      shadow,
      rim: ctxArgs.rim ? { loops: rimLoops, color: ctxArgs.rim.color, alpha: ctxArgs.rim.alpha } : undefined,
      lines,
      lineColor: ink.color,
    },
  };
};

export const drawBasket = (target: CanvasRenderingContext2D, view: BasketView) => {
  const seed = view.seed ?? 181;
  const palette = personPalettes[view.lighting.light];
  const basis = viewBasis(view.yaw, view.pitch, view.roll ?? 0);
  const L = normalize(view.lighting.direction);
  const ppu = view.ppu;
  const cell = Math.min(6, Math.max(1.5, ppu * 0.012));
  const spacing = Math.max(1.4, Math.min(3.0, ppu * 0.0065));
  const drawingSeed = jitterSeed(seed, view.drawing);
  const boilAmp = ink.boilMinPx + (ink.boilMaxPx - ink.boilMinPx) * hash(seed, view.drawing, 5);
  const light2d: Point = (() => {
    const l = Math.hypot(L[0], L[1]) || 1;
    return [L[0] / l, L[1] / l];
  })();
  const lineBase = Math.max(ink.minPx, Math.min(ink.maxPx, 1.5 + ppu * 0.0032));
  const rimColor = view.lighting.rim?.color ?? palette.rim;
  const rim = view.lighting.rim && rimColor ? { color: rimColor, alpha: view.lighting.rim.alpha } : undefined;
  const screen = (p: V3): Point => {
    const v = toView(basis, p);
    return [view.x + v[0] * ppu, view.y + v[1] * ppu];
  };

  const cupArgs = {
    originX: view.x,
    originY: view.y,
    ppu,
    basis,
    cell,
    spacing,
    minArea: Math.max(3, ppu * ppu * 0.00012),
    drawingSeed,
    boilAmp,
    seed,
    L,
    light2d,
    threshold: view.lighting.threshold ?? 0.08,
    rim,
    lineBase,
  };

  const cupBuilt = renderSampledPart(
    basketCupSdfLocal,
    [0, 0, 0.11],
    0.22,
    palette.basket,
    cupArgs,
    1,
    (s) => {
      const cavity = field(s, (p, n) => {
        const facingUp = toView(basis, [0, 0, 1])[2] < -0.18 ? 1 : 0;
        if (!facingUp && n[1] > -0.3) return 1;
        return basketCavityField(p);
      });
      return [
        {
          loops: loopsOf(cavity, s, spacing, Math.max(3, ppu * ppu * 0.0001), drawingSeed + 3, boilAmp),
          tone: { lit: palette.basket.shade, shade: palette.basket.shade },
        },
      ];
    },
    () =>
      basketWeaveLines(
        basis,
        screen,
        (q) => q,
        (n) => n,
      ).map((pts) => ({ pts, widthScale: 0.56 })),
    0.18,
  );

  const handleBuilt = renderSampledPart(
    basketHandleSdfLocal,
    [0, 0, 0.3],
    0.2,
    palette.basket,
    cupArgs,
    4,
    undefined,
    undefined,
    0.15,
  );

  const order = [cupBuilt, handleBuilt].sort((a, b) => b.depth - a.depth);
  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const b of order)
    for (const loop of b.part.silhouette)
      for (const p of loop) {
        bounds.x0 = Math.min(bounds.x0, p[0]);
        bounds.y0 = Math.min(bounds.y0, p[1]);
        bounds.x1 = Math.max(bounds.x1, p[0]);
        bounds.y1 = Math.max(bounds.y1, p[1]);
      }
  if (!Number.isFinite(bounds.x0)) return;
  const pad = 10;
  const layer = createLayer(bounds.x0 - pad, bounds.y0 - pad, bounds.x1 - bounds.x0 + 2 * pad, bounds.y1 - bounds.y0 + 2 * pad, ink.supersample);
  for (const b of order) drawCel(layer.ctx, b.part);
  placeLayer(target, layer);
};

const drawMudEffects = (
  ctx: CanvasRenderingContext2D,
  leg: LegKinematics,
  palette: PersonPalette,
  screen: (p: V3) => Point,
  style: (k: number, base?: number) => StrokeStyle,
  lineBase: number,
  ppu: number,
  drawingSeed: number,
  boilAmp: number,
) => {
  const soleCheck = leg.fromFoot([0.04, 0, -ANKLE_Z]);
  if (leg.pose.mudSink > 0.35 && soleCheck[2] < 0.012) {
    const sink = clamp01((leg.pose.mudSink - 0.3) / 0.7);
    const frontMound: Point[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const a = mix(-0.85, 0.85, t);
      const bump = Math.sin(t * Math.PI);
      const rx = 0.116 + 0.012 * sink;
      const ry = 0.052 + 0.01 * sink;
      const w = leg.fromFoot([0.055 + Math.cos(a) * rx, Math.sin(a) * ry, -ANKLE_Z]);
      frontMound.push(screen([w[0], w[1], 0.002 + (0.016 + 0.006 * Math.sin(t * 9)) * sink * bump]));
    }
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const a = mix(-0.85, 0.85, t);
      const rx = 0.125 + 0.016 * sink;
      const ry = 0.058 + 0.012 * sink;
      const w = leg.fromFoot([0.055 + Math.cos(a) * rx, Math.sin(a) * ry, -ANKLE_Z]);
      frontMound.push(screen([w[0], w[1], -0.003]));
    }
    const boiled = boil(frontMound, drawingSeed + (leg.side > 0 ? 41 : 43), boilAmp);
    ctx.save();
    tracePath(ctx, [boiled]);
    ctx.fillStyle = palette.mud.shade;
    ctx.fill();
    ctx.restore();
    drawStrokes(
      ctx,
      strokes(boiled, true, { ...style(61 + leg.side, lineBase * 0.68), breakEvery: [1e4, 1e4], dropLit: 0 }),
      ink.color,
    );
  }

  if (leg.pose.mudPull > 0.15) {
    const pull = leg.pose.mudPull;
    const soleAnchors: V3[] = [
      [-0.03, leg.side * 0.014, -ANKLE_Z + 0.008],
      [0.05, -leg.side * 0.012, -ANKLE_Z + 0.008],
      [0.12, leg.side * 0.01, -ANKLE_Z + 0.008],
    ];
    const stringCount = pull < 0.78 ? 3 : 2;
    for (let sIdx = 0; sIdx < stringCount; sIdx++) {
      const aWorld = leg.fromFoot(soleAnchors[sIdx]);
      if (aWorld[2] <= 0.008) continue;
      const gWorld: V3 = [aWorld[0] - 0.015 * (sIdx + 0.5), aWorld[1], 0];
      const pTop = screen(aWorld);
      const pBot = screen(gWorld);
      const stretch = clamp01(1 - (pull - 0.15) * 0.78);
      const wEnd = Math.max(2.2, ppu * 0.014 * (0.45 + 0.55 * stretch));
      const wMid = Math.max(0.9, wEnd * 0.28);
      const dx = pBot[0] - pTop[0];
      const dy = pBot[1] - pTop[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      const midX = mix(pTop[0], pBot[0], 0.5) + (hash(drawingSeed, sIdx, leg.side) - 0.5) * ppu * 0.009;
      const midY = mix(pTop[1], pBot[1], 0.52);
      ctx.save();
      ctx.fillStyle = palette.mud.shade;
      ctx.beginPath();
      ctx.moveTo(pTop[0] + nx * wEnd * 0.55, pTop[1] + ny * wEnd * 0.55);
      ctx.quadraticCurveTo(midX + nx * wMid, midY + ny * wMid, pBot[0] + nx * wEnd * 0.65, pBot[1] + ny * wEnd * 0.65);
      ctx.lineTo(pBot[0] - nx * wEnd * 0.65, pBot[1] - ny * wEnd * 0.65);
      ctx.quadraticCurveTo(midX - nx * wMid, midY - ny * wMid, pTop[0] - nx * wEnd * 0.55, pTop[1] - ny * wEnd * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink.color;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
    }
    if (pull > 0.36) {
      const dropPhase = progress(pull, 0.36, 1);
      const dropSpecs = [
        { idx: 0, vx: -0.075, vz: 0.075, size: 1.05 },
        { idx: 1, vx: -0.042, vz: 0.048, size: 0.78 },
        { idx: 2, vx: -0.095, vz: 0.032, size: 0.65 },
      ];
      for (let d = 0; d < dropSpecs.length; d++) {
        const sp = dropSpecs[d];
        const anchor = leg.fromFoot(soleAnchors[sp.idx]);
        const pos: V3 = [
          anchor[0] + sp.vx * dropPhase,
          anchor[1] + (hash(drawingSeed, d, 13) - 0.5) * 0.025 * dropPhase,
          Math.max(0.012, anchor[2] * 0.65 + sp.vz * dropPhase - 0.085 * dropPhase * dropPhase),
        ];
        const pt = screen(pos);
        const r = Math.max(1.8, ppu * 0.0082 * sp.size);
        ctx.save();
        ctx.fillStyle = palette.mud.shade;
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], r * 1.3, r * 0.82, -0.45 + d * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ink.color;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
};

export const drawPerson = (target: CanvasRenderingContext2D, view: PersonView, pose: PersonPose = restPersonPose) => {
  const seed = view.seed ?? 181;
  const palette = personPalettes[view.lighting.light];
  const basis = viewBasis(view.yaw, view.pitch, view.roll ?? 0);
  const L = normalize(view.lighting.direction);
  const ppu = view.ppu;
  const cell = Math.min(6.4, Math.max(1.8, ppu * 0.013));
  const spacing = Math.max(1.5, Math.min(3.0, ppu * 0.0072));
  const drawingSeed = jitterSeed(seed, view.drawing);
  const boilAmp = ink.boilMinPx + (ink.boilMaxPx - ink.boilMinPx) * hash(seed, view.drawing, 3);
  const light2d: Point = (() => {
    const l = Math.hypot(L[0], L[1]) || 1;
    return [L[0] / l, L[1] / l];
  })();
  const lineBase = Math.max(ink.minPx, Math.min(ink.maxPx, 1.55 + ppu * 0.0033));
  const rimColor = view.lighting.rim?.color ?? palette.rim;
  const rim = view.lighting.rim && rimColor ? { color: rimColor, alpha: view.lighting.rim.alpha } : undefined;
  const minArea = Math.max(3, ppu * ppu * 0.00014);
  const waistCapZ = WAIST_Z + pose.pelvisZ * 0.55;

  const screen = (p: V3): Point => {
    const v = toView(basis, p);
    return [view.x + v[0] * ppu, view.y + v[1] * ppu];
  };
  const ctxArgs = {
    originX: view.x,
    originY: view.y,
    ppu,
    basis,
    cell,
    spacing,
    minArea,
    drawingSeed,
    boilAmp,
    seed,
    L,
    light2d,
    threshold: view.lighting.threshold ?? 0.08,
    rim,
    lineBase,
    rimClipZ: waistCapZ - 0.025,
  };

  const pelvisCenter: V3 = [pose.pelvisX, pose.pelvisY, HIP_Z + pose.pelvisZ];
  const leftLeg = buildLegKinematics(pose, 1);
  const rightLeg = buildLegKinematics(pose, -1);

  type BuiltPart = {
    depth: number;
    part: CelPart;
    before?: (ctx: CanvasRenderingContext2D) => void;
    after?: (ctx: CanvasRenderingContext2D) => void;
  };
  const builtParts: BuiltPart[] = [];

  for (const leg of [leftLeg, rightLeg]) {
    const s = leg.side;
    const partIdBase = s > 0 ? 10 : 30;
    const hipTop: V3 = [pelvisCenter[0], pelvisCenter[1] + s * 0.068, waistCapZ];
    const hipMid: V3 = [leg.hip[0], leg.hip[1] * 0.85 + pelvisCenter[1] * 0.15, leg.hip[2]];
    const upperCenter = scale(add(hipTop, leg.cuffBottom), 0.5);

    const upperSdf = (p: V3) => {
      const waistBlock = roundCone(p, [pelvisCenter[0], pelvisCenter[1] + s * 0.048, waistCapZ], hipMid, 0.098, 0.095);
      const outerHip = ellipsoid(p, [pelvisCenter[0] - 0.006, pelvisCenter[1] + s * 0.09, leg.hip[2] + 0.035], [0.102, 0.082, 0.145]);
      const thigh = roundCone(p, leg.hip, leg.knee, 0.092, 0.078);
      const lowerTrouser = roundCone(p, leg.knee, leg.cuffBottom, 0.077, 0.068);
      const drape = 0.004 * Math.sin(p[2] * 28 + p[0] * 14 + s * 1.7);
      const legBody = smin(smin(waistBlock, outerHip, 0.038), smin(thigh, lowerTrouser, 0.028), 0.032) + drape;

      const cq = leg.toCuff(p);
      const cuffRoll = ellipsoid(cq, [0, 0, 0.025], [0.079, 0.077, 0.033]);
      const withCuff = smin(legBody, cuffRoll, 0.012);
      const cuffClip = Math.max(withCuff, -(cq[2] + 0.006));
      const pelvisCenterCut =
        p[2] > leg.hip[2] - 0.05
          ? Math.max(cuffClip, -(s * (p[1] - pelvisCenter[1]) + 0.006))
          : cuffClip;
      return Math.max(pelvisCenterCut, p[2] - waistCapZ);
    };

    const upperBuilt = renderSampledPart(
      upperSdf,
      upperCenter,
      0.41,
      palette.trousers,
      ctxArgs,
      partIdBase,
      undefined,
      () => {
        const lines: { pts: Point[]; widthScale?: number }[] = [];
        const cuffRimPts: Point[] = [];
        for (let i = 0; i <= 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const q: V3 = [Math.cos(a) * 0.077, Math.sin(a) * 0.075, 0.054];
          const w = add(
            leg.cuffBottom,
            rotateZ(rotateY(q, leg.shinPitch + leg.pose.cuffSwing), leg.legYaw),
          );
          const n = rotateZ([Math.cos(a), Math.sin(a), 0], leg.legYaw);
          if (toView(basis, n)[2] < 0.22) cuffRimPts.push(screen(w));
        }
        if (cuffRimPts.length >= 3) lines.push({ pts: cuffRimPts, widthScale: 0.72 });

        if (leg.pose.kneeBend > 0.18) {
          const kneeBack = add(leg.knee, rotateZ([-0.065, s * 0.012, 0.012], leg.legYaw));
          const kneeSide = add(leg.knee, rotateZ([0.012, s * 0.07, -0.016], leg.legYaw));
          lines.push({ pts: [screen(kneeBack), screen(kneeSide)], widthScale: 0.54 });
        }
        if (s > 0 || Math.abs(leg.pose.hipPitch) > 0.12) {
          const groinTop: V3 = [pelvisCenter[0] + 0.015, pelvisCenter[1] + s * 0.014, HIP_Z + pose.pelvisZ - 0.05];
          const thighMid = add(scale(add(leg.hip, leg.knee), 0.5), [0.024, s * (s > 0 ? 0.045 : 0.025), 0.055]);
          lines.push({ pts: [screen(groinTop), screen(thighMid)], widthScale: 0.45 });
        }
        return lines;
      },
      0.24,
    );

    const calfCenter = scale(add(leg.cuffBottom, leg.bootTop), 0.5);
    const calfSdf = (p: V3) => {
      const topPt = add(leg.cuffBottom, scale(leg.shinDir, -0.025));
      const botPt = add(leg.bootTop, scale(leg.shinDir, 0.035));
      const core = roundCone(p, topPt, botPt, 0.049, 0.039);
      const muscleCenter = add(leg.cuffBottom, add(scale(leg.shinDir, 0.038), rotateZ([-0.018, 0, 0], leg.legYaw)));
      const muscle = ellipsoid(p, muscleCenter, [0.042, 0.042, 0.064]);
      return smin(core, muscle, 0.022);
    };

    const calfBuilt = renderSampledPart(
      calfSdf,
      calfCenter,
      0.16,
      palette.skin,
      ctxArgs,
      partIdBase + 2,
      undefined,
      undefined,
      0.22,
    );

    const bootCenter = add(leg.ankle, rotateZ([0.04, 0, 0.018], pose.pelvisYaw + leg.pose.footYaw));
    const sinkCut = leg.pose.mudSink > 0.15 ? -0.004 : -0.15;
    const shaftAxis = normalize(sub(leg.bootTop, leg.ankle));
    const bootSdf = (p: V3) => {
      const q = leg.toFoot(p);
      const shaftTop = leg.bootTop;
      const shaft = roundCone(p, add(leg.ankle, [0, 0, -0.018]), shaftTop, 0.045, 0.05);
      const collar = ellipsoid(p, add(shaftTop, scale(shaftAxis, -0.005)), [0.054, 0.053, 0.013]);
      const topPlane = (p[0] - shaftTop[0]) * shaftAxis[0] + (p[1] - shaftTop[1]) * shaftAxis[1] + (p[2] - shaftTop[2]) * shaftAxis[2];
      const clippedShaft = Math.max(smin(shaft, collar, 0.01), topPlane - 0.004);
      const achilles = roundCone(q, [-0.01, 0, 0.02], [-0.022, 0, -0.078], 0.043, 0.04);
      const instep = roundCone(q, [0.008, 0, -0.012], [0.118, 0, -0.072], 0.046, 0.039);
      const toeBox = ellipsoid(q, [0.145, 0, -0.076], [0.044, 0.043, 0.032]);
      const heelBlock = ellipsoid(q, [-0.024, 0, -0.088], [0.037, 0.039, 0.024]);
      const soleMid = roundCone(q, [-0.026, 0, -0.095], [0.146, 0, -0.093], 0.037, 0.037);
      const lowerFoot = smin(
        smin(achilles, instep, 0.018),
        smin(smin(toeBox, heelBlock, 0.016), soleMid, 0.014),
        0.014,
      );
      const bootBody = smin(clippedShaft, lowerFoot, 0.016);
      const flatSole = Math.max(bootBody, -(q[2] + ANKLE_Z));
      return Math.max(flatSole, -(p[2] - sinkCut));
    };

    const bootBuilt = renderSampledPart(
      bootSdf,
      bootCenter,
      0.21,
      palette.boot,
      ctxArgs,
      partIdBase + 4,
      (sampled) => {
        if (pose.mudAmount <= 0.02) return [];
        const mudF = field(sampled, (p) => {
          const q = leg.toFoot(p);
          const heightAboveSole = q[2] + ANKLE_Z;
          const wave =
            (noise2(q[0] * 14 + s * 3.1, q[1] * 14 + 2.7, seed + 51) - 0.5) * 0.048 +
            (q[0] > 0.06 ? 0.02 : 0) +
            (q[0] < -0.015 ? 0.014 : 0);
          const mudLine = (0.042 + 0.036 * pose.mudAmount + wave) * pose.mudAmount;
          const speckle =
            noise2(q[0] * 34 + s * 7, q[2] * 34, seed + 89) > 0.79 && heightAboveSole < 0.135 * pose.mudAmount
              ? -0.014
              : 0.05;
          return Math.min(heightAboveSole - mudLine, speckle);
        });
        return [
          {
            loops: loopsOf(mudF, sampled, spacing, minArea * 0.25, drawingSeed + partIdBase + 9, boilAmp),
            tone: palette.mud,
          },
        ];
      },
      () => {
        const lines: { pts: Point[]; widthScale?: number }[] = [];
        const welt: Point[] = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const x = mix(-0.062, 0.175, t);
          const y = s * (t > 0.7 ? 0.032 : 0.04);
          const n = rotateZ([0, s, 0], pose.pelvisYaw + leg.pose.footYaw);
          if (toView(basis, n)[2] < 0.45) welt.push(screen(leg.fromFoot([x, y, -ANKLE_Z + 0.02])));
        }
        if (welt.length >= 3) lines.push({ pts: welt, widthScale: 0.58 });
        const collarPts: Point[] = [];
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const n = rotateZ([Math.cos(a), Math.sin(a), 0], leg.legYaw);
          if (toView(basis, n)[2] < 0.2) {
            const localOff = rotateZ(rotateY([Math.cos(a) * 0.051, Math.sin(a) * 0.049, -0.006], leg.shinPitch), leg.legYaw);
            collarPts.push(screen(add(leg.bootTop, localOff)));
          }
        }
        if (collarPts.length >= 3) lines.push({ pts: collarPts, widthScale: 0.56 });
        return lines;
      },
      0.2,
    );

    const legDepthBase = Math.max(upperBuilt.depth, bootBuilt.depth);
    builtParts.push({ depth: legDepthBase + 0.015, part: calfBuilt.part });
    builtParts.push({
      depth: bootBuilt.depth,
      part: bootBuilt.part,
      after: (ctx) =>
        drawMudEffects(
          ctx,
          leg,
          palette,
          screen,
          (k, base) => makeStyle(drawingSeed, light2d, lineBase, ppu, k, base),
          lineBase,
          ppu,
          drawingSeed,
          boilAmp,
        ),
    });
    builtParts.push({ depth: upperBuilt.depth, part: upperBuilt.part });
  }

  if (pose.showBasket) {
    const side = pose.basketSide;
    const armTop: V3 = [pose.pelvisX - 0.012, pose.pelvisY + side * 0.175, waistCapZ + 0.01];
    const handPos: V3 = [
      armTop[0] + Math.sin(pose.armSwing) * 0.19 + 0.022,
      armTop[1] + side * 0.052,
      0.855 + pose.pelvisZ + pose.basketLift,
    ];
    const armCenter = scale(add(armTop, handPos), 0.5);
    const armSdf = (p: V3) => {
      const forearm = roundCone(p, armTop, handPos, 0.037, 0.026);
      const palm = ellipsoid(p, add(handPos, [0.006, -side * 0.004, -0.015]), [0.036, 0.025, 0.036]);
      const thumb = ellipsoid(p, add(handPos, [0.024, -side * 0.012, -0.004]), [0.018, 0.015, 0.02]);
      return Math.max(smin(smin(forearm, palm, 0.012), thumb, 0.008), p[2] - waistCapZ);
    };
    const armBuilt = renderSampledPart(armSdf, armCenter, 0.17, palette.skin, ctxArgs, 52, undefined, undefined, 0.2);

    const basketPivot: V3 = [handPos[0], handPos[1], handPos[2] - 0.012];
    const toBasket = (p: V3): V3 => {
      let q = sub(p, basketPivot);
      q = rotateZ(q, -pose.pelvisYaw);
      q = rotateY(q, -pose.basketSwing);
      q = rotateX(q, -pose.basketSway);
      return [q[0], q[1], q[2] + 0.39];
    };
    const fromBasket = (q: V3): V3 => {
      let p: V3 = [q[0], q[1], q[2] - 0.39];
      p = rotateX(p, pose.basketSway);
      p = rotateY(p, pose.basketSwing);
      p = rotateZ(p, pose.pelvisYaw);
      return add(p, basketPivot);
    };
    const basketWorldNormal = (n: V3): V3 =>
      normalize(rotateZ(rotateY(rotateX(n, pose.basketSway), pose.basketSwing), pose.pelvisYaw));
    const basketCenter = fromBasket([0, 0, 0.185]);
    const basketBuilt = renderSampledPart(
      (p) => basketSdfLocal(toBasket(p)),
      basketCenter,
      0.275,
      palette.basket,
      ctxArgs,
      56,
      (sampled) => {
        const cavity = field(sampled, (p) => {
          const upFacing = toView(basis, basketWorldNormal([0, 0, 1]))[2];
          if (upFacing > -0.15) return 1;
          return basketCavityField(toBasket(p));
        });
        return [
          {
            loops: loopsOf(cavity, sampled, spacing, minArea * 0.35, drawingSeed + 59, boilAmp),
            tone: { lit: palette.basket.shade, shade: palette.basket.shade },
          },
        ];
      },
      () => basketWeaveLines(basis, screen, fromBasket, basketWorldNormal).map((pts) => ({ pts, widthScale: 0.55 })),
      0.18,
    );

    builtParts.push({ depth: basketBuilt.depth, part: basketBuilt.part });
    builtParts.push({ depth: armBuilt.depth - 0.008, part: armBuilt.part });
  }

  const order = builtParts.slice().sort((a, b) => b.depth - a.depth);
  const bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const b of order)
    for (const loop of b.part.silhouette)
      for (const p of loop) {
        bounds.x0 = Math.min(bounds.x0, p[0]);
        bounds.y0 = Math.min(bounds.y0, p[1]);
        bounds.x1 = Math.max(bounds.x1, p[0]);
        bounds.y1 = Math.max(bounds.y1, p[1]);
      }
  if (!Number.isFinite(bounds.x0)) return;
  const pad = Math.max(12, Math.ceil(ppu * 0.06));
  const layer = createLayer(bounds.x0 - pad, bounds.y0 - pad, bounds.x1 - bounds.x0 + 2 * pad, bounds.y1 - bounds.y0 + 2 * pad, ink.supersample);
  for (const b of order) {
    if (b.before) b.before(layer.ctx);
    drawCel(layer.ctx, b.part);
    if (b.after) b.after(layer.ctx);
  }
  placeLayer(target, layer);
};

export const drawDistantPerson = (target: CanvasRenderingContext2D, view: DistantPersonView, frame: number) => {
  const dir = view.facingRight === false ? -1 : 1;
  const h = Math.max(10, view.heightPx);
  const d = drawing(frame, 2);
  const stepFrame = ((d.frame % 32) + 32) % 32;
  const poseIdx = Math.floor((stepFrame % 16) / 4);
  const swap = stepFrame >= 16 ? -1 : 1;
  const seed = view.seed ?? 181;
  const boilPx = Math.min(0.4, h * 0.013);
  const bSeed = jitterSeed(seed, d.index);

  const bobTable = [0, 0.048, -0.012, -0.042];
  const strideTable = [0.22, 0.16, 0.03, 0.14];
  const liftTable = [0.01, 0.01, 0.075, 0.06];
  const basketLagTable = [0.06, 0.15, 0.09, -0.05];

  const bob = bobTable[poseIdx] * h;
  const stride = strideTable[poseIdx] * h * swap;
  const backLift = liftTable[poseIdx] * h;
  const basketSwing = basketLagTable[poseIdx] * swap;
  const lean = 0.055 * h * dir;

  const palette = view.light ? personPalettes[view.light] : undefined;
  const bodyColor = palette ? palette.trousers.shade : distantPersonColors.silhouette;
  const hatColor = palette ? palette.basket.shade : distantPersonColors.hat;
  const basketColor = palette ? palette.basket.shade : distantPersonColors.basket;
  const rimColor = view.rimColor ?? (palette?.rim ?? distantPersonColors.rimFar);
  const rimAlpha = view.rimAlpha ?? 0.85;

  const pad = Math.ceil(h * 0.7);
  const layer = createLayer(view.x - pad, view.y - h - pad * 0.4, pad * 2, h + pad * 0.8, ink.supersample);
  const ctx = layer.ctx;

  const pt = (nx: number, ny: number): Point => [view.x + nx * h * dir, view.y - ny * h + bob];
  const poly = (pts: Point[], color: string, k: number) => {
    const b = boil(pts, bSeed + k * 13, boilPx);
    ctx.beginPath();
    b.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const hipX = 0.01 * h * dir;
  const hipY = view.y - 0.51 * h + bob;
  const drawMiniLeg = (front: boolean) => {
    const sign = front ? 1 : -1;
    const isForwardFoot = sign * swap > 0;
    const fx = view.x + (sign * stride + 0.02 * h) * dir;
    const fy = view.y - (front ? 0 : backLift);
    const kneeX = mix(view.x + hipX, fx, 0.5) + (front ? 0.045 : 0.025) * h * dir;
    const kneeY = mix(hipY, fy, 0.48) - (front ? 0.01 : 0.03) * h;
    const wTop = Math.max(1.4, h * 0.092);
    const wBot = Math.max(1.1, h * 0.068);
    ctx.strokeStyle = bodyColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = wTop;
    ctx.beginPath();
    ctx.moveTo(view.x + hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    ctx.lineWidth = wBot;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(fx, fy - wBot * 0.35);
    ctx.stroke();
    const toeLen = isForwardFoot ? 0.075 * h : 0.045 * h;
    ctx.beginPath();
    ctx.moveTo(fx, fy - wBot * 0.35);
    ctx.lineTo(fx + dir * toeLen, fy - wBot * (isForwardFoot ? 0.32 : 0.1));
    ctx.stroke();
    if (isForwardFoot && rimAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = rimAlpha * 0.72;
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = Math.max(0.8, h * 0.032);
      ctx.beginPath();
      ctx.moveTo(kneeX + dir * wBot * 0.42, kneeY);
      ctx.lineTo(fx + dir * wBot * 0.42, fy - wBot * 0.5);
      ctx.stroke();
      ctx.restore();
    }
  };

  drawMiniLeg(false);
  drawMiniLeg(true);

  poly(
    [
      [view.x - 0.095 * h * dir, view.y - 0.49 * h + bob],
      [view.x + 0.1 * h * dir, view.y - 0.49 * h + bob],
      [view.x + 0.11 * h * dir + lean, view.y - 0.77 * h + bob],
      [view.x + 0.04 * h * dir + lean, view.y - 0.83 * h + bob],
      [view.x - 0.04 * h * dir + lean, view.y - 0.83 * h + bob],
      [view.x - 0.1 * h * dir + lean, view.y - 0.76 * h + bob],
    ],
    bodyColor,
    2,
  );

  const handX = view.x + (0.145 + basketSwing * 0.42) * h * dir + lean * 0.5;
  const handY = view.y - 0.55 * h + bob;
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = Math.max(1.1, h * 0.065);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(view.x + 0.055 * h * dir + lean, view.y - 0.75 * h + bob);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  const bCenterX = handX + basketSwing * 0.55 * h * dir;
  const bTopY = handY + 0.05 * h;
  const bBotY = handY + 0.205 * h;
  poly(
    [
      [bCenterX - 0.105 * h, bTopY],
      [bCenterX + 0.105 * h, bTopY],
      [bCenterX + 0.075 * h, bBotY],
      [bCenterX - 0.075 * h, bBotY],
    ],
    basketColor,
    3,
  );
  ctx.strokeStyle = basketColor;
  ctx.lineWidth = Math.max(0.9, h * 0.04);
  ctx.beginPath();
  ctx.arc(bCenterX, bTopY, 0.072 * h, Math.PI, 0);
  ctx.stroke();

  poly(
    [
      pt(-0.26, 0.84),
      pt(0.03, 0.99),
      pt(0.29, 0.84),
      pt(0.02, 0.81),
    ],
    hatColor,
    4,
  );

  if (rimAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = rimAlpha;
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = Math.max(1, h * 0.042);
    ctx.lineCap = "round";
    ctx.beginPath();
    const hatApex = pt(0.03, 0.99);
    const hatFront = pt(0.29, 0.84);
    ctx.moveTo(hatApex[0], hatApex[1]);
    ctx.lineTo(hatFront[0], hatFront[1]);
    ctx.moveTo(bCenterX + dir * 0.102 * h, bTopY);
    ctx.lineTo(bCenterX + dir * 0.075 * h, bBotY);
    ctx.stroke();
    ctx.restore();
  }

  placeLayer(target, layer);
};
