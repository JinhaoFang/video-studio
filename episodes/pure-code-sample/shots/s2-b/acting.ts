/**
 * S2 B 版的表演表：画张表 held 列出每张画的起始帧（停住时一拍三，一般一拍二；第 74 帧起一拍一），drawingAt 给出某一帧用的是哪张画，
 * actingAt 按画张取麻雀的姿势、朝向偏转、整体微移和起飞后的位置；poseAt 的数值都落在设定样张（ModelSheet）六个姿势和 restPose 之间。
 * 动作：闭眼湿毛 → 第 6 帧一缩到最紧 → 10、14、18、21 四次甩头抖身（swing 是每次甩动的幅度和方向，残影在换向的帧上，见 smearAt）→
 * 22 蓬到最大 → 慢慢睁眼、眨一下 → 48 抬头看光、眼里亮起光点 → 64 起压身、70 最低 → 77 脚离开竹竿 → 每 4 帧一次振翅，从画右上出画。
 * 起飞后朝画右、略背向相机飞（世界朝向 flightHeading，和轨迹方向一致），背景里的夕光就在那个方向。
 * anchorsAt 用和 sparrow.ts 同样的颈、头位置估算头部、翼、尾在画面上的位置，只用来放残影的速度线和甩出的水珠。
 * 待定（设计）：甩头的幅度、蓬起的过冲、起飞轨迹的速度和方向是本版自定的。
 */
import type { V3 } from "../../engine/figure.ts";
import { add, rotateX, rotateY, rotateZ, sub, toView, viewBasis } from "../../engine/figure.ts";
import type { Basis, Point } from "../../engine/figure.ts";
import { hold, tween } from "../../engine/timing.ts";
import type { Key } from "../../engine/timing.ts";
import { UNIT } from "../../scene.ts";
import type { Pose } from "../../sparrow.ts";
import { shotFrames } from "./staging.ts";

import { beats } from "./timing.ts";

const held = [0, 2, 4, 5, 7, 9, 12, 13, 14, 16, 17, 18, 20, 21, 22, 23, 25, 28, 31, 34, 36, 39, 40, 41, 42, 45, 48, 51, 54, 57, 60, 62, 64, 66, 68, 70, 72, 74];
const ones = 74;

export type Drawing = { frame: number; serial: number };

export const drawingAt = (frame: number): Drawing => {
  const f = Math.max(0, Math.min(shotFrames - 1, Math.floor(frame)));
  let serial = 0;
  for (let i = 0; i < held.length; i++) if (held[i] <= f) serial = i;
  return f >= ones ? { frame: f, serial: held.length - 1 + (f - ones) } : { frame: held[serial], serial };
};

type Track = readonly [number, number][];

const track = (keys: Track): Key[] => keys.map(([frame, value]) => ({ frame, value }));
const tw = (d: number, keys: Track) => tween(d, track(keys));

const swing: Track = [[0, 0], [7, 0], [9, 1], [12, 0.2], [13, -0.7], [14, -1], [16, -0.2], [17, 0.7], [18, 0.85], [20, 0.25], [21, -0.6], [22, 0]];

const pushLift = 0.9;

export const flightHeading = 0.25;

const wingFlapAt = (tau: number) => {
  if (tau === 0) return 0.9;
  if (tau === 1) return 0.45;
  if (tau === 2) return -0.12;
  const phase = tau % 4;
  return phase === 3 ? -0.35 : phase === 1 ? 0.95 : 0.3;
};

