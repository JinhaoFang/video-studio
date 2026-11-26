/**
 * 第 4–6 镜共用的运镜工具（motion.md「镜头运动：像有人在掌机」）：
 * travel 给「起步—匀速—停稳」三段不对称的行程（0→1）：起步、停稳两段是平滑加减速，停稳后留一条残速，相机每帧都动；
 * overshoot 是跟拍追上时略过头再回正的那一下；frameAngle 把画幅的横向百分比换成摇的角度；
 * yawForScreenX、pitchForScreenY 反求机位，让某个世界点落在画面指定的位置（照切点表取景用）。
 * 待定事项：无。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { clamp01 } from "../../../../src/kit/engine/timing.ts";

export type Phase = readonly [number, number, number, number];

const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

const smoothArea = (x: number) => {
  const t = clamp01(x);
  return t * t * t - 0.5 * t * t * t * t;
};

export const travel = (frame: number, [start, cruise, brake, stop]: Phase, residual = 0): number => {
  if (frame <= start) return 0;
  const accel = Math.max(1e-6, cruise - start);
  const uniform = Math.max(0, brake - cruise);
  const decel = Math.max(1e-6, stop - brake);
  const speed = (1 - 0.5 * decel * residual) / (0.5 * accel + uniform + 0.5 * decel);
  if (frame <= cruise) return speed * accel * smoothArea((frame - start) / accel);
  const through = speed * 0.5 * accel;
  if (frame <= brake) return through + speed * (frame - cruise);
  const midway = through + speed * uniform;
  if (frame <= stop) {
    const x = (frame - brake) / decel;
    return midway + residual * (frame - brake) + (speed - residual) * decel * (x - smoothArea(x));
  }
  return 1 + residual * (frame - stop);
};

export const overshoot = (frame: number, peak: number, settle: number): number => {
  if (frame <= peak - 8) return 0;
  if (frame <= peak) return smooth((frame - (peak - 8)) / 8);
  return 1 - smooth((frame - peak) / Math.max(1, settle - peak));
};

const halfField = (camera: Camera) => ({
  x: Math.atan((camera.width / 2) / ((camera.focal / 36) * camera.width)),
  y: Math.atan((camera.height / 2) / ((camera.focal / 36) * camera.width)),
});

export const frameAngle = (camera: Camera, fraction: number): number =>
  Math.atan(fraction * Math.tan(halfField(camera).x));

export const yawForScreenX = (camera: Camera, point: Vec3, xPercent: number): number => {
  const bearing = Math.atan2(point[0] - camera.position[0], point[1] - camera.position[1]);
  const offset = ((xPercent - 50) / 50) * Math.tan(halfField(camera).x);
  return bearing - Math.atan(offset);
};

export const pitchForScreenY = (camera: Camera, point: Vec3, yPercent: number): number => {
  const horizontal = Math.hypot(point[0] - camera.position[0], point[1] - camera.position[1]);
  const elevation = Math.atan2(point[2] - camera.position[2], horizontal);
  const offset = ((50 - yPercent) / 50) * Math.tan(halfField(camera).y);
  return elevation - Math.atan(offset);
};

export const screenPosition = (camera: Camera, point: Vec3): [number, number] => {
  const p = project(camera, point);
  return [(p.x / camera.width) * 100, (p.y / camera.height) * 100];
};
