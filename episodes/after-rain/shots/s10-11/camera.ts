/**
 * 第 10–11 镜（合）的相机：照 motion.md「镜头运动：像有人在掌机」。
 * 第 10 镜起飞前极慢推轨（起步、匀速、停稳三段不对称，推轨带着竹竿和底图的视差，不变焦），起飞后推轨已停，相机晚几拍才跟着麻雀起摇（跟拍晚半拍）；
 * 第 11 镜切进来时相机已经在摇（不从零起步），俯仰和横摇都是对目标机位的二阶阻尼跟随：天然滞后半拍、停稳时略过头再回正，第 172 帧前后停稳。
 * 不依赖浏览器，纯函数，供镜头渲染与测试共用。
 * 待定事项：无。
 */
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { mix } from "../../../../src/kit/engine/timing.ts";
import { shotCameras } from "../../scene.ts";
import { S10_LAST, s11Timing } from "./timing.ts";

const deg = (value: number) => (value * Math.PI) / 180;

const smooth = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
};

const integral = (x: number) => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * t - (t * t * t * t) / 2;
};

export type Segments = { accelEnd: number; uniformEnd: number; decelEnd: number };

export const trapezoid = (frame: number, { accelEnd: a, uniformEnd: u, decelEnd: d }: Segments) => {
  if (frame <= 0) return 0;
  if (frame >= d) return 1;
  const total = a / 2 + (u - a) + (d - u) / 2;
  let cum: number;
  if (frame <= a) cum = a * integral(frame / a);
  else if (frame <= u) cum = a / 2 + (frame - a);
  else {
    const y = (d - frame) / (d - u);
    cum = a / 2 + (u - a) + (d - u) * (1 / 2 - integral(y));
  }
  return cum / total;
};

type RateProfile = { start: number; fast: number; fastFrom: number; fastUntil: number; end: number };

const integrateRate = (rate: RateProfile, frames: number, sub = 8): Float64Array => {
  const out = new Float64Array(frames + 1);
  const at = (f: number) => {
    if (f <= 0) return rate.start;
    if (f >= rate.end) return 0;
    if (f < rate.fastFrom) return mix(rate.start, rate.fast, smooth(f / rate.fastFrom));
    if (f <= rate.fastUntil) return rate.fast;
    return rate.fast * (1 - smooth((f - rate.fastUntil) / (rate.end - rate.fastUntil)));
  };
  let acc = 0;
  for (let f = 1; f <= frames; f++) {
    for (let k = 0; k < sub; k++) acc += at(f - 1 + (k + 0.5) / sub) / sub;
    out[f] = acc;
  }
  return out;
};

export const dampFollow = (
  target: Float64Array,
  omega: number,
  zeta: number,
  sub = 8,
): Float64Array => {
  const n = target.length;
  const out = new Float64Array(n);
  const dt = 1 / sub;
  const slope0 = target[1] - target[0];
  let y = target[0] - (2 * zeta * slope0) / omega;
  let v = slope0;
  out[0] = y;
  for (let f = 1; f < n; f++) {
    for (let k = 0; k < sub; k++) {
      const t = target[f - 1] + ((target[f] - target[f - 1]) * (k + 0.5)) / sub;
      const a = omega * omega * (t - y) - 2 * zeta * omega * v;
      v += a * dt;
      y += v * dt;
    }
    out[f] = y;
  }
  return out;
};

export const S10_DOLLY: Segments = { accelEnd: 14, uniformEnd: 34, decelEnd: 52 };
export const S10_DOLLY_METERS = 0.07;
export const S10_FOLLOW_START = 58;
export const S10_FOLLOW_ACCEL = 6;
export const S10_PAN_DEG = 2.0;
export const S10_TILT_DEG = 0.5;

const s10Base: Camera = shotCameras.s10;

const rampOpen = (frame: number, start: number, accel: number) => {
  if (frame <= start) return 0;
  const t = frame - start;
  return t < accel ? accel * integral(t / accel) : accel / 2 + (t - accel);
};

const s10Follow = (frame: number) => rampOpen(frame, S10_FOLLOW_START, S10_FOLLOW_ACCEL) / rampOpen(S10_LAST, S10_FOLLOW_START, S10_FOLLOW_ACCEL);

export const s10CameraAt = (frame: number): Camera => {
  const dolly = trapezoid(frame, S10_DOLLY) * S10_DOLLY_METERS;
  const forward: Vec3 = [Math.sin(s10Base.yaw), Math.cos(s10Base.yaw), 0];
  const follow = s10Follow(frame);
  return {
    position: [
      s10Base.position[0] + forward[0] * dolly,
      s10Base.position[1] + forward[1] * dolly,
      s10Base.position[2],
    ],
    yaw: s10Base.yaw + deg(S10_PAN_DEG) * follow,
    pitch: s10Base.pitch + deg(S10_TILT_DEG) * follow,
    focal: s10Base.focal,
    width: s10Base.width,
    height: s10Base.height,
  };
};

export const S11_TARGET: RateProfile = { start: 0.42, fast: 0.74, fastFrom: 36, fastUntil: 128, end: 156 };
export const S11_OMEGA = 0.34;
export const S11_ZETA = 0.78;

const s11Frames = s11Timing.durationInFrames;
const s11Base: Camera = shotCameras.s11Start;

export const S11_LAND_FRAME = 150;
export const S11_OVERSHOOT_END = 164;
const S11_YAW_TOTAL = 1.5;
const S11_YAW_OVERSHOOT = 0.08;
const S11_PITCH_TOTAL = 17.3;
const S11_PITCH_OVERSHOOT = 0.6;

const s11Shape = integrateRate(S11_TARGET, s11Frames);
const s11Norm = s11Shape[s11Frames];
const overshoot = (frame: number) =>
  frame <= S11_LAND_FRAME || frame >= S11_OVERSHOOT_END
    ? 0
    : Math.sin((Math.PI * (frame - S11_LAND_FRAME)) / (S11_OVERSHOOT_END - S11_LAND_FRAME));

const withTotal = (total: number, extra: number) =>
  s11Shape.map((v, f) => (v * total) / s11Norm + extra * overshoot(f));

const s11YawTarget = withTotal(S11_YAW_TOTAL, S11_YAW_OVERSHOOT);
const s11PitchTarget = withTotal(S11_PITCH_TOTAL, S11_PITCH_OVERSHOOT);
const s11Yaw = dampFollow(s11YawTarget, S11_OMEGA, S11_ZETA);
const s11Pitch = dampFollow(s11PitchTarget, S11_OMEGA, S11_ZETA);

export const s11CameraAt = (frame: number): Camera => {
  const f = Math.max(0, Math.min(s11Frames - 1, Math.floor(frame)));
  return {
    position: [...s11Base.position],
    yaw: s11Base.yaw + deg(s11Yaw[f]),
    pitch: s11Base.pitch + deg(s11Pitch[f]),
    focal: s11Base.focal,
    width: s11Base.width,
    height: s11Base.height,
  };
};

export const s11CameraTrace = () => ({
  yaw: Array.from(s11Yaw),
  pitch: Array.from(s11Pitch),
  yawTarget: Array.from(s11YawTarget),
  pitchTarget: Array.from(s11PitchTarget),
});