export const poseAt = (d: number): Pose => {
  const s = hold(d, swing);
  const inShake = d >= 7 && d <= 21;
  const a = Math.abs(s);
  const tau = d - beats.takeoff;
  return {
    bodyPitch:
      tw(d, [
        [0, 0.3],
        [4, 0.36],
        [5, 0.2],
        [7, 0.26],
        [21, 0.24],
        [22, 0.24],
        [45, 0.3],
        [48, 0.5],
        [62, 0.52],
        [70, 0.15],
        [73, 0.15],
        [74, 0.3],
        [75, 0.42],
        [76, 0.52],
        [77, 0.62],
        [84, 0.56],
        [96, 0.5],
      ]) + (inShake ? 0.08 * s : 0),
    lift: tw(d, [
      [0, 0],
      [60, 0],
      [62, 0.08],
      [64, 0],
      [73, 0],
      [74, 0.3],
      [75, 0.6],
      [76, pushLift],
      [77, 0],
    ]),
    headYaw: inShake
      ? 0.1 + 0.7 * s
      : tw(d, [
          [0, 0.25],
          [4, 0.3],
          [5, 0.1],
          [7, 0.1],
          [22, 0.08],
          [40, 0.08],
          [45, 0.2],
          [48, 0.12],
          [62, 0.12],
          [70, 0.05],
          [77, 0.02],
          [96, 0],
        ]),
    headPitch:
      tw(d, [
        [0, 0.05],
        [4, 0.22],
        [5, -0.32],
        [7, -0.16],
        [22, -0.14],
        [25, -0.1],
        [42, -0.08],
        [45, 0.26],
        [48, 0.62],
        [54, 0.68],
        [60, 0.62],
        [62, 0.5],
        [64, 0.3],
        [70, 0.08],
        [74, 0.14],
        [77, 0.1],
        [84, 0.02],
        [96, -0.04],
      ]) + (inShake ? 0.12 * a : 0),
    headRoll: inShake ? -0.4 * s : 0,
    puff: tw(d, [
      [0, 0],
      [4, 0.02],
      [5, -0.16],
      [7, -0.06],
      [9, -0.06],
      [14, -0.04],
      [18, -0.02],
      [21, 0.02],
      [22, 1.22],
      [23, 1.06],
      [25, 1],
      [45, 1],
      [48, 0.92],
      [62, 0.9],
      [64, 0.72],
      [70, 0.42],
      [73, 0.42],
      [76, 0.3],
      [80, 0.25],
      [96, 0.2],
    ]),
    wet: hold(d, [
      [0, 0.85],
      [9, 0.9],
      [14, 0.78],
      [18, 0.62],
      [21, 0.48],
      [22, 0.3],
      [70, 0.22],
      [77, 0.18],
    ]),
    crouch:
      tw(d, [
        [0, 0.12],
        [4, 0.06],
        [5, 0.6],
        [7, 0.4],
        [22, 0.36],
        [25, 0.3],
        [45, 0.3],
        [48, 0.2],
        [62, 0.04],
        [64, 0.3],
        [68, 0.85],
        [70, 1],
        [73, 1],
        [74, 0.7],
        [75, 0.4],
        [76, 0.12],
        [77, 0],
      ]) - (inShake ? 0.1 * a : 0),
    stretch: tw(d, [
      [0, 0],
      [4, 0.02],
      [5, -0.1],
      [7, 0],
      [68, 0],
      [70, -0.12],
      [73, -0.12],
      [74, 0],
      [75, 0.08],
      [76, 0.14],
      [77, 0.12],
      [82, 0.06],
      [96, 0.04],
    ]),
    tailLift:
      tw(d, [
        [0, 0],
        [4, 0],
        [5, -0.15],
        [7, 0],
        [22, 0.04],
        [25, 0],
        [62, 0],
        [70, 0.25],
        [77, 0.3],
        [84, 0.2],
        [96, 0.15],
      ]) + (inShake ? -0.22 * s : 0),
    wingSpread: Math.min(1, tw(d, [[0, 0], [73, 0], [74, 0.3], [75, 0.6], [76, 0.9], [77, 1]]) + (inShake ? 0.1 * a : 0)),
    wingFlap: tau < 0 ? tw(d, [[0, 0], [73, 0], [74, 0.5], [75, 0.8], [76, 0.95]]) : wingFlapAt(tau),
    eyeOpen: tw(d, [
      [0, 0],
      [28, 0],
      [31, 0.5],
      [34, 0.75],
      [37, 0.9],
      [39, 0.95],
      [40, 0],
      [41, 0.55],
      [42, 0.95],
      [96, 0.95],
    ]),
    eyeClosedCurve: hold(d, [
      [0, -0.9],
      [22, -0.6],
      [40, -0.3],
    ]),
    sparkle: tw(d, [
      [0, 0],
      [46, 0],
      [48, 1.3],
      [51, 0.9],
      [54, 1.3],
      [57, 1],
      [62, 1],
      [64, 0.4],
      [68, 0],
    ]),
    beakOpen: 0,
    legs: d < beats.takeoff,
  };
};

