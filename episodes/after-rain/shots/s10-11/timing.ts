/**
 * 第 10–11 镜（合）的时间数据与画面事件：对齐 storyboard.md「镜头内的锚点」、motion.md 与 contract.md 第 4 节。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用。
 * 待定事项：无。
 */
import { ease, progress } from "../../../../src/kit/engine/timing.ts";
import type { ShotTiming } from "../../../../src/kit/shots.ts";

export const S10_DURATION = 84;
export const S10_CROUCH = 12;
export const S10_HOLD = 44;
export const S10_PUSH = 54;
export const S10_TAKEOFF = 56;
export const S10_POLE_SPRING = 57;
export const S10_WINGBEATS = [58, 62, 66, 70, 73] as const;
export const S10_WING_PASS = 76;

export const s10CameraProgress = (frame: number) =>
  ease(progress(frame, 0, S10_TAKEOFF), 2.0, 2.2);

export const s10Timing: ShotTiming = {
  id: "s10",
  durationInFrames: S10_DURATION,
  events: [
    { frame: S10_CROUCH, kind: "crouch", description: "起飞前开始压身" },
    { frame: S10_TAKEOFF, kind: "takeoff", description: "脚离开竹竿" },
    { frame: S10_POLE_SPRING, kind: "pole_spring", description: "竹竿被蹬下沉后弹回的第一下" },
    ...S10_WINGBEATS.map((frame, i) => ({
      frame,
      kind: "wingbeat",
      description: i === 0 ? "起飞第一下大下扑" : `迎面冲向镜头第 ${i + 1} 下扑翅`,
    })),
    { frame: S10_WING_PASS, kind: "wing_pass", description: "翅膀开始遮满画面，掠过镜头的风声起" },
  ].sort((a, b) => a.frame - b.frame),
};

export const S11_DURATION = 192;
export const S11_WIPE_END = 10;
export const S11_WINGBEATS = [
  12, 16, 20,
  30, 34, 38,
  48, 52, 56,
  66, 70, 74,
  84, 88, 92,
  102, 106, 110,
  120, 124, 128,
] as const;
export const S11_COMPANION_CALLS = [120, 136, 152, 162, 170] as const;
export const S11_LAND = 150;
export const S11_FLOCK_SHIFTS = [156, 162, 168] as const;
export const S11_CALL_HOME = 158;
export const S11_CAMERA_STOP = 172;

export const s11CameraProgress = (frame: number) =>
  ease(progress(frame, S11_WIPE_END, S11_CAMERA_STOP), 1.8, 2.4);

export const s11Timing: ShotTiming = {
  id: "s11",
  durationInFrames: S11_DURATION,
  events: [
    ...S11_WINGBEATS.map((frame) => ({
      frame,
      kind: "wingbeat",
      description: "稻田上空波浪式飞行扑翅段下扑",
    })),
    ...S11_COMPANION_CALLS.map((frame, i) => ({
      frame,
      kind: "companion_call",
      description: i < 2 ? "画外/远处电线上同伴的叫声渐近" : "落地后旁边同伴回应的接触叫",
    })),
    { frame: S11_LAND, kind: "land", description: "落到电线上，在同伴中间" },
    ...S11_FLOCK_SHIFTS.map((frame) => ({
      frame,
      kind: "flock_shift",
      description: "旁边的一只同伴在电线上挪一下",
    })),
    { frame: S11_CALL_HOME, kind: "call_home", description: "麻雀叫声第 5 声：回到同伴中间的接触叫" },
  ].sort((a, b) => a.frame - b.frame),
};