export const flightAt = (tau: number): V3 => {
  return [
    0.007 * tau + 0.0012 * tau * tau,
    Math.tan(flightHeading) * (0.007 * tau + 0.0012 * tau * tau),
    pushLift * UNIT + 0.006 * tau + 0.0004 * tau * tau + 0.0045 * Math.cos((Math.PI * (tau - 3)) / 2),
  ];
};

export type Acting = {
  pose: Pose;
  facing: number;
  turn: number;
  roll: number;
  shift: Point;
  flight: V3 | null;
};

export const actingAt = (d: number): Acting => {
  const s = hold(d, swing);
  const inShake = d >= 7 && d <= 21;
  const tau = d - beats.takeoff;
  return {
    pose: poseAt(d),
    facing: tw(d, [
      [0, 0.5],
      [77, 0.46],
    ]),
    turn: inShake ? 0.3 * s : 0,
    roll: inShake ? -0.14 * s : 0,
    shift: [inShake ? 26 * s : 0, inShake ? -8 * Math.abs(s) : 0] as Point,
    flight: tau < 0 ? null : flightAt(tau),
  };
};

export type Smear = { kind: "flinch" | "shake" | "push" | "wing"; ghosts: number };

const shakeSmears = [12, 13, 16, 17, 20, 21];

export const smearAt = (frame: number): Smear | null => {
  if (frame === 5) return { kind: "flinch", ghosts: 1 };
  if (shakeSmears.indexOf(frame) >= 0) return { kind: "shake", ghosts: 1 };
  if (frame >= 75 && frame <= 77) return { kind: "push", ghosts: 1 };
  const tau = frame - beats.takeoff;
  if (tau === 1) return { kind: "wing", ghosts: 1 };
  if (tau === 2) return { kind: "wing", ghosts: 2 };
  if (tau >= 4 && tau % 2 === 0) return { kind: "wing", ghosts: 1 };
  return null;
};

const NECK: V3 = [0.62, 0, 0.42];
const HEAD: V3 = [0.95, 0, 0.8];

const stagePoint = (p: V3, pose: Pose): V3 => {
  const offset: V3 = [0, 0, -0.3 * pose.crouch + pose.lift];
  const sy = 1 + pose.stretch;
  const sx = 1 / Math.sqrt(Math.max(0.3, sy));
  return add(rotateY([p[0] * sx, p[1] * sx, p[2] * sy], -pose.bodyPitch), offset);
};

const headStage = (pose: Pose): V3 => {
  let p = sub(HEAD, NECK);
  p = rotateX(p, pose.headRoll);
  p = rotateY(p, -pose.headPitch);
  p = rotateZ(p, pose.headYaw);
  return stagePoint(add(p, NECK), pose);
};

export type View = { x: number; y: number; ppu: number; yaw: number; pitch: number; roll?: number };

export type Anchors = { head: Point; tail: Point; wing: (side: number) => Point; body: Point };

export const anchorsAt = (pose: Pose, view: View): Anchors => {
  const basis: Basis = viewBasis(view.yaw, view.pitch, view.roll ?? 0);
  const screen = (p: V3): Point => {
    const v = toView(basis, stagePoint(p, pose));
    return [view.x + v[0] * view.ppu, view.y + v[1] * view.ppu];
  };
  const head: Point = (() => {
    const v = toView(basis, headStage(pose));
    return [view.x + v[0] * view.ppu, view.y + v[1] * view.ppu];
  })();
  return {
    head,
    body: screen([0.1, 0, 0.1]),
    tail: screen([-1.5, 0, -0.3 + 0.3 * pose.tailLift]),
    wing: (side) => screen([0, side * 1.4, 0.5 + 0.9 * pose.wingFlap]),
  };
};
